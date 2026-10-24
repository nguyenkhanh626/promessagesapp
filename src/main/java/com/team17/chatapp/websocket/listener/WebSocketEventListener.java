package com.team17.chatapp.websocket.listener;

import com.team17.chatapp.websocket.service.UserSessionRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;

/**
 * Lắng nghe và xử lý các sự kiện vòng đời kết nối WebSocket STOMP
 * (Connect, Disconnect, Subscribe)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserSessionRegistry sessionRegistry;

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

        String userId = sessionRegistry.unregisterSession(sessionId);

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
