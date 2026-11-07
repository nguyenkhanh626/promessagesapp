package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.MessageType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessagePayload {

    @NotNull(message = "Mã cuộc hội thoại không được để trống")
    private UUID conversationId;

    private String content;

    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    private String fileUrl;

    private String fileName;

    private Long fileSize;
}
