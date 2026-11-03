package com.team17.chatapp.whiteboard.entity;

import java.util.List;
import java.util.UUID;

public record WhiteboardData(
        UUID id,
        WhiteboardShapeType type,
        List<Point> points,
        String strokeColor,
        int strokeWidth,
        UUID authorId) {

    public record Point(double x, double y) {
    }
}
