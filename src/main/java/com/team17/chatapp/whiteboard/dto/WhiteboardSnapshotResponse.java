package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WhiteboardSnapshotResponse(
        UUID sessionId,
        List<WhiteboardData> shapes,
        long version,
        LocalDateTime createdAt) {
}
