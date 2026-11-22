package com.team17.chatapp.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatSummaryResponse(
        String summary,
        List<String> keyTopics,
        List<ChatSummaryActionItem> actionItems,
        int messageCount,
        LocalDateTime generatedAt) {
}
