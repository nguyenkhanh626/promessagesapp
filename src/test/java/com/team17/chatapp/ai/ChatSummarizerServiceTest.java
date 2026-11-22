package com.team17.chatapp.ai;

import com.team17.chatapp.ai.dto.AiPromptResponse;
import com.team17.chatapp.ai.dto.ChatSummaryRequest;
import com.team17.chatapp.ai.service.AiClientService;
import com.team17.chatapp.ai.service.ChatSummarizerService;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.service.ChatService;
import com.team17.chatapp.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class ChatSummarizerServiceTest {

    @Mock
    private ChatService chatService;
    @Mock
    private AiClientService aiClientService;

    private ChatSummarizerService service;
    private UUID conversationId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new ChatSummarizerService(chatService, aiClientService, new ObjectMapper());
        conversationId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void summarizesTextMessagesIntoStructuredResponse() {
        MessageDto message = MessageDto.builder()
                .id(UUID.randomUUID())
                .senderName("An")
                .content("Hoàn thành bản thiết kế vào thứ Sáu.")
                .messageType(MessageType.TEXT)
                .createdAt(LocalDateTime.now())
                .build();
        when(chatService.getConversationMessages(conversationId, userId, 0, 20))
                .thenReturn(new PageImpl<>(List.of(message)));
        when(aiClientService.isConfigured()).thenReturn(true);
        when(aiClientService.sendPrompt(any())).thenReturn(new AiPromptResponse("""
                {"summary":"Nhóm thống nhất lịch hoàn thành.","keyTopics":["Thiết kế"],
                "actionItems":[{"assignee":"An","description":"Hoàn thành bản thiết kế"}]}
                """, "OK", 80));

        var result = service.summarize(conversationId, userId, new ChatSummaryRequest(20, "Vietnamese"));

        assertEquals("Nhóm thống nhất lịch hoàn thành.", result.summary());
        assertEquals(List.of("Thiết kế"), result.keyTopics());
        assertEquals("An", result.actionItems().get(0).assignee());
        assertEquals(1, result.messageCount());
        verify(chatService).getConversationMessages(conversationId, userId, 0, 20);
    }

    @Test
    void rejectsMalformedAiOutputInsteadOfReturningAnEmptySummary() {
        MessageDto message = MessageDto.builder()
                .content("Nội dung")
                .messageType(MessageType.TEXT)
                .createdAt(LocalDateTime.now())
                .build();
        when(chatService.getConversationMessages(conversationId, userId, 0, 50))
                .thenReturn(new PageImpl<>(List.of(message)));
        when(aiClientService.isConfigured()).thenReturn(true);
        when(aiClientService.sendPrompt(any())).thenReturn(new AiPromptResponse("không phải JSON", "OK", null));

        AppException exception = assertThrows(AppException.class,
                () -> service.summarize(conversationId, userId, null));

        assertEquals(502, exception.getStatus().value());
    }

    @Test
    void doesNotCallAiWhenConversationAccessIsDenied() {
        when(chatService.getConversationMessages(conversationId, userId, 0, 50))
                .thenThrow(new AppException("Forbidden", org.springframework.http.HttpStatus.FORBIDDEN));

        assertThrows(AppException.class, () -> service.summarize(conversationId, userId, null));

        verify(aiClientService, never()).sendPrompt(any());
    }
}
