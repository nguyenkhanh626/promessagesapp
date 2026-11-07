package com.team17.chatapp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGroupConversationRequest {

    @NotBlank(message = "Tên nhóm không được để trống")
    @Size(max = 150, message = "Tên nhóm không vượt quá 150 ký tự")
    private String name;

    private String avatarUrl;

    @NotEmpty(message = "Nhóm phải chọn ít nhất 1 thành viên")
    private List<UUID> memberIds;
}
