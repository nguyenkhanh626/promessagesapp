package com.team17.chatapp.chat;

import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.AddGroupMembersRequest;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.ConversationMediaDto;
import com.team17.chatapp.chat.dto.CreateGroupConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.PagedMessagesDto;
import com.team17.chatapp.chat.dto.PinMessageEventDto;
import com.team17.chatapp.chat.dto.ReactionEventDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.MemberRole;
import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageReaction;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.chat.repository.ConversationRepository;
import com.team17.chatapp.chat.repository.MessageReactionRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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
    private MessageReactionRepository messageReactionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatServiceImpl chatService;

    private UUID user1Id;
    private UUID user2Id;
    private UUID user3Id;
    private User user1;
    private User user2;
    private User user3;
    private Conversation sampleConversation;
    private Conversation sampleGroupConversation;

    @BeforeEach
    void setUp() {
        user1Id = UUID.randomUUID();
        user2Id = UUID.randomUUID();
        user3Id = UUID.randomUUID();

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

        user3 = User.builder()
                .email("user3@example.com")
                .displayName("Le Van C")
                .status(UserStatus.OFFLINE)
                .role(Role.ROLE_USER)
                .build();
        user3.setId(user3Id);

        sampleConversation = Conversation.builder()
                .type(ConversationType.DIRECT)
                .lastMessageContent("Hello world")
                .lastMessageAt(LocalDateTime.now())
                .build();
        sampleConversation.setId(UUID.randomUUID());

        sampleGroupConversation = Conversation.builder()
                .name("Team Sprint 3")
                .type(ConversationType.GROUP)
                .lastMessageContent("Nguyen Van A đã tạo nhóm \"Team Sprint 3\"")
                .lastMessageAt(LocalDateTime.now())
                .build();
        sampleGroupConversation.setId(UUID.randomUUID());
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
                .role(MemberRole.MEMBER)
                .build();

        when(conversationMemberRepository.findByConversationId(sampleConversation.getId()))
                .thenReturn(List.of(member2));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));

        List<ConversationDto> conversations = chatService.getUserConversations(user1Id);

        assertNotNull(conversations);
        assertEquals(1, conversations.size());
        assertEquals("Tran Thi B", conversations.get(0).getName());
    }

    @Test
    @DisplayName("Tuần 3: Tạo nhóm chat mới thành công với Admin và các thành viên")
    void testCreateGroupConversation_Success() {
        CreateGroupConversationRequest request = CreateGroupConversationRequest.builder()
                .name("Team Sprint 3")
                .memberIds(List.of(user2Id, user3Id))
                .build();

        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleGroupConversation);
        when(userRepository.existsById(user2Id)).thenReturn(true);
        when(userRepository.existsById(user3Id)).thenReturn(true);
        when(conversationMemberRepository.save(any(ConversationMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findAllById(any())).thenReturn(List.of(user1, user2, user3));

        ConversationDto result = chatService.createGroupConversation(user1Id, request);

        assertNotNull(result);
        assertEquals(ConversationType.GROUP, result.getType());
        assertEquals("Team Sprint 3", result.getName());
        assertEquals(3, result.getMemberCount());
        assertEquals(MemberRole.ADMIN, result.getCurrentUserRole());
        verify(messageRepository).save(any());
    }

    @Test
    @DisplayName("Tuần 3: Thêm thành viên mới vào nhóm trò chuyện thành công")
    void testAddMembersToGroup_Success() {
        UUID groupId = sampleGroupConversation.getId();
        AddGroupMembersRequest request = AddGroupMembersRequest.builder()
                .userIds(List.of(user3Id))
                .build();

        ConversationMember adminMember = ConversationMember.builder()
                .conversationId(groupId)
                .userId(user1Id)
                .role(MemberRole.ADMIN)
                .build();

        ConversationMember newMember = ConversationMember.builder()
                .conversationId(groupId)
                .userId(user3Id)
                .role(MemberRole.MEMBER)
                .build();

        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(sampleGroupConversation));
        when(conversationMemberRepository.findByConversationIdAndUserId(groupId, user1Id))
                .thenReturn(Optional.of(adminMember));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(conversationMemberRepository.existsByConversationIdAndUserId(groupId, user3Id)).thenReturn(false);
        when(userRepository.findById(user3Id)).thenReturn(Optional.of(user3));
        when(conversationRepository.save(any(Conversation.class))).thenReturn(sampleGroupConversation);
        when(conversationMemberRepository.findByConversationId(groupId))
                .thenReturn(List.of(adminMember, newMember));
        when(userRepository.findAllById(any())).thenReturn(List.of(user1, user3));

        ConversationDto updated = chatService.addMembersToGroup(groupId, user1Id, request);

        assertNotNull(updated);
        assertEquals(2, updated.getMemberCount());
        verify(conversationMemberRepository).save(any(ConversationMember.class));
    }

    @Test
    @DisplayName("Tuần 3: Chặn thành viên thường xóa người khác khỏi nhóm")
    void testRemoveMemberFromGroup_NonAdmin_ThrowsForbidden() {
        UUID groupId = sampleGroupConversation.getId();

        ConversationMember normalMember = ConversationMember.builder()
                .conversationId(groupId)
                .userId(user2Id)
                .role(MemberRole.MEMBER)
                .build();

        ConversationMember targetMember = ConversationMember.builder()
                .conversationId(groupId)
                .userId(user3Id)
                .role(MemberRole.MEMBER)
                .build();

        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(sampleGroupConversation));
        when(conversationMemberRepository.findByConversationIdAndUserId(groupId, user2Id))
                .thenReturn(Optional.of(normalMember));
        when(conversationMemberRepository.findByConversationIdAndUserId(groupId, user3Id))
                .thenReturn(Optional.of(targetMember));

        AppException ex = assertThrows(AppException.class, () ->
                chatService.removeMemberFromGroup(groupId, user2Id, user3Id)
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Tuần 3: Lưu tin nhắn đính kèm hình ảnh / tệp thành công")
    void testSaveMessage_WithImageAttachment_Success() {
        UUID conversationId = sampleGroupConversation.getId();
        SendMessageRequest request = SendMessageRequest.builder()
                .content("")
                .messageType(MessageType.IMAGE)
                .fileUrl("http://localhost:8080/api/files/sample.png")
                .fileName("sample.png")
                .fileSize(12345L)
                .build();

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(sampleGroupConversation));
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));

        MessageDto result = chatService.saveMessage(conversationId, user1Id, request);

        assertNotNull(result);
        assertEquals(MessageType.IMAGE, result.getMessageType());
        assertEquals("http://localhost:8080/api/files/sample.png", result.getFileUrl());
        assertEquals("sample.png", result.getFileName());
        assertEquals(12345L, result.getFileSize());
    }

    @Test
    @DisplayName("Tuần 4: Tìm kiếm tin nhắn theo từ khóa trong cuộc trò chuyện thành công")
    void testSearchMessagesInConversation_Success() {
        UUID conversationId = sampleConversation.getId();
        Message matchedMsg = Message.builder()
                .conversationId(conversationId)
                .senderId(user1Id)
                .content("Báo cáo tiến độ tuần 4")
                .messageType(MessageType.TEXT)
                .build();
        matchedMsg.setId(UUID.randomUUID());

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(messageRepository.searchMessagesInConversation(conversationId, "tuần 4"))
                .thenReturn(List.of(matchedMsg));
        when(userRepository.findAllById(any())).thenReturn(List.of(user1));

        List<MessageDto> results = chatService.searchMessagesInConversation(conversationId, user1Id, "tuần 4");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("Báo cáo tiến độ tuần 4", results.get(0).getContent());
        assertEquals("Nguyen Van A", results.get(0).getSenderName());
    }

    @Test
    @DisplayName("Tuần 5: Ghim và bỏ ghim tin nhắn trong cuộc trò chuyện thành công")
    void testTogglePinMessage_Success() {
        UUID conversationId = sampleGroupConversation.getId();
        UUID messageId = UUID.randomUUID();
        Message targetMsg = Message.builder()
                .conversationId(conversationId)
                .senderId(user2Id)
                .content("Tài liệu họp Sprint 5 rất quan trọng")
                .messageType(MessageType.TEXT)
                .pinned(false)
                .build();
        targetMsg.setId(messageId);

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(targetMsg));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));

        PinMessageEventDto pinnedEvent = chatService.togglePinMessage(conversationId, messageId, user1Id, true);

        assertNotNull(pinnedEvent);
        assertEquals(true, pinnedEvent.isPinned());
        assertEquals(user1Id, pinnedEvent.getPinnedById());
        assertEquals("Nguyen Van A", pinnedEvent.getPinnedByName());
        assertEquals(true, pinnedEvent.getMessage().isPinned());

        PinMessageEventDto unpinnedEvent = chatService.togglePinMessage(conversationId, messageId, user1Id, false);
        assertEquals(false, unpinnedEvent.isPinned());
        assertEquals(false, unpinnedEvent.getMessage().isPinned());
    }

    @Test
    @DisplayName("Tuần 5: Chặn người không thuộc cuộc trò chuyện ghim tin nhắn")
    void testTogglePinMessage_NonMember_ThrowsForbidden() {
        UUID conversationId = sampleGroupConversation.getId();
        UUID messageId = UUID.randomUUID();

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user3Id)).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () ->
                chatService.togglePinMessage(conversationId, messageId, user3Id, true)
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Tuần 5: Truy vấn thư viện Media/Files đã chia sẻ theo hội thoại")
    void testGetConversationMedia_Success() {
        UUID conversationId = sampleGroupConversation.getId();
        Message imgMsg = Message.builder()
                .conversationId(conversationId)
                .senderId(user1Id)
                .content("diagram.png")
                .messageType(MessageType.IMAGE)
                .fileUrl("http://localhost:8080/api/files/diagram.png")
                .fileName("diagram.png")
                .fileSize(4096L)
                .build();
        imgMsg.setId(UUID.randomUUID());

        Message pdfMsg = Message.builder()
                .conversationId(conversationId)
                .senderId(user2Id)
                .content("spec-week5.pdf")
                .messageType(MessageType.FILE)
                .fileUrl("http://localhost:8080/api/files/spec-week5.pdf")
                .fileName("spec-week5.pdf")
                .fileSize(20480L)
                .build();
        pdfMsg.setId(UUID.randomUUID());

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(messageRepository.findByConversationIdAndMessageTypeInAndFileUrlIsNotNullOrderByCreatedAtDesc(
                conversationId, List.of(MessageType.IMAGE, MessageType.FILE)))
                .thenReturn(List.of(imgMsg, pdfMsg));
        when(userRepository.findAllById(any())).thenReturn(List.of(user1, user2));

        List<ConversationMediaDto> mediaList = chatService.getConversationMedia(conversationId, user1Id, null);

        assertNotNull(mediaList);
        assertEquals(2, mediaList.size());
        assertEquals("diagram.png", mediaList.get(0).getFileName());
        assertEquals("spec-week5.pdf", mediaList.get(1).getFileName());
    }

    @Test
    @DisplayName("Tuần 5: Lưu tin nhắn đánh dấu quan trọng (Important) thành công")
    void testSaveMessage_Important_Success() {
        UUID conversationId = sampleConversation.getId();
        SendMessageRequest request = SendMessageRequest.builder()
                .content("Họp khẩn lúc 15h!")
                .messageType(MessageType.TEXT)
                .important(true)
                .build();

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));

        MessageDto dto = chatService.saveMessage(conversationId, user1Id, request);

        assertNotNull(dto);
        assertEquals(true, dto.isImportant());
        assertEquals("❗ Họp khẩn lúc 15h!", sampleConversation.getLastMessageContent());
    }

    @Test
    @DisplayName("Tuần 6: Thả cảm xúc Emoji Reaction và gỡ khi bấm lại lần 2")
    void testToggleMessageReaction_AddAndRemove_Success() {
        UUID conversationId = sampleConversation.getId();
        UUID messageId = UUID.randomUUID();
        Message msg = Message.builder()
                .conversationId(conversationId)
                .senderId(user2Id)
                .content("Tin nhắn tuyệt vời!")
                .messageType(MessageType.TEXT)
                .build();
        msg.setId(messageId);

        MessageReaction savedReaction = MessageReaction.builder()
                .messageId(messageId)
                .userId(user1Id)
                .emoji("👍")
                .build();
        savedReaction.setId(UUID.randomUUID());

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));
        when(messageReactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, user1Id, "👍"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(savedReaction));
        when(messageReactionRepository.findByMessageId(messageId))
                .thenReturn(List.of(savedReaction))
                .thenReturn(List.of());
        when(userRepository.findAllById(any())).thenReturn(List.of(user1));

        // Lần 1: Thả cảm xúc 👍
        ReactionEventDto added = chatService.toggleMessageReaction(conversationId, messageId, user1Id, "👍");
        assertNotNull(added);
        assertEquals(1, added.getReactions().size());
        assertEquals("👍", added.getReactions().get(0).getEmoji());
        assertEquals(1, added.getReactions().get(0).getCount());
        verify(messageReactionRepository).save(any(MessageReaction.class));

        // Lần 2: Gỡ cảm xúc 👍
        ReactionEventDto removed = chatService.toggleMessageReaction(conversationId, messageId, user1Id, "👍");
        assertNotNull(removed);
        assertEquals(0, removed.getReactions().size());
        verify(messageReactionRepository).delete(savedReaction);
    }

    @Test
    @DisplayName("Tuần 6: Gửi tin nhắn trả lời trích dẫn (Reply/Quote) và chặn trích dẫn khác phòng")
    void testSaveMessage_WithReplyTo_SuccessAndRejectCrossConversation() {
        UUID conversationId = sampleConversation.getId();
        UUID parentId = UUID.randomUUID();
        Message parentMsg = Message.builder()
                .conversationId(conversationId)
                .senderId(user2Id)
                .content("Hẹn 9h sáng mai họp nhé")
                .messageType(MessageType.TEXT)
                .build();
        parentMsg.setId(parentId);

        SendMessageRequest validReplyReq = SendMessageRequest.builder()
                .content("Ok mình xác nhận!")
                .messageType(MessageType.TEXT)
                .replyToId(parentId)
                .build();

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(sampleConversation));
        when(messageRepository.findById(parentId)).thenReturn(Optional.of(parentMsg));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));

        MessageDto replyDto = chatService.saveMessage(conversationId, user1Id, validReplyReq);
        assertNotNull(replyDto.getReplyTo());
        assertEquals(parentId, replyDto.getReplyToId());
        assertEquals("Tran Thi B", replyDto.getReplyTo().getSenderName());
        assertEquals("Hẹn 9h sáng mai họp nhé", replyDto.getReplyTo().getContent());

        // Chặn trích dẫn tin nhắn từ phòng khác
        UUID foreignParentId = UUID.randomUUID();
        Message foreignMsg = Message.builder()
                .conversationId(UUID.randomUUID())
                .senderId(user3Id)
                .content("Tin phòng khác")
                .messageType(MessageType.TEXT)
                .build();
        foreignMsg.setId(foreignParentId);
        when(messageRepository.findById(foreignParentId)).thenReturn(Optional.of(foreignMsg));

        SendMessageRequest invalidReplyReq = SendMessageRequest.builder()
                .content("Trích dẫn sai phòng")
                .replyToId(foreignParentId)
                .build();
        AppException ex = assertThrows(AppException.class, () ->
                chatService.saveMessage(conversationId, user1Id, invalidReplyReq)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Tuần 6: Phân trang lịch sử tin nhắn đảo đúng thứ tự thời gian và cờ hasMore")
    void testGetPagedMessages_Success() {
        UUID conversationId = sampleConversation.getId();
        Message newest = Message.builder()
                .conversationId(conversationId)
                .senderId(user1Id)
                .content("Tin mới nhất")
                .messageType(MessageType.TEXT)
                .build();
        newest.setId(UUID.randomUUID());

        Message older = Message.builder()
                .conversationId(conversationId)
                .senderId(user2Id)
                .content("Tin cũ hơn")
                .messageType(MessageType.TEXT)
                .build();
        older.setId(UUID.randomUUID());

        when(conversationMemberRepository.existsByConversationIdAndUserId(conversationId, user1Id)).thenReturn(true);
        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(0, 2)))
                .thenReturn(new PageImpl<>(List.of(newest, older), PageRequest.of(0, 2), 5));
        when(messageReactionRepository.findByMessageIdIn(any())).thenReturn(List.of());
        when(userRepository.findAllById(any())).thenReturn(List.of(user1, user2));

        PagedMessagesDto paged = chatService.getPagedMessages(conversationId, user1Id, 0, 2);

        assertNotNull(paged);
        assertEquals(2, paged.getContent().size());
        assertEquals("Tin cũ hơn", paged.getContent().get(0).getContent());
        assertEquals("Tin mới nhất", paged.getContent().get(1).getContent());
        assertEquals(true, paged.isHasMore());
        assertEquals(5, paged.getTotalElements());
    }
}
