package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.AddGroupMembersRequest;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.ConversationMemberDto;
import com.team17.chatapp.chat.dto.CreateGroupConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.dto.UpdateGroupConversationRequest;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.MemberRole;
import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
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
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
            MemberRole currentUserRole = members.stream()
                    .filter(m -> m.getUserId().equals(currentUserId))
                    .map(ConversationMember::getRole)
                    .findFirst()
                    .orElse(MemberRole.MEMBER);

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

            results.add(ConversationDto.from(conversation, otherUserDto, members.size(), currentUserRole, null));
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
    @Transactional
    public ConversationDto createGroupConversation(UUID creatorId, CreateGroupConversationRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new AppException("Tên nhóm không được để trống", HttpStatus.BAD_REQUEST);
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException("Không tìm thấy người tạo nhóm", HttpStatus.NOT_FOUND));

        String groupName = request.getName().trim();
        String avatarUrl = request.getAvatarUrl();
        if (avatarUrl == null || avatarUrl.isBlank()) {
            avatarUrl = "https://ui-avatars.com/api/?name=" +
                    groupName.replace(" ", "+") +
                    "&background=5B5FC7&color=fff&bold=true";
        }

        String systemText = creator.getDisplayName() + " đã tạo nhóm \"" + groupName + "\"";

        Conversation conversation = Conversation.builder()
                .name(groupName)
                .type(ConversationType.GROUP)
                .avatarUrl(avatarUrl)
                .lastMessageContent(systemText)
                .lastMessageAt(LocalDateTime.now())
                .build();
        conversation = conversationRepository.save(conversation);

        List<ConversationMember> savedMembers = new ArrayList<>();

        // Thêm người tạo làm ADMIN
        ConversationMember adminMember = ConversationMember.builder()
                .conversationId(conversation.getId())
                .userId(creatorId)
                .role(MemberRole.ADMIN)
                .joinedAt(LocalDateTime.now())
                .build();
        savedMembers.add(conversationMemberRepository.save(adminMember));

        // Thêm các thành viên được mời
        Set<UUID> uniqueMemberIds = new LinkedHashSet<>();
        if (request.getMemberIds() != null) {
            uniqueMemberIds.addAll(request.getMemberIds());
        }
        uniqueMemberIds.remove(creatorId);

        for (UUID memberId : uniqueMemberIds) {
            if (userRepository.existsById(memberId)) {
                ConversationMember member = ConversationMember.builder()
                        .conversationId(conversation.getId())
                        .userId(memberId)
                        .role(MemberRole.MEMBER)
                        .joinedAt(LocalDateTime.now())
                        .build();
                savedMembers.add(conversationMemberRepository.save(member));
            }
        }

        // Lưu tin nhắn hệ thống khởi tạo nhóm
        Message systemMessage = Message.builder()
                .conversationId(conversation.getId())
                .senderId(creatorId)
                .content(systemText)
                .messageType(MessageType.SYSTEM)
                .build();
        messageRepository.save(systemMessage);

        log.info("Đã tạo nhóm chat mới '{}' ({}) bởi {} với {} thành viên",
                groupName, conversation.getId(), creatorId, savedMembers.size());

        List<ConversationMemberDto> memberDtos = buildMemberDtos(savedMembers);
        return ConversationDto.from(conversation, null, savedMembers.size(), MemberRole.ADMIN, memberDtos);
    }

    @Override
    @Transactional
    public ConversationDto updateGroupConversation(UUID conversationId, UUID requesterId, UpdateGroupConversationRequest request) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException("Cuộc trò chuyện không tồn tại", HttpStatus.NOT_FOUND));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new AppException("Chỉ có thể cập nhật thông tin cho cuộc trò chuyện nhóm", HttpStatus.BAD_REQUEST);
        }

        ConversationMember requesterMember = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, requesterId)
                .orElseThrow(() -> new AppException("Bạn không phải thành viên của nhóm này", HttpStatus.FORBIDDEN));

        if (request.getName() != null && !request.getName().isBlank()) {
            conversation.setName(request.getName().trim());
        }
        if (request.getAvatarUrl() != null && !request.getAvatarUrl().isBlank()) {
            conversation.setAvatarUrl(request.getAvatarUrl().trim());
        }

        conversation = conversationRepository.save(conversation);
        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        return ConversationDto.from(conversation, null, members.size(), requesterMember.getRole(), buildMemberDtos(members));
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
        MemberRole currentUserRole = members.stream()
                .filter(m -> m.getUserId().equals(currentUserId))
                .map(ConversationMember::getRole)
                .findFirst()
                .orElse(MemberRole.MEMBER);

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

        List<ConversationMemberDto> memberDtos = buildMemberDtos(members);
        return ConversationDto.from(conversation, otherUserDto, members.size(), currentUserRole, memberDtos);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationMemberDto> getConversationMembers(UUID conversationId, UUID currentUserId) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, currentUserId)) {
            throw new AppException("Bạn không có quyền xem danh sách thành viên của cuộc trò chuyện này", HttpStatus.FORBIDDEN);
        }

        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        return buildMemberDtos(members);
    }

    @Override
    @Transactional
    public ConversationDto addMembersToGroup(UUID conversationId, UUID requesterId, AddGroupMembersRequest request) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException("Nhóm trò chuyện không tồn tại", HttpStatus.NOT_FOUND));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new AppException("Không thể thêm thành viên vào cuộc trò chuyện 1-1", HttpStatus.BAD_REQUEST);
        }

        ConversationMember requesterMember = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, requesterId)
                .orElseThrow(() -> new AppException("Bạn không phải thành viên của nhóm này", HttpStatus.FORBIDDEN));

        User requester = userRepository.findById(requesterId).orElse(null);
        String requesterName = requester != null ? requester.getDisplayName() : "Quản trị viên";

        List<String> addedNames = new ArrayList<>();
        if (request.getUserIds() != null) {
            for (UUID userId : new LinkedHashSet<>(request.getUserIds())) {
                if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId)) {
                    Optional<User> userOpt = userRepository.findById(userId);
                    if (userOpt.isPresent()) {
                        ConversationMember newMember = ConversationMember.builder()
                                .conversationId(conversationId)
                                .userId(userId)
                                .role(MemberRole.MEMBER)
                                .joinedAt(LocalDateTime.now())
                                .build();
                        conversationMemberRepository.save(newMember);
                        addedNames.add(userOpt.get().getDisplayName());
                    }
                }
            }
        }

        if (!addedNames.isEmpty()) {
            String systemText = requesterName + " đã thêm " + String.join(", ", addedNames) + " vào nhóm";
            Message systemMessage = Message.builder()
                    .conversationId(conversationId)
                    .senderId(requesterId)
                    .content(systemText)
                    .messageType(MessageType.SYSTEM)
                    .build();
            messageRepository.save(systemMessage);

            conversation.setLastMessageContent(systemText);
            conversation.setLastMessageAt(LocalDateTime.now());
            conversation = conversationRepository.save(conversation);
        }

        List<ConversationMember> allMembers = conversationMemberRepository.findByConversationId(conversationId);
        return ConversationDto.from(conversation, null, allMembers.size(), requesterMember.getRole(), buildMemberDtos(allMembers));
    }

    @Override
    @Transactional
    public void removeMemberFromGroup(UUID conversationId, UUID requesterId, UUID targetUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException("Nhóm trò chuyện không tồn tại", HttpStatus.NOT_FOUND));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new AppException("Không thể xóa thành viên khỏi cuộc trò chuyện 1-1", HttpStatus.BAD_REQUEST);
        }

        ConversationMember requesterMember = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, requesterId)
                .orElseThrow(() -> new AppException("Bạn không phải thành viên của nhóm này", HttpStatus.FORBIDDEN));

        ConversationMember targetMember = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new AppException("Người dùng này không có trong nhóm", HttpStatus.NOT_FOUND));

        boolean isSelfLeave = requesterId.equals(targetUserId);
        if (!isSelfLeave && requesterMember.getRole() != MemberRole.ADMIN) {
            throw new AppException("Chỉ quản trị viên nhóm mới có quyền xóa thành viên khác", HttpStatus.FORBIDDEN);
        }

        conversationMemberRepository.delete(targetMember);

        User requester = userRepository.findById(requesterId).orElse(null);
        User targetUser = userRepository.findById(targetUserId).orElse(null);
        String requesterName = requester != null ? requester.getDisplayName() : "Quản trị viên";
        String targetName = targetUser != null ? targetUser.getDisplayName() : "Thành viên";

        String systemText = isSelfLeave
                ? targetName + " đã rời khỏi nhóm"
                : requesterName + " đã mời " + targetName + " ra khỏi nhóm";

        Message systemMessage = Message.builder()
                .conversationId(conversationId)
                .senderId(requesterId)
                .content(systemText)
                .messageType(MessageType.SYSTEM)
                .build();
        messageRepository.save(systemMessage);

        conversation.setLastMessageContent(systemText);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        log.info("Thành viên {} đã bị xóa/rời khỏi nhóm {} (bởi {})", targetUserId, conversationId, requesterId);
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

        MessageType type = request.getMessageType() != null ? request.getMessageType() : MessageType.TEXT;
        String rawContent = request.getContent() != null ? request.getContent().trim() : "";

        if (rawContent.isEmpty() && (request.getFileUrl() == null || request.getFileUrl().isBlank())) {
            throw new AppException("Nội dung tin nhắn hoặc tệp đính kèm không được để trống", HttpStatus.BAD_REQUEST);
        }

        if (rawContent.isEmpty()) {
            if (type == MessageType.IMAGE) {
                rawContent = request.getFileName() != null ? request.getFileName() : "Đã gửi một hình ảnh";
            } else if (type == MessageType.FILE) {
                rawContent = request.getFileName() != null ? request.getFileName() : "Đã gửi một tệp đính kèm";
            }
        }

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .content(rawContent)
                .messageType(type)
                .fileUrl(request.getFileUrl())
                .fileName(request.getFileName())
                .fileSize(request.getFileSize())
                .build();

        Message savedMessage = messageRepository.save(message);

        String previewContent = switch (type) {
            case IMAGE -> "📷 [Hình ảnh] " + savedMessage.getContent();
            case FILE -> "📎 [Tệp] " + (savedMessage.getFileName() != null ? savedMessage.getFileName() : savedMessage.getContent());
            default -> savedMessage.getContent();
        };

        conversation.setLastMessageContent(previewContent);
        conversation.setLastMessageAt(savedMessage.getCreatedAt() != null ? savedMessage.getCreatedAt() : LocalDateTime.now());
        conversationRepository.save(conversation);

        User sender = userRepository.findById(senderId).orElse(null);
        String senderName = sender != null ? sender.getDisplayName() : "Tôi";
        String senderAvatar = sender != null ? sender.getAvatarUrl() : null;

        log.info("Lưu tin nhắn mới trong hội thoại {}: sender={}, type={}", conversationId, senderId, type);

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

    private List<ConversationMemberDto> buildMemberDtos(List<ConversationMember> members) {
        if (members == null || members.isEmpty()) {
            return List.of();
        }
        List<UUID> userIds = members.stream()
                .map(ConversationMember::getUserId)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return members.stream()
                .map(m -> ConversationMemberDto.from(m, userMap.get(m.getUserId())))
                .sorted(Comparator.comparing((ConversationMemberDto dto) -> dto.getRole() != MemberRole.ADMIN)
                        .thenComparing(dto -> dto.getDisplayName() != null ? dto.getDisplayName() : ""))
                .collect(Collectors.toList());
    }
}
