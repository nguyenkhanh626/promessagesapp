package com.team17.chatapp.calling.entity;

import com.team17.chatapp.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity lưu trữ thành viên tham gia vào phiên cuộc gọi
 */
@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "call_participants")
public class CallParticipant extends BaseEntity {

    @Column(name = "call_session_id", nullable = false)
    private UUID callSessionId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
