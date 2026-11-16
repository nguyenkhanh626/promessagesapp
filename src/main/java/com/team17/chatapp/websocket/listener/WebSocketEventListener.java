package com.team17.chatapp.websocket.listener;

import com.team17.chatapp.calling.service.GroupCallLifecycleService;
import com.team17.chatapp.chat.service.PresenceService;
import com.team17.chatapp.websocket.dto.SignalMessage;
import com.team17.chatapp.websocket.dto.SignalType;
import com.team17.chatapp.websocket.service.UserSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;

/**
 * Lắng nghe và xử lý các sự kiện vòng đời kết nối WebSocket STOMP
 * (Connect, Disconnect, Subscribe) và đồng bộ trạng thái Presence
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserSessionRegistry sessionRegistry;
    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private GroupCallLifecycleService groupCallLifecycleService;

    /**
     * Sự kiện khi Client thiết lập kết nối STOMP thành công
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal user = headerAccessor.getUser();

        String username = (user != null) ? user.getName() : "Anonymous-" + sessionId;

        sessionRegistry.registerSession(sessionId, username);
        presenceService.handleUserConnected(username);

        log.info("🟢 [WebSocket CONNECT] Phiên mới kết nối thành công: sessionId='{}', user='{}' | Tổng sessions: {}",
                sessionId, username, sessionRegistry.getTotalActiveSessions());
    }

    /**
     * Sự kiện khi Client ngắt kết nối WebSocket (Đóng tab, mất mạng, logout)
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        String mappedUserId = sessionRegistry.getUserId(sessionId);
        Set<String> activeRooms = (mappedUserId != null)
                ? sessionRegistry.getRoomsByUser(mappedUserId)
                : Collections.emptySet();

        String userId = sessionRegistry.unregisterSession(sessionId);
        if (userId != null && !sessionRegistry.isUserOnline(userId)) {
            presenceService.handleUserDisconnected(userId);
            for (String roomId : activeRooms) {
                SignalMessage userLeftBroadcast = SignalMessage.builder()
                        .type(SignalType.USER_LEFT)
                        .senderId(userId)
                        .roomId(roomId)
                        .payload(Map.of("leftUserId", userId))
                        .timestamp(Instant.now())
                        .build();
                messagingTemplate.convertAndSend("/topic/call/room/" + roomId, userLeftBroadcast);
                log.info("📡 [WebSocket DISCONNECT] Đã thông báo USER_LEFT cho phòng '{}' khi '{}' mất kết nối.", roomId, userId);

                if (sessionRegistry.getRoomParticipantCount(roomId) == 0 && groupCallLifecycleService != null) {
                    groupCallLifecycleService.notifyGroupCallEnded(roomId, userId);
                }
            }
        }

        log.info("🔴 [WebSocket DISCONNECT] Phiên đã ngắt kết nối: sessionId='{}', user='{}' | Còn lại: {} sessions",
                sessionId, (userId != null ? userId : "Unknown"), sessionRegistry.getTotalActiveSessions());
    }

    /**
     * Sự kiện khi Client đăng ký (subscribe) vào một kênh
     */
    @EventListener
    public void handleSessionSubscribeEvent(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String destination = headerAccessor.getDestination();
        Principal user = headerAccessor.getUser();

        String username = (user != null) ? user.getName() : "Anonymous";
        log.debug("📡 [WebSocket SUBSCRIBE] User '{}' (session: '{}') đã subscribe vào kênh: '{}'",
                username, sessionId, destination);
    }
}
