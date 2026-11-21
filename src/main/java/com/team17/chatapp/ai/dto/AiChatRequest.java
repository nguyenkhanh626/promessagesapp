package com.team17.chatapp.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AiChatRequest(
        @NotNull UUID conversationId,
        @NotBlank(message = "Câu hỏi không được để trống")
        @Size(max = 2000, message = "Câu hỏi tối đa 2000 ký tự")
        String prompt) {
}
