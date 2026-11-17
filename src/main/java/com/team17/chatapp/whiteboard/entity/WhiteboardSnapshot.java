package com.team17.chatapp.whiteboard.entity;

import com.team17.chatapp.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(name = "whiteboard_snapshots", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"whiteboard_session_id", "version"})
})
public class WhiteboardSnapshot extends BaseEntity {

    @Column(name = "whiteboard_session_id", nullable = false)
    private UUID whiteboardSessionId;

    @Column(name = "snapshot_data", nullable = false, columnDefinition = "TEXT")
    private String snapshotData;

    @Column(name = "version", nullable = false)
    private long version;
}
