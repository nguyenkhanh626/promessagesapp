package com.team17.chatapp.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record ChatSummaryRequest(
        @Min(value = 1, message = "Số tin nhắn phải lớn hơn 0")
        @Max(value = 100, message = "Chỉ có thể tóm tắt tối đa 100 tin nhắn")
        Integer messageLimit,
        @Size(max = 30, message = "Ngôn ngữ tối đa 30 ký tự")
        String language) {
}
