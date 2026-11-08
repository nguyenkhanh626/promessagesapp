package com.team17.chatapp.whiteboard.entity;

import com.team17.chatapp.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "whiteboard_sessions")
public class WhiteboardSession extends BaseEntity {

    @Column(name = "conversation_id", nullable = false, unique = true)
    private UUID conversationId;

    @Column(name = "title", nullable = false, length = 150)
    @Builder.Default
    private String title = "Bảng vẽ nhóm";

    @Column(name = "canvas_data_json", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String canvasDataJson = "[]";
}
