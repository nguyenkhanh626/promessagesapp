package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;

import java.util.List;
import java.util.UUID;

public record WhiteboardEvent(
        Action action,
        WhiteboardShapeDto shape,
        List<WhiteboardShapeDto> shapes,
        UUID shapeId,
        WhiteboardData.Point point,
        double eraserSize) {

    public enum Action {
        DRAW,
        ERASE,
        CLEAR,
        UNDO,
        RESTORE,
        MOVE
    }
}
