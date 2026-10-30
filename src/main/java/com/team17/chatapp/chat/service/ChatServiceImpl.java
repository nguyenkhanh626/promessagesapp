package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.MemberRole;
import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.chat.repository.ConversationRepository;
import com.team17.chatapp.chat.repository.MessageRepository;
import com.team17.chatapp.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(UUID currentUserId) {
        List<Conversation> conversations = conversationRepository.findConversationsByUserId(currentUserId);
        List<ConversationDto> results = new ArrayList<>();

        for (Conversation conversation : conversations) {
            List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversation.getId());
            UserDto otherUserDto = null;

            if (conversation.getType() == ConversationType.DIRECT) {
                Optional<ConversationMember> otherMemberOpt = members.stream()
                        .filter(m -> !m.getUserId().equals(currentUserId))
                        .findFirst();

                if (otherMemberOpt.isPresent()) {
                    otherUserDto = userRepository.findById(otherMemberOpt.get().getUserId())
                            .map(UserDto::from)
                            .orElse(null);
                }
            }

            results.add(ConversationDto.from(conversation, otherUserDto, members.size()));
        }

        return results;
    }

    @Override
    @Transactional
    public ConversationDto getOrCreateDirectConversation(UUID currentUserId, UUID targetUserId) {
        if (currentUserId.equals(targetUserId)) {
            throw new AppException("Không thể tạo cuộc trò chuyện với chính mình", HttpStatus.BAD_REQUEST);
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng đối phương", HttpStatus.NOT_FOUND));

        Optional<Conversation> existingConversation = conversationRepository
                .findDirectConversationBetweenUsers(ConversationType.DIRECT, currentUserId, targetUserId);

        if (existingConversation.isEmpty()) {
            existingConversation = conversationRepository
                    .findDirectConversationBetweenUsers(ConversationType.DIRECT, targetUserId, currentUserId);
        }

        Conversation conversation;
        if (existingConversation.isPresent()) {
            conversation = existingConversation.get();
        } else {
            conversation = Conversation.builder()
                    .type(ConversationType.DIRECT)
                    .lastMessageAt(LocalDateTime.now())
                    .build();
            conversation = conversationRepository.save(conversation);

            ConversationMember member1 = ConversationMember.builder()
                    .conversationId(conversation.getId())
                    .userId(currentUserId)
                    .role(MemberRole.MEMBER)
                    .joinedAt(LocalDateTime.now())
                    .build();

            ConversationMember member2 = ConversationMember.builder()
                    .conversationId(conversation.getId())
                    .userId(targetUserId)
                    .role(MemberRole.MEMBER)
                    .joinedAt(LocalDateTime.now())
                    .build();

            conversationMemberRepository.save(member1);
            conversationMemberRepository.save(member2);
            log.info("Khởi tạo cuộc hội thoại 1-1 mới: {} giữa {} và {}",
                    conversation.getId(), currentUserId, targetUserId);
        }

        return ConversationDto.from(conversation, UserDto.from(targetUser), 2);
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDto getConversationById(UUID conversationId, UUID currentUserId) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, currentUserId)) {
            throw new AppException("Bạn không có quyền truy cập cuộc trò chuyện này", HttpStatus.FORBIDDEN);
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException("Cuộc trò chuyện không tồn tại", HttpStatus.NOT_FOUND));

        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        UserDto otherUserDto = null;

        if (conversation.getType() == ConversationType.DIRECT) {
            Optional<ConversationMember> otherMemberOpt = members.stream()
                    .filter(m -> !m.getUserId().equals(currentUserId))
                    .findFirst();

            if (otherMemberOpt.isPresent()) {
                otherUserDto = userRepository.findById(otherMemberOpt.get().getUserId())
                        .map(UserDto::from)
                        .orElse(null);
            }
        }

        return ConversationDto.from(conversation, otherUserDto, members.size());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, int page, int size) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, currentUserId)) {
            throw new AppException("Bạn không có quyền xem tin nhắn của cuộc trò chuyện này", HttpStatus.FORBIDDEN);
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);

        List<UUID> senderIds = messagePage.getContent().stream()
                .map(Message::getSenderId)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, User> userMap = userRepository.findAllById(senderIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return messagePage.map(msg -> {
            User sender = userMap.get(msg.getSenderId());
            String senderName = sender != null ? sender.getDisplayName() : "Thành viên";
            String senderAvatar = sender != null ? sender.getAvatarUrl() : null;
            return MessageDto.from(msg, senderName, senderAvatar);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageDto> getAllMessagesAsc(UUID conversationId, UUID currentUserId) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, currentUserId)) {
            throw new AppException("Bạn không có quyền xem tin nhắn của cuộc trò chuyện này", HttpStatus.FORBIDDEN);
        }

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        List<UUID> senderIds = messages.stream()
                .map(Message::getSenderId)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, User> userMap = userRepository.findAllById(senderIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return messages.stream().map(msg -> {
            User sender = userMap.get(msg.getSenderId());
            String senderName = sender != null ? sender.getDisplayName() : "Thành viên";
            String senderAvatar = sender != null ? sender.getAvatarUrl() : null;
            return MessageDto.from(msg, senderName, senderAvatar);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MessageDto saveMessage(UUID conversationId, UUID senderId, SendMessageRequest request) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, senderId)) {
            throw new AppException("Bạn không phải thành viên của cuộc trò chuyện này", HttpStatus.FORBIDDEN);
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException("Cuộc trò chuyện không tồn tại", HttpStatus.NOT_FOUND));

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .content(request.getContent().trim())
                .messageType(request.getMessageType())
                .fileUrl(request.getFileUrl())
                .build();

        Message savedMessage = messageRepository.save(message);

        conversation.setLastMessageContent(savedMessage.getContent());
        conversation.setLastMessageAt(savedMessage.getCreatedAt());
        conversationRepository.save(conversation);

        User sender = userRepository.findById(senderId).orElse(null);
        String senderName = sender != null ? sender.getDisplayName() : "Tôi";
        String senderAvatar = sender != null ? sender.getAvatarUrl() : null;

        log.info("Lưu tin nhắn mới trong hội thoại {}: sender={}", conversationId, senderId);

        return MessageDto.from(savedMessage, senderName, senderAvatar);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> searchUsers(String query, UUID currentUserId) {
        List<User> users;
        if (query == null || query.isBlank()) {
            users = userRepository.findTop20ByIdNotOrderByDisplayNameAsc(currentUserId);
        } else {
            users = userRepository.searchUsers(query.trim(), currentUserId);
        }
        return users.stream().map(UserDto::from).collect(Collectors.toList());
    }
}

