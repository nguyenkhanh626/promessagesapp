package com.team17.chatapp.calling.repository;

import com.team17.chatapp.calling.entity.CallParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CallParticipantRepository extends JpaRepository<CallParticipant, UUID> {

    List<CallParticipant> findByCallSessionId(UUID callSessionId);

    Optional<CallParticipant> findByCallSessionIdAndUserId(UUID callSessionId, String userId);
}
