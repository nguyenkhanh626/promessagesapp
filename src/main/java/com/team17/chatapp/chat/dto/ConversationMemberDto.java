package com.team17.chatapp.chat.dto;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.MemberRole;
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
public class ConversationMemberDto {

    private UUID id;
    private UUID userId;
    private String displayName;
    private String email;
    private String avatarUrl;
    private UserStatus status;
    private MemberRole role;
    private LocalDateTime joinedAt;

    public static ConversationMemberDto from(ConversationMember member, User user) {
        return ConversationMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .displayName(user != null ? user.getDisplayName() : "Thành viên")
                .email(user != null ? user.getEmail() : "")
                .avatarUrl(user != null ? user.getAvatarUrl() : null)
                .status(user != null ? user.getStatus() : UserStatus.OFFLINE)
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
