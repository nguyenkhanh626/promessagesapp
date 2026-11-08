package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;

import java.util.UUID;

public record WhiteboardEvent(
        Action action,
        WhiteboardData shape,
        UUID shapeId,
        WhiteboardData.Point point,
        double eraserSize) {

    public enum Action {
        DRAW,
        ERASE,
        CLEAR,
        UNDO,
        MOVE
    }
}
