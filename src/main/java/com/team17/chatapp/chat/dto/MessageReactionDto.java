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
public class MessageReactionDto {

    private String emoji;
    private int count;
    private List<UUID> userIds;
    private List<String> userNames;
}
