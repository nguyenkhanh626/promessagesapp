package com.team17.chatapp.chat.dto;

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
public class SendMessageRequest {

    private String content;

    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;

    private String fileName;

    private Long fileSize;

    @Builder.Default
    private boolean important = false;

    private UUID replyToId;

    public MessageType getMessageType() {
        return messageType != null ? messageType : MessageType.TEXT;
    }
}
