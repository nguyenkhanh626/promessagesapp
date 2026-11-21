package com.team17.chatapp.ai;

import com.team17.chatapp.ai.controller.AiController;
import com.team17.chatapp.ai.dto.AiChatRequest;
import com.team17.chatapp.ai.service.AiClientService;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiControllerTest {

    @Mock
    private AiClientService aiClientService;
    @Mock
    private ChatService chatService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AsyncTaskExecutor aiStreamingExecutor;
    @Mock
    private Authentication authentication;

    private AiController controller;
    private UUID conversationId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        controller = new AiController(aiClientService, chatService, userRepository, aiStreamingExecutor);
        conversationId = UUID.randomUUID();
        userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("member@example.com");
        when(authentication.getName()).thenReturn("member@example.com");
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));
        when(chatService.getConversationMessages(conversationId, userId, 0, 20))
                .thenReturn(new PageImpl<>(List.of()));
    }

    @Test
    void refusesStreamingWhenGeminiIsNotConfiguredAfterCheckingConversationAccess() {
        when(aiClientService.isConfigured()).thenReturn(false);

        var response = controller.streamChat(
                new AiChatRequest(conversationId, "Tóm tắt cuộc trò chuyện"), authentication);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        verify(chatService).getConversationMessages(conversationId, userId, 0, 20);
    }
}
