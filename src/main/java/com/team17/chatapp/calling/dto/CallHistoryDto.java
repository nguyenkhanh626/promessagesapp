package com.team17.chatapp.calling.dto;

import com.team17.chatapp.calling.entity.CallStatus;
import com.team17.chatapp.calling.entity.CallType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallHistoryDto {

    private UUID id;
    private UUID conversationId;
    private String initiatorId;
    private String initiatorName;
    private String initiatorAvatar;
    private String receiverId;
    private String receiverName;
    private String receiverAvatar;
    private String otherUserId;
    private String otherUserName;
    private String otherUserAvatar;
    private String roomId;
    private CallType callType;
    private CallStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Long durationSeconds;
    private LocalDateTime createdAt;
}

