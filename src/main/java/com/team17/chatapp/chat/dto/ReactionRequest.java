package com.team17.chatapp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionRequest {

    @NotBlank(message = "Emoji không được để trống")
    @Size(max = 16, message = "Emoji không hợp lệ")
    private String emoji;
}
