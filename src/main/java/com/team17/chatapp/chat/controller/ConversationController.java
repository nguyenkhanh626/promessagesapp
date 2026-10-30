package com.team17.chatapp.chat.controller;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.DirectConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.service.ChatService;
import com.team17.chatapp.common.ApiResponse;
import com.team17.chatapp.exception.AppException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ConversationController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AppException("Chưa đăng nhập", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AppException("Người dùng không tồn tại", HttpStatus.NOT_FOUND));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationDto>>> getMyConversations(Authentication authentication) {
        User currentUser = getAuthenticatedUser(authentication);
        List<ConversationDto> conversations = chatService.getUserConversations(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(conversations));
    }

    @PostMapping("/conversations/direct")
    public ResponseEntity<ApiResponse<ConversationDto>> getOrCreateDirectConversation(
            @Valid @RequestBody DirectConversationRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        ConversationDto conversation = chatService.getOrCreateDirectConversation(currentUser.getId(), request.getTargetUserId());
        return ResponseEntity.ok(ApiResponse.success("Mở cuộc trò chuyện 1-1 thành công", conversation));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<ConversationDto>> getConversationDetail(
            @PathVariable("id") UUID conversationId,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        ConversationDto conversation = chatService.getConversationById(conversationId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(conversation));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageDto>>> getConversationMessages(
            @PathVariable("id") UUID conversationId,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<MessageDto> messages = chatService.getAllMessagesAsc(conversationId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<MessageDto>> sendMessage(
            @PathVariable("id") UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        MessageDto messageDto = chatService.saveMessage(conversationId, currentUser.getId(), request);

        // Broadcast thời gian thực qua kênh STOMP WebSocket
        messagingTemplate.convertAndSend("/topic/chat/" + conversationId, messageDto);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi tin nhắn thành công", messageDto));
    }

    @GetMapping("/users/search")
    public ResponseEntity<ApiResponse<List<UserDto>>> searchUsers(
            @RequestParam(value = "q", required = false) String query,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<UserDto> users = chatService.searchUsers(query, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}

