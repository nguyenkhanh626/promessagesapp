package com.team17.chatapp.ai.controller;

import com.team17.chatapp.ai.dto.AiChatRequest;
import com.team17.chatapp.ai.dto.AiHealthResponse;
import com.team17.chatapp.ai.dto.AiPromptRequest;
import com.team17.chatapp.ai.dto.AiPromptResponse;
import com.team17.chatapp.ai.service.AiClientService;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.service.ChatService;
import com.team17.chatapp.common.ApiResponse;
import com.team17.chatapp.exception.AppException;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.concurrent.RejectedExecutionException;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiClientService aiClientService;
    private final ChatService chatService;
    private final UserRepository userRepository;
    private final AsyncTaskExecutor aiStreamingExecutor;

    public AiController(
            AiClientService aiClientService,
            ChatService chatService,
            UserRepository userRepository,
            @Qualifier("aiStreamingExecutor") AsyncTaskExecutor aiStreamingExecutor) {
        this.aiClientService = aiClientService;
        this.chatService = chatService;
        this.userRepository = userRepository;
        this.aiStreamingExecutor = aiStreamingExecutor;
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<AiHealthResponse>> health() {
        AiHealthResponse health = aiClientService.testConnection();
        return ResponseEntity.ok(ApiResponse.success(health));
    }

    @PostMapping("/test-prompt")
    public ResponseEntity<ApiResponse<AiPromptResponse>> testPrompt(
            @Valid @RequestBody AiPromptRequest request) {
        AiPromptResponse response = aiClientService.sendPrompt(request);
        if (!"OK".equals(response.status())) {
            ApiResponse<AiPromptResponse> error = ApiResponse.<AiPromptResponse>builder()
                    .success(false)
                    .message(response.reply())
                    .data(response)
                    .build();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<?> streamChat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        Page<MessageDto> recentMessages = chatService.getConversationMessages(
                request.conversationId(), user.getId(), 0, 20);
        String context = recentMessages.getContent().stream()
                .filter(message -> message.getMessageType() == MessageType.TEXT)
                .sorted(Comparator.comparing(MessageDto::getCreatedAt))
                .map(message -> message.getSenderName() + ": " + truncate(message.getContent(), 500))
                .collect(Collectors.joining("\n"));
        context = truncate(context, 4000);

        if (!aiClientService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("Gemini chưa được cấu hình. Hãy đặt biến môi trường GEMINI_API_KEY."));
        }

        String conversationContext = context;
        SseEmitter emitter = new SseEmitter(100_000L);
        try {
            aiStreamingExecutor.execute(() -> {
                try {
                    aiClientService.streamChat(request.prompt(), conversationContext, chunk -> {
                        try {
                            emitter.send(SseEmitter.event().data(chunk));
                        } catch (IOException exception) {
                            throw new UncheckedIOException(exception);
                        }
                    });
                    emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                    emitter.complete();
                } catch (UncheckedIOException exception) {
                    emitter.complete();
                } catch (RuntimeException exception) {
                    log.warn("AI chat stream failed for conversation {} ({})",
                            request.conversationId(), exception.getClass().getSimpleName());
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data("Trợ lý AI không thể trả lời lúc này. Vui lòng thử lại."));
                    } catch (IOException sendException) {
                        log.debug("AI chat client disconnected before error notification was sent");
                    } finally {
                        emitter.complete();
                    }
                } catch (IOException exception) {
                    emitter.complete();
                }
            });
        } catch (RejectedExecutionException exception) {
            log.warn("AI streaming capacity reached");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("Trợ lý AI đang bận. Vui lòng thử lại sau."));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(emitter);
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AppException("Chưa đăng nhập", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AppException("Người dùng không tồn tại", HttpStatus.NOT_FOUND));
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value == null ? "" : value;
        }
        return value.substring(0, maxLength);
    }
}
