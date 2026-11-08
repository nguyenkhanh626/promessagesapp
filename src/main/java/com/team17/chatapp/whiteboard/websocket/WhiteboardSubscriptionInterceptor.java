package com.team17.chatapp.whiteboard.websocket;

import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.whiteboard.repository.WhiteboardSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WhiteboardSubscriptionInterceptor implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic/whiteboard/";

    private final UserRepository userRepository;
    private final WhiteboardSessionRepository sessionRepository;
    private final ConversationMemberRepository memberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }

        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(TOPIC_PREFIX)) {
            return message;
        }
        String sessionId = destination.substring(TOPIC_PREFIX.length());
        try {
            UUID id = UUID.fromString(sessionId);
            String username = accessor.getUser() == null ? null : accessor.getUser().getName();
            boolean authorized = username != null
                    && userRepository.findByEmail(username)
                    .flatMap(user -> sessionRepository.findById(id)
                            .filter(session -> memberRepository.existsByConversationIdAndUserId(
                                    session.getConversationId(), user.getId())))
                    .isPresent();
            if (!authorized) {
                throw new AccessDeniedException("Không có quyền theo dõi bảng vẽ này");
            }
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("ID bảng vẽ không hợp lệ");
        }
        return message;
    }
}
