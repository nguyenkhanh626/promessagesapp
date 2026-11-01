package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String content;

    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;

    public MessageType getMessageType() {
        return messageType != null ? messageType : MessageType.TEXT;
    }
}

