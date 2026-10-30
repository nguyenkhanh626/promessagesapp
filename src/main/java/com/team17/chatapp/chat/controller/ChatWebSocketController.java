package com.team17.chatapp.chat.controller;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.ChatMessagePayload;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Optional;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendMessage")
    public void handleIncomingChatMessage(@Payload ChatMessagePayload payload, Principal principal) {
        if (principal == null || principal.getName() == null) {
            log.warn("Nhận tin nhắn WebSocket nhưng Principal không hợp lệ!");
            return;
        }

        String usernameOrEmail = principal.getName();
        Optional<User> senderOpt = userRepository.findByEmail(usernameOrEmail);

        if (senderOpt.isEmpty()) {
            log.warn("Không tìm thấy người dùng gửi tin nhắn: {}", usernameOrEmail);
            return;
        }

        User sender = senderOpt.get();

        SendMessageRequest request = SendMessageRequest.builder()
                .content(payload.getContent())
                .messageType(payload.getMessageType())
                .fileUrl(payload.getFileUrl())
                .build();

        MessageDto messageDto = chatService.saveMessage(payload.getConversationId(), sender.getId(), request);

        // Broadcast thời gian thực tới topic của cuộc trò chuyện
        String destination = "/topic/chat/" + payload.getConversationId();
        messagingTemplate.convertAndSend(destination, messageDto);
        log.info("Broadcast tin nhắn mới tới topic {}: {}", destination, messageDto.getContent());
    }
}

