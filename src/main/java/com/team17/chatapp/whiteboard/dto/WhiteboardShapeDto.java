package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardShapeType;

import java.util.List;
import java.util.UUID;

public record WhiteboardShapeDto(
        UUID id,
        WhiteboardShapeType type,
        List<WhiteboardData.Point> points,
        String strokeColor,
        int strokeWidth,
        UUID authorId,
        String authorName,
        String text,
        int fontSize,
        String fillColor) {

    public WhiteboardData toData() {
        return new WhiteboardData(
                id, type, points, strokeColor, strokeWidth, authorId, authorName, text, fontSize, fillColor);
    }

    public boolean isValid() {
        return toData().isValid();
    }
}
