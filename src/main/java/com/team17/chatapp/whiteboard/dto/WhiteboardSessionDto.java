package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardSession;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WhiteboardSessionDto(
        UUID id,
        UUID conversationId,
        String title,
        List<WhiteboardData> shapes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static WhiteboardSessionDto from(WhiteboardSession session, List<WhiteboardData> shapes) {
        return new WhiteboardSessionDto(
                session.getId(),
                session.getConversationId(),
                session.getTitle(),
                shapes,
                session.getCreatedAt(),
                session.getUpdatedAt());
    }
}
