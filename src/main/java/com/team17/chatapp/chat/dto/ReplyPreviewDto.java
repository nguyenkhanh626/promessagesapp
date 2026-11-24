package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReplyPreviewDto {

    private UUID id;
    private UUID senderId;
    private String senderName;
    private String content;
    private MessageType messageType;
    private String fileName;

    public static ReplyPreviewDto from(Message message, String senderName) {
        if (message == null) return null;
        return ReplyPreviewDto.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderName(senderName)
                .content(message.getContent())
                .messageType(message.getMessageType())
                .fileName(message.getFileName())
                .build();
    }
}
