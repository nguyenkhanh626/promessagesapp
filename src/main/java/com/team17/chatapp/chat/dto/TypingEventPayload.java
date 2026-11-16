package com.team17.chatapp.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TypingEventPayload {

    private UUID conversationId;
    private UUID userId;
    private String displayName;
    private String avatarUrl;
    private boolean typing;
}
