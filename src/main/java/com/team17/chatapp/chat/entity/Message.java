package com.team17.chatapp.chat.entity;

import com.team17.chatapp.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "messages")
public class Message extends BaseEntity {

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    @Builder.Default
    private MessageType messageType = MessageType.TEXT;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "is_pinned", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean pinned = false;

    @Column(name = "pinned_by")
    private UUID pinnedBy;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(name = "is_important", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean important = false;

    @Column(name = "reply_to_id")
    private UUID replyToId;
}
