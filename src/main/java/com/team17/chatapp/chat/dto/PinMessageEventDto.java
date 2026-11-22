package com.team17.chatapp.chat.dto;

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
public class PinMessageEventDto {

    private UUID conversationId;
    private UUID messageId;
    private boolean pinned;
    private UUID pinnedById;
    private String pinnedByName;
    private LocalDateTime pinnedAt;
    private MessageDto message;
}
