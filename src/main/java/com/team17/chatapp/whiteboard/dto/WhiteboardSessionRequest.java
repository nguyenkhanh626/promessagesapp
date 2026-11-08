package com.team17.chatapp.whiteboard.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record WhiteboardSessionRequest(
        @NotNull UUID conversationId,
        @Size(max = 150) String title) {
}
