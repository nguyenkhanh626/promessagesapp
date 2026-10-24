package com.team17.chatapp.config;

import com.team17.chatapp.websocket.interceptor.AuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AuthChannelInterceptor authChannelInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket hỗ trợ SockJS fallback cho trình duyệt
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Endpoint WebSocket thuần (native WebSocket) cho các client hiện đại
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix cho các tin nhắn từ Server broadcast tới Client (/topic/..., /queue/...)
        registry.enableSimpleBroker("/topic", "/queue");

        // Prefix cho các tin nhắn từ Client gửi lên Server (/app/ping, /app/call/...)
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix cho tin nhắn gửi riêng cho từng cá nhân (1-1 notification & WebRTC signal)
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Gắn Interceptor để chặn và xác thực Token JWT trong frame CONNECT
        registration.interceptors(authChannelInterceptor);
    }
}

