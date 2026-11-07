package com.team17.chatapp.chat.dto;

import jakarta.validation.constraints.NotEmpty;
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
public class AddGroupMembersRequest {

    @NotEmpty(message = "Danh sách thành viên cần thêm không được để trống")
    private List<UUID> userIds;
}
