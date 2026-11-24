package com.team17.chatapp.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionEventDto {

    private UUID conversationId;
    private UUID messageId;
    private List<MessageReactionDto> reactions;
}
