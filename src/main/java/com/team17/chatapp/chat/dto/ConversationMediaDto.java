package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationMediaDto {

    private UUID messageId;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private MessageType messageType;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private LocalDateTime createdAt;

    public static ConversationMediaDto from(Message message, String senderName, String senderAvatarUrl) {
        return ConversationMediaDto.builder()
                .messageId(message.getId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(senderName)
                .senderAvatarUrl(senderAvatarUrl)
                .messageType(message.getMessageType())
                .fileUrl(message.getFileUrl())
                .fileName(message.getFileName() != null ? message.getFileName() : message.getContent())
                .fileSize(message.getFileSize())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
