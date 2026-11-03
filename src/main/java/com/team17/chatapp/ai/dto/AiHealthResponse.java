package com.team17.chatapp.ai.dto;

public record AiHealthResponse(boolean healthy, String status, String model, String message) {
}
