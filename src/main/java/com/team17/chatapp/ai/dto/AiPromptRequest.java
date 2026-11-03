package com.team17.chatapp.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiPromptRequest(
        @NotBlank(message = "Prompt không được để trống")
        @Size(max = 4000, message = "Prompt tối đa 4000 ký tự")
        String prompt,
        @Size(max = 4000, message = "Context tối đa 4000 ký tự")
        String context) {
}
