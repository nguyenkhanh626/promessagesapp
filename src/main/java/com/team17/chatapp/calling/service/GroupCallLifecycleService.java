package com.team17.chatapp.calling.service;

import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.repository.ConversationRepository;
import com.team17.chatapp.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupCallLifecycleService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private CallService callService;

    /**
     * Lưu và phát tin nhắn hệ thống "Cuộc gọi nhóm đã kết thúc." khi thành viên cuối cùng rời phòng.
     */
    @Transactional
    public void notifyGroupCallEnded(String roomId, String lastUserId) {
        if (roomId == null || roomId.isBlank()) return;
        if (callService != null) {
            callService.recordGroupCallLeave(roomId, lastUserId, true);
        }
        try {
            UUID conversationId = UUID.fromString(roomId);
            conversationRepository.findById(conversationId).ifPresent(conversation -> {
                if (conversation.getType() != ConversationType.GROUP) return;

                UUID senderUuid;
                try {
                    senderUuid = UUID.fromString(lastUserId);
                } catch (Exception e) {
                    senderUuid = conversationId;
                }

                String endedText = "Cuộc gọi nhóm đã kết thúc.";
                Message sysMsg = Message.builder()
                        .conversationId(conversationId)
                        .senderId(senderUuid)
                        .content(endedText)
                        .messageType(MessageType.SYSTEM)
                        .build();
                sysMsg = messageRepository.save(sysMsg);

                conversation.setLastMessageContent(endedText);
                conversation.setLastMessageAt(LocalDateTime.now());
                conversationRepository.save(conversation);

                MessageDto dto = MessageDto.from(sysMsg, "Hệ thống", null);
                messagingTemplate.convertAndSend("/topic/chat/" + conversationId, dto);
                log.info("📴 [Group Call] Phòng '{}' không còn ai -> đã gửi thông báo kết thúc cuộc gọi.", roomId);
            });
        } catch (IllegalArgumentException ignored) {
            // roomId không phải UUID conversation
        }
    }
}
