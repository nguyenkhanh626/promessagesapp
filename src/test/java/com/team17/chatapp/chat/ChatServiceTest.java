package com.team17.chatapp.chat;

import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.chat.repository.ConversationRepository;
import com.team17.chatapp.chat.repository.MessageRepository;
import com.team17.chatapp.chat.service.ChatServiceImpl;
import com.team17.chatapp.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationMemberRepository conversationMemberRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatServiceImpl chatService;

    private UUID user1Id;
    private UUID user2Id;
    private User user1;
    private User user2;
    private Conversation sampleConversation;

    @BeforeEach
    void setUp() {
        user1Id = UUID.randomUUID();
        user2Id = UUID.randomUUID();

        user1 = User.builder()
                .email("user1@example.com")
                .displayName("Nguyen Van A")
                .status(UserStatus.ONLINE)
                .role(Role.ROLE_USER)
                .build();
        user1.setId(user1Id);

        user2 = User.builder()
                .email("user2@example.com")
                .displayName("Tran Thi B")
                .status(UserStatus.ONLINE)
                .role(Role.ROLE_USER)
                .build();
        user2.setId(user2Id);

        sampleConversation = Conversation.builder()
                .type(ConversationType.DIRECT)
                .lastMessageContent("Hello world")
                .lastMessageAt(LocalDateTime.now())
                .build();
        sampleConversation.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Tạo cuộc trò chuyện 1-1 mới khi chưa tồn tại")
    void testGetOrCreateDirectConversation_CreateNew() {
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));
        when(conversationRepository.findDirectConversationBetweenUsers(ConversationType.DIRECT, user1Id, user2Id))
                .thenReturn(Optional.empty());
        when(conversationRepository.findDirectConversationBetweenUsers(ConversationType.DIRECT, user2Id, user1Id))
                .thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleConversation);

        ConversationDto result = chatService.getOrCreateDirectConversation(user1Id, user2Id);

        assertNotNull(result);
        assertEquals(ConversationType.DIRECT, result.getType());
        assertEquals("Tran Thi B", result.getName());
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    @DisplayName("Báo lỗi khi tự tạo cuộc trò chuyện với chính mình")
    void testGetOrCreateDirectConversation_SelfChat_ThrowsException() {
        AppException ex = assertThrows(AppException.class, () ->
                chatService.getOrCreateDirectConversation(user1Id, user1Id)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Lưu tin nhắn mới thành công và cập nhật cuộc trò chuyện")
    void testSaveMessage_Success() {
        UUID conversationId = sampleConversation.getId();
        SendMessageRequest request = SendMessageRequest.builder()
                .content("Tin nhắn thử nghiệm")
                .messageType(MessageType.TEXT)
                .build();

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));

        MessageDto messageDto = chatService.saveMessage(conversationId, user1Id, request);

        assertNotNull(messageDto);
        assertEquals("Tin nhắn thử nghiệm", messageDto.getContent());
        assertEquals(user1Id, messageDto.getSenderId());
        assertEquals("Nguyen Van A", messageDto.getSenderName());
        verify(conversationRepository).save(sampleConversation);
    }

    @Test
    @DisplayName("Lấy danh sách các cuộc trò chuyện của người dùng")
    void testGetUserConversations_Success() {
        when(conversationRepository.findConversationsByUserId(user1Id))
                .thenReturn(List.of(sampleConversation));

        ConversationMember member2 = ConversationMember.builder()
                .conversationId(sampleConversation.getId())
                .userId(user2Id)
                .build();

        when(conversationMemberRepository.findByConversationId(sampleConversation.getId()))
                .thenReturn(List.of(member2));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));

        List<ConversationDto> conversations = chatService.getUserConversations(user1Id);

        assertNotNull(conversations);
        assertEquals(1, conversations.size());
        assertEquals("Tran Thi B", conversations.get(0).getName());
    }
}

