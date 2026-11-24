package com.team17.chatapp.chat.dto;

import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {

    private UUID id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatarUrl;
    private String content;
    private MessageType messageType;
    private String fileUrl;
    private String fileName;
    private Long fileSize;
    private boolean pinned;
    private UUID pinnedBy;
    private String pinnedByName;
    private LocalDateTime pinnedAt;
    private boolean important;
    private UUID replyToId;
    private ReplyPreviewDto replyTo;
    @Builder.Default
    private List<MessageReactionDto> reactions = List.of();
    private LocalDateTime createdAt;

    public static MessageDto from(Message message, String senderName, String senderAvatarUrl) {
        return from(message, senderName, senderAvatarUrl, null, null, List.of());
    }

    public static MessageDto from(
            Message message,
            String senderName,
            String senderAvatarUrl,
            String pinnedByName
    ) {
        return from(message, senderName, senderAvatarUrl, pinnedByName, null, List.of());
    }

    public static MessageDto from(
            Message message,
            String senderName,
            String senderAvatarUrl,
            String pinnedByName,
            ReplyPreviewDto replyTo,
            List<MessageReactionDto> reactions
    ) {
        return MessageDto.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(senderName)
                .senderAvatarUrl(senderAvatarUrl)
                .content(message.getContent())
                .messageType(message.getMessageType())
                .fileUrl(message.getFileUrl())
                .fileName(message.getFileName())
                .fileSize(message.getFileSize())
                .pinned(message.isPinned())
                .pinnedBy(message.getPinnedBy())
                .pinnedByName(pinnedByName)
                .pinnedAt(message.getPinnedAt())
                .important(message.isImportant())
                .replyToId(message.getReplyToId())
                .replyTo(replyTo)
                .reactions(reactions != null ? reactions : List.of())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
