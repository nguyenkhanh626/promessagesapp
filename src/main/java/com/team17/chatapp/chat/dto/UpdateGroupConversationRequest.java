package com.team17.chatapp.chat.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGroupConversationRequest {

    @Size(max = 150, message = "Tên nhóm không vượt quá 150 ký tự")
    private String name;

    private String avatarUrl;
}
