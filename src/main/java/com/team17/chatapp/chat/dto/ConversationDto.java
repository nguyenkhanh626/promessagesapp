package com.team17.chatapp.chat.dto;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationType;
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
public class ConversationDto {

    private UUID id;
    private String name;
    private ConversationType type;
    private String avatarUrl;
    private String lastMessageContent;
    private LocalDateTime lastMessageAt;
    private UserDto otherUser;
    private int memberCount;

    public static ConversationDto from(Conversation conversation, UserDto otherUser, int memberCount) {
        String displayName = conversation.getName();
        String displayAvatar = conversation.getAvatarUrl();

        if (conversation.getType() == ConversationType.DIRECT && otherUser != null) {
            displayName = otherUser.getDisplayName();
            displayAvatar = otherUser.getAvatarUrl();
        }

        return ConversationDto.builder()
                .id(conversation.getId())
                .name(displayName)
                .type(conversation.getType())
                .avatarUrl(displayAvatar)
                .lastMessageContent(conversation.getLastMessageContent())
                .lastMessageAt(conversation.getLastMessageAt() != null ? conversation.getLastMessageAt() : conversation.getCreatedAt())
                .otherUser(otherUser)
                .memberCount(memberCount)
                .build();
    }
}

