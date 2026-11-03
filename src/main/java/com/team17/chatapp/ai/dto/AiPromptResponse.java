package com.team17.chatapp.ai.dto;

public record AiPromptResponse(String reply, String status, Integer tokensUsed) {
}
