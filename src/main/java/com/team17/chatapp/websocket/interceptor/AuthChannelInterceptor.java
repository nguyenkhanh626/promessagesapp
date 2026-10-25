package com.team17.chatapp.websocket.interceptor;

import com.team17.chatapp.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Collections;

/**
 * Interceptor kiểm tra và xác thực JWT Token từ Header trong khung bản tin STOMP CONNECT.
 * Gán Principal người dùng vào phiên kết nối WebSocket để hỗ trợ gửi tin nhắn cá nhân (@SendToUser).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Lấy token từ Native Header (Authorization: Bearer <jwt>)
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            String username = null;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7).trim();
                log.info("🔑 [STOMP Auth] Nhận được Bearer Token trong frame CONNECT: {}",
                        token.substring(0, Math.min(token.length(), 15)) + "...");

                if (jwtTokenProvider.validateToken(token)) {
                    username = jwtTokenProvider.getUsernameFromToken(token);
                } else {
                    log.warn("❌ [STOMP Auth] Token JWT không hợp lệ hoặc đã hết hạn");
                }
            } else {
                // Hỗ trợ truyền header đơn giản "token" hoặc "user" cho môi trường test/dev PoC
                String userHeader = accessor.getFirstNativeHeader("user");
                if (userHeader != null && !userHeader.isBlank()) {
                    username = userHeader;
                    log.info("🧪 [STOMP Auth Dev Mode] Đăng nhập bằng Dev User Header: {}", username);
                }
            }

            if (username != null && !username.isBlank()) {
                Principal principal = new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());
                accessor.setUser(principal);
                log.info("✅ [STOMP Auth] Xác thực thành công Principal cho user: '{}'", username);
            } else {
                log.warn("⚠️ [STOMP Auth] Kết nối STOMP không có Authorization Header hợp lệ (sẽ coi là Guest/Anonymous)");
            }
        }

        return message;
    }
}
