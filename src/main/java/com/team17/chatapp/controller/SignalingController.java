package com.team17.chatapp.controller;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.calling.dto.CallHistoryDto;
import com.team17.chatapp.calling.entity.CallSession;
import com.team17.chatapp.calling.entity.CallType;
import com.team17.chatapp.calling.service.CallService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
    private final CallService callService;
    private final UserRepository userRepository;

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
     * Chuyển tiếp tín hiệu WebRTC 1-1 (Offer, Answer, ICE Candidate, Call Invite/Reject/Cancel/Timeout/End)
     * Tự động lưu và cập nhật trạng thái cuộc gọi vào Database.
     * Client gửi lên: /app/call/signal
     */
    @MessageMapping("/call/signal")
    public void handleP2PSignal(@Payload SignalMessage message, Principal principal) {
        String authUser = (principal != null) ? principal.getName() : null;
        String sender = (message.getSenderId() != null && !message.getSenderId().isBlank())
                ? message.getSenderId()
                : (authUser != null ? authUser : "Anonymous");
        message.setSenderId(sender);

        log.info("📞 [WebRTC Signal 1-1] Loại '{}' từ '{}' -> '{}' (Room: '{}')",
                message.getType(), sender, message.getReceiverId(), message.getRoomId());

        if (message.getReceiverId() == null || message.getReceiverId().isBlank()) {
            log.warn("⚠️ Không thể chuyển tiếp tín hiệu do thiếu receiverId!");
            return;
        }

        String senderDbId = resolveToUserId(sender);
        String receiverDbId = resolveToUserId(message.getReceiverId());

        String roomId = (message.getRoomId() != null && !message.getRoomId().isBlank())
                ? message.getRoomId()
                : (sender.compareTo(message.getReceiverId()) < 0 
                    ? sender + "_" + message.getReceiverId() 
                    : message.getReceiverId() + "_" + sender);
        message.setRoomId(roomId);

        // Xử lý kiểm tra người nhận có đang bận nghe máy không khi nhận lời mời CALL_INVITE
        if (message.getType() == SignalType.CALL_INVITE) {
            if (callService.isUserInCall(receiverDbId)) {
                log.warn("📴 [WebRTC Signal 1-1] Người nhận '{}' đang bận trong cuộc gọi khác!", message.getReceiverId());
                
                // Ghi nhận cuộc gọi bận vào CSDL
                callService.initiateCall(senderDbId, receiverDbId, roomId, CallType.AUDIO);
                callService.markCallBusy(roomId);

                // Gửi thông báo CALL_BUSY ngược lại cho người gọi
                SignalMessage busyMessage = SignalMessage.builder()
                        .type(SignalType.CALL_BUSY)
                        .senderId("SERVER")
                        .senderName("Hệ thống")
                        .receiverId(sender)
                        .roomId(roomId)
                        .payload(Map.of(
                                "reason", "Người nhận hiện đang trong cuộc gọi khác",
                                "busyUser", message.getReceiverId()
                        ))
                        .timestamp(Instant.now())
                        .build();

                sendSignalToUser(sender, busyMessage);
                return;
            }
        }

        // Tự động ghi nhận và đồng bộ vòng đời cuộc gọi vào Database
        if (message.getType() != null) {
            switch (message.getType()) {
                case CALL_INVITE -> callService.initiateCall(
                        senderDbId,
                        receiverDbId,
                        roomId,
                        CallType.AUDIO
                );
                case CALL_ACCEPT -> callService.acceptCall(roomId, senderDbId);
                case CALL_REJECT -> callService.rejectCall(roomId);
                case CALL_CANCEL -> callService.cancelCall(roomId);
                case CALL_TIMEOUT -> callService.timeoutCall(roomId);
                case CALL_END -> callService.endCall(roomId);
                default -> { /* Offer, Answer, ICE Candidate chỉ chuyển tiếp qua lại */ }
            }
        }

        // Chuyển tiếp tới đúng hàng đợi riêng của người nhận (cả Email lẫn UUID nếu có)
        sendSignalToUser(message.getReceiverId(), message);
    }

    /**
     * Chuyển tiếp bản tin signaling tới tất cả các định danh của user (UUID và Email)
     * Đảm bảo dù WebSocket session đăng ký theo định dạng nào cũng nhận được 100%.
     */
    private void sendSignalToUser(String targetIdentifier, SignalMessage message) {
        if (targetIdentifier == null || targetIdentifier.isBlank()) {
            return;
        }

        Set<String> destinations = new HashSet<>();
        destinations.add(targetIdentifier);

        try {
            UUID uuid = UUID.fromString(targetIdentifier);
            if (userRepository != null) {
                userRepository.findById(uuid).ifPresent(u -> {
                    if (u.getEmail() != null) destinations.add(u.getEmail());
                    destinations.add(u.getId().toString());
                });
            }
        } catch (IllegalArgumentException ignored) {
            if (userRepository != null) {
                userRepository.findByEmail(targetIdentifier.trim().toLowerCase()).ifPresent(u -> {
                    if (u.getEmail() != null) destinations.add(u.getEmail());
                    destinations.add(u.getId().toString());
                });
            }
        }

        for (String dest : destinations) {
            log.info("📡 [WebRTC Forward] Chuyển tiếp signal '{}' tới user='{}' (Room: '{}')",
                    message.getType(), dest, message.getRoomId());
            messagingTemplate.convertAndSendToUser(dest, "/queue/signals", message);
        }
    }

    /**
     * Chuẩn hóa định danh người dùng về UUID nếu là email
     */
    private String resolveToUserId(String identifier) {
        if (identifier == null || identifier.isBlank()) return identifier;
        try {
            return UUID.fromString(identifier).toString();
        } catch (IllegalArgumentException e) {
            if (userRepository != null) {
                return userRepository.findByEmail(identifier.trim().toLowerCase())
                        .map(u -> u.getId().toString())
                        .orElse(identifier);
            }
            return identifier;
        }
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
     * REST Endpoint kiểm tra phiên cuộc gọi đang hoạt động của người dùng
     */
    @ResponseBody
    @GetMapping("/api/call/active-session")
    public ResponseEntity<ApiResponse<CallSession>> getActiveSession(
            @RequestParam(required = false) String userId,
            Principal principal) {
        String queryUserId = (userId != null && !userId.isBlank()) 
                ? userId 
                : (principal != null ? principal.getName() : null);

        if (queryUserId == null) {
            return ResponseEntity.ok(ApiResponse.success(null));
        }

        Optional<CallSession> active = callService.getActiveSession(queryUserId);
        return ResponseEntity.ok(ApiResponse.success(active.orElse(null)));
    }

    /**
     * REST Endpoint kiểm tra xem người dùng có đang bận cuộc gọi không
     */
    @ResponseBody
    @GetMapping("/api/call/is-busy/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> isUserBusy(@PathVariable String userId) {
        boolean busy = callService.isUserInCall(userId);
        return ResponseEntity.ok(ApiResponse.success(busy));
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

    /**
     * REST Endpoint lấy lịch sử cuộc gọi của người dùng (Call Logs) kèm tên và ảnh đại diện
     */
    @ResponseBody
    @GetMapping("/api/call/history/{userId}")
    public ResponseEntity<ApiResponse<List<CallHistoryDto>>> getCallHistory(@PathVariable String userId) {
        List<CallSession> history = callService.getCallHistory(userId);

        Set<UUID> userUuids = new HashSet<>();
        Set<String> emails = new HashSet<>();
        for (CallSession session : history) {
            collectIdentifier(session.getInitiatorId(), userUuids, emails);
            collectIdentifier(session.getReceiverId(), userUuids, emails);
        }

        Map<String, User> userMap = new HashMap<>();
        if (userRepository != null) {
            if (!userUuids.isEmpty()) {
                userRepository.findAllById(userUuids).forEach(u -> {
                    userMap.put(u.getId().toString(), u);
                    if (u.getEmail() != null) userMap.put(u.getEmail().toLowerCase(), u);
                });
            }
            for (String email : emails) {
                if (!userMap.containsKey(email)) {
                    userRepository.findByEmail(email).ifPresent(u -> {
                        userMap.put(u.getId().toString(), u);
                        userMap.put(email, u);
                    });
                }
            }
        }

        String currentUserIdStr = resolveToUserId(userId);

        List<CallHistoryDto> dtoList = history.stream().map(session -> {
            User initiator = userMap.get(session.getInitiatorId());
            User receiver = userMap.get(session.getReceiverId());

            boolean isCaller = session.getInitiatorId().equalsIgnoreCase(userId)
                    || session.getInitiatorId().equalsIgnoreCase(currentUserIdStr);

            User otherUser = isCaller ? receiver : initiator;
            String otherId = isCaller ? session.getReceiverId() : session.getInitiatorId();

            return CallHistoryDto.builder()
                    .id(session.getId())
                    .conversationId(session.getConversationId())
                    .initiatorId(session.getInitiatorId())
                    .initiatorName(initiator != null ? initiator.getDisplayName() : session.getInitiatorId())
                    .initiatorAvatar(initiator != null ? initiator.getAvatarUrl() : null)
                    .receiverId(session.getReceiverId())
                    .receiverName(receiver != null ? receiver.getDisplayName() : session.getReceiverId())
                    .receiverAvatar(receiver != null ? receiver.getAvatarUrl() : null)
                    .otherUserId(otherId)
                    .otherUserName(otherUser != null ? otherUser.getDisplayName() : otherId)
                    .otherUserAvatar(otherUser != null ? otherUser.getAvatarUrl() : null)
                    .roomId(session.getRoomId())
                    .callType(session.getCallType())
                    .status(session.getStatus())
                    .startedAt(session.getStartedAt())
                    .endedAt(session.getEndedAt())
                    .durationSeconds(session.getDurationSeconds())
                    .createdAt(session.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtoList));
    }

    private void collectIdentifier(String id, Set<UUID> uuids, Set<String> emails) {
        if (id == null || id.isBlank()) return;
        try {
            uuids.add(UUID.fromString(id));
        } catch (IllegalArgumentException e) {
            emails.add(id.trim().toLowerCase());
        }
    }
}
