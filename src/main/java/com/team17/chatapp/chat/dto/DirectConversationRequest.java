package com.team17.chatapp.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DirectConversationRequest {

    @NotNull(message = "Mã người nhận không được để trống")
    private UUID targetUserId;
}

