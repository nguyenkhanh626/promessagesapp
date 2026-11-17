package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;

import java.util.UUID;

public record WhiteboardCursorDto(
        UUID userId,
        WhiteboardData.Point point,
        String authorName,
        String color) {
}
