package com.team17.chatapp.chat.controller;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.AddGroupMembersRequest;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.ConversationMemberDto;
import com.team17.chatapp.chat.dto.CreateGroupConversationRequest;
import com.team17.chatapp.chat.dto.DirectConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.PresenceEventDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.dto.TypingEventPayload;
import com.team17.chatapp.chat.dto.UpdateGroupConversationRequest;
import com.team17.chatapp.chat.dto.UpdateStatusRequest;
import com.team17.chatapp.chat.service.ChatService;
import com.team17.chatapp.chat.service.PresenceService;
import com.team17.chatapp.common.ApiResponse;
import com.team17.chatapp.exception.AppException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final PresenceService presenceService;
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

    @PostMapping("/conversations/group")
    public ResponseEntity<ApiResponse<ConversationDto>> createGroupConversation(
            @Valid @RequestBody CreateGroupConversationRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        ConversationDto conversation = chatService.createGroupConversation(currentUser.getId(), request);
        notifyGroupMembers(conversation);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nhóm trò chuyện thành công", conversation));
    }

    @PutMapping("/conversations/{id}/group")
    public ResponseEntity<ApiResponse<ConversationDto>> updateGroupConversation(
            @PathVariable("id") UUID conversationId,
            @Valid @RequestBody UpdateGroupConversationRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        ConversationDto updated = chatService.updateGroupConversation(conversationId, currentUser.getId(), request);
        notifyGroupMembers(updated);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhóm thành công", updated));
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

    @GetMapping("/conversations/{id}/members")
    public ResponseEntity<ApiResponse<List<ConversationMemberDto>>> getConversationMembers(
            @PathVariable("id") UUID conversationId,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<ConversationMemberDto> members = chatService.getConversationMembers(conversationId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PostMapping("/conversations/{id}/members")
    public ResponseEntity<ApiResponse<ConversationDto>> addMembersToGroup(
            @PathVariable("id") UUID conversationId,
            @Valid @RequestBody AddGroupMembersRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        ConversationDto updated = chatService.addMembersToGroup(conversationId, currentUser.getId(), request);
        notifyGroupMembers(updated);
        return ResponseEntity.ok(ApiResponse.success("Thêm thành viên vào nhóm thành công", updated));
    }

    @DeleteMapping("/conversations/{id}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMemberFromGroup(
            @PathVariable("id") UUID conversationId,
            @PathVariable("userId") UUID targetUserId,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        chatService.removeMemberFromGroup(conversationId, currentUser.getId(), targetUserId);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật danh sách thành viên nhóm", null));
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

    @GetMapping("/conversations/{id}/messages/search")
    public ResponseEntity<ApiResponse<List<MessageDto>>> searchMessagesInConversation(
            @PathVariable("id") UUID conversationId,
            @RequestParam("q") String keyword,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<MessageDto> results = chatService.searchMessagesInConversation(conversationId, currentUser.getId(), keyword);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/messages/search")
    public ResponseEntity<ApiResponse<List<MessageDto>>> searchAllMessages(
            @RequestParam("q") String keyword,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<MessageDto> results = chatService.searchAllMyMessages(currentUser.getId(), keyword);
        return ResponseEntity.ok(ApiResponse.success(results));
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

    @PostMapping("/conversations/{id}/typing")
    public ResponseEntity<ApiResponse<Void>> sendTypingIndicator(
            @PathVariable("id") UUID conversationId,
            @RequestBody TypingEventPayload payload,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        TypingEventPayload event = TypingEventPayload.builder()
                .conversationId(conversationId)
                .userId(currentUser.getId())
                .displayName(currentUser.getDisplayName())
                .avatarUrl(currentUser.getAvatarUrl())
                .typing(payload != null && payload.isTyping())
                .build();

        messagingTemplate.convertAndSend("/topic/chat/" + conversationId + "/typing", event);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/users/me/status")
    public ResponseEntity<ApiResponse<PresenceEventDto>> updateMyStatus(
            @Valid @RequestBody UpdateStatusRequest request,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        PresenceEventDto event = presenceService.updateUserStatus(currentUser.getId(), request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật trạng thái hoạt động", event));
    }

    @GetMapping("/users/directory")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUserDirectory(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "status", required = false) UserStatus status,
            Authentication authentication
    ) {
        User currentUser = getAuthenticatedUser(authentication);
        List<UserDto> directory = presenceService.getUserDirectory(currentUser.getId(), query, status);
        return ResponseEntity.ok(ApiResponse.success(directory));
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

    private void notifyGroupMembers(ConversationDto conversation) {
        if (conversation == null || conversation.getMembers() == null) {
            return;
        }
        for (ConversationMemberDto member : conversation.getMembers()) {
            if (member.getEmail() != null && !member.getEmail().isBlank()) {
                messagingTemplate.convertAndSendToUser(
                        member.getEmail(),
                        "/queue/conversations",
                        conversation
                );
            }
            if (member.getUserId() != null) {
                messagingTemplate.convertAndSendToUser(
                        member.getUserId().toString(),
                        "/queue/conversations",
                        conversation
                );
            }
        }
    }
}
