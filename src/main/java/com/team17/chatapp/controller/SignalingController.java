package com.team17.chatapp.controller;

import com.team17.chatapp.common.ApiResponse;
import com.team17.chatapp.websocket.dto.SignalMessage;
import com.team17.chatapp.websocket.dto.SignalType;
import com.team17.chatapp.websocket.service.UserSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

/**
 * Controller điều phối toàn bộ tín hiệu Signaling WebRTC qua WebSocket STOMP
 * Hỗ trợ cuộc gọi 1-1 và phòng họp đa người dùng (Mesh Call).
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserSessionRegistry sessionRegistry;

    /**
     * Endpoint kiểm tra kết nối hai chiều (Heartbeat Ping-Pong)
     * Client gửi lên: /app/ping
     * Client nhận lại: /user/queue/signals
     */
    @MessageMapping("/ping")
    @SendToUser("/queue/signals")
    public SignalMessage handlePing(Principal principal, SimpMessageHeaderAccessor headerAccessor) {
        String username = (principal != null) ? principal.getName() : "Anonymous";
        String sessionId = headerAccessor.getSessionId();

        log.info("💓 [WebSocket Ping] Nhận PING từ user='{}', session='{}'", username, sessionId);

        return SignalMessage.builder()
                .type(SignalType.PONG)
                .senderId("SERVER")
                .senderName("Signal Server")
                .receiverId(username)
                .payload(Map.of(
                        "message", "PONG from Spring Boot Signaling Server",
                        "activeSessions", sessionRegistry.getTotalActiveSessions(),
                        "serverTime", Instant.now().toString()
                ))
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Chuyển tiếp tín hiệu WebRTC 1-1 (Offer, Answer, ICE Candidate, Call Invite/Reject/End)
     * Client gửi lên: /app/call/signal
     */
    @MessageMapping("/call/signal")
    public void handleP2PSignal(@Payload SignalMessage message, Principal principal) {
        String sender = (principal != null) ? principal.getName() : message.getSenderId();
        message.setSenderId(sender);

        log.info("📞 [WebRTC Signal 1-1] Loại '{}' từ '{}' -> '{}'",
                message.getType(), sender, message.getReceiverId());

        if (message.getReceiverId() == null || message.getReceiverId().isBlank()) {
            log.warn("⚠️ Không thể chuyển tiếp tín hiệu do thiếu receiverId!");
            return;
        }

        // Chuyển tiếp tới đúng hàng đợi riêng của người nhận (/user/{receiverId}/queue/signals)
        messagingTemplate.convertAndSendToUser(
                message.getReceiverId(),
                "/queue/signals",
                message
        );
    }

    /**
     * Người dùng tham gia vào phòng họp nhóm (Mesh Video Call)
     * Client gửi lên: /app/call/join
     */
    @MessageMapping("/call/join")
    public void handleJoinRoom(@Payload SignalMessage message, Principal principal) {
        String userId = (principal != null) ? principal.getName() : message.getSenderId();
        String roomId = message.getRoomId();

        if (roomId == null || roomId.isBlank()) {
            log.warn("⚠️ Bỏ qua yêu cầu join do thiếu roomId!");
            return;
        }

        sessionRegistry.joinRoom(roomId, userId);

        // 1. Phản hồi cho người vừa vào danh sách những người ĐANG CÓ MẶT trong phòng
        Set<String> currentParticipants = sessionRegistry.getRoomParticipants(roomId);
        SignalMessage existingUsersMsg = SignalMessage.builder()
                .type(SignalType.JOIN_ROOM)
                .senderId("SERVER")
                .roomId(roomId)
                .receiverId(userId)
                .payload(Map.of("participants", currentParticipants))
                .build();

        messagingTemplate.convertAndSendToUser(userId, "/queue/signals", existingUsersMsg);

        // 2. Broadcast thông báo cho CÁC THÀNH VIÊN KHÁC trong phòng biết có người mới vào
        SignalMessage userJoinedBroadcast = SignalMessage.builder()
                .type(SignalType.USER_JOINED)
                .senderId(userId)
                .senderName(message.getSenderName() != null ? message.getSenderName() : userId)
                .roomId(roomId)
                .payload(Map.of("joinedUserId", userId))
                .build();

        messagingTemplate.convertAndSend("/topic/call/room/" + roomId, userJoinedBroadcast);
    }

    /**
     * Người dùng rời khỏi phòng họp nhóm
     * Client gửi lên: /app/call/leave
     */
    @MessageMapping("/call/leave")
    public void handleLeaveRoom(@Payload SignalMessage message, Principal principal) {
        String userId = (principal != null) ? principal.getName() : message.getSenderId();
        String roomId = message.getRoomId();

        if (roomId != null) {
            sessionRegistry.leaveRoom(roomId, userId);

            // Broadcast thông báo cho phòng họp người dùng đã rời đi
            SignalMessage userLeftBroadcast = SignalMessage.builder()
                    .type(SignalType.USER_LEFT)
                    .senderId(userId)
                    .roomId(roomId)
                    .payload(Map.of("leftUserId", userId))
                    .build();

            messagingTemplate.convertAndSend("/topic/call/room/" + roomId, userLeftBroadcast);
        }
    }

    /**
     * REST Endpoint kiểm tra sức khỏe và trạng thái Signaling Server
     */
    @ResponseBody
    @GetMapping("/api/call/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCallServerStatus() {
        Map<String, Object> statusData = Map.of(
                "status", "UP",
                "activeWebsocketSessions", sessionRegistry.getTotalActiveSessions(),
                "serverTime", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success(statusData));
    }

    /**
     * REST Endpoint lấy danh sách thành viên đang ở trong một phòng gọi
     */
    @ResponseBody
    @GetMapping("/api/call/rooms/{roomId}/participants")
    public ResponseEntity<ApiResponse<Set<String>>> getRoomParticipants(@PathVariable String roomId) {
        Set<String> participants = sessionRegistry.getRoomParticipants(roomId);
        return ResponseEntity.ok(ApiResponse.success(participants));
    }
}
