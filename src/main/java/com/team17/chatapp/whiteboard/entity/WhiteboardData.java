package com.team17.chatapp.whiteboard.entity;

import java.util.List;
import java.util.UUID;

public record WhiteboardData(
        UUID id,
        WhiteboardShapeType type,
        List<Point> points,
        String strokeColor,
        int strokeWidth,
        UUID authorId,
        String text,
        int fontSize) {

    public record Point(double x, double y) {
        public boolean isValid() {
            return Double.isFinite(x) && Double.isFinite(y)
                    && Math.abs(x) <= 100000 && Math.abs(y) <= 100000;
        }
    }

    public boolean isValid() {
        return id != null
                && type != null
                && points != null
                && points.size() <= 20000
                && points.stream().allMatch(point -> point != null && point.isValid())
                && strokeColor != null
                && strokeColor.matches("#[0-9a-fA-F]{6}")
                && strokeWidth >= 1 && strokeWidth <= 100
                && fontSize >= 0 && fontSize <= 100
                && (text == null || text.length() <= 5000)
                && (type != WhiteboardShapeType.TEXT || (text != null && !text.isBlank()));
    }
}
