package com.team17.chatapp.whiteboard.repository;

import com.team17.chatapp.whiteboard.entity.WhiteboardSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhiteboardSessionRepository extends JpaRepository<WhiteboardSession, UUID> {

    Optional<WhiteboardSession> findByConversationId(UUID conversationId);
}
