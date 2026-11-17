package com.team17.chatapp.whiteboard.controller;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.common.ApiResponse;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionRequest;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotRequest;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotResponse;
import com.team17.chatapp.whiteboard.service.WhiteboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/whiteboard")
@RequiredArgsConstructor
public class WhiteboardController {

    private final WhiteboardService whiteboardService;
    private final UserRepository userRepository;

    @PostMapping({"", "/session"})
    public ResponseEntity<ApiResponse<WhiteboardSessionDto>> openOrCreate(
            @Valid @RequestBody WhiteboardSessionRequest request,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        WhiteboardSessionDto session = whiteboardService.getOrCreate(
                request.conversationId(), user.getId(), request.title());
        return ResponseEntity.ok(ApiResponse.success(session));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WhiteboardSessionDto>> getSession(
            @PathVariable UUID id,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(whiteboardService.get(id, user.getId())));
    }

    @PostMapping("/{id}/snapshot")
    public ResponseEntity<ApiResponse<WhiteboardSnapshotResponse>> saveSnapshot(
            @PathVariable UUID id,
            @Valid @RequestBody WhiteboardSnapshotRequest request,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        WhiteboardSnapshotResponse snapshot = whiteboardService.saveSnapshot(id, user.getId(), request.shapes());
        return ResponseEntity.ok(ApiResponse.success("Đã lưu bảng vẽ", snapshot));
    }

    @GetMapping("/{id}/snapshot")
    public ResponseEntity<ApiResponse<WhiteboardSnapshotResponse>> getLatestSnapshot(
            @PathVariable UUID id,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                whiteboardService.getLatestSnapshot(id, user.getId())));
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AppException("Chưa đăng nhập", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AppException("Người dùng không tồn tại", HttpStatus.NOT_FOUND));
    }
}
