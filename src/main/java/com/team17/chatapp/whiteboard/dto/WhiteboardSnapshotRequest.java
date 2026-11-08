package com.team17.chatapp.whiteboard.dto;

import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WhiteboardSnapshotRequest(
        @NotNull @Size(max = 10000) List<WhiteboardData> shapes) {
}
