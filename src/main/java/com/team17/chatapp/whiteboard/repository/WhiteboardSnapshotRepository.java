package com.team17.chatapp.whiteboard.repository;

import com.team17.chatapp.whiteboard.entity.WhiteboardSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WhiteboardSnapshotRepository extends JpaRepository<WhiteboardSnapshot, UUID> {

    Optional<WhiteboardSnapshot> findTopByWhiteboardSessionIdOrderByVersionDesc(UUID whiteboardSessionId);

    long countByWhiteboardSessionId(UUID whiteboardSessionId);
}
