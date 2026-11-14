package com.team17.chatapp.chat.dto;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
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
public class PresenceEventDto {

    private UUID userId;
    private String email;
    private String displayName;
    private String avatarUrl;
    private UserStatus status;
    private LocalDateTime updatedAt;

    public static PresenceEventDto from(User user) {
        return PresenceEventDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
