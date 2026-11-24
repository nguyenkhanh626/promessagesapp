package com.team17.chatapp.chat.entity;

import com.team17.chatapp.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "message_reactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_message_reaction_user_emoji",
                columnNames = {"message_id", "user_id", "emoji"}
        )
)
public class MessageReaction extends BaseEntity {

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "emoji", nullable = false, length = 16)
    private String emoji;
}
