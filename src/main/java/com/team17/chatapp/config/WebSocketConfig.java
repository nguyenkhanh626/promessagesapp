package com.team17.chatapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket hỗ trợ SockJS fallback cho trình duyệt cũ
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Endpoint WebSocket thuần (native WebSocket) cho các client hiện đại
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix cho các tin nhắn từ Server broadcast tới Client (/topic/chat/..., /topic/call/..., /queue/...)
        registry.enableSimpleBroker("/topic", "/queue");

        // Prefix cho các tin nhắn từ Client gửi lên Server (/app/chat.send, /app/call.signal, ...)
        registry.setApplicationDestinationPrefixes("/app");

        // Prefix cho tin nhắn gửi riêng cho từng cá nhân (1-1 notification)
        registry.setUserDestinationPrefix("/user");
    }
}

