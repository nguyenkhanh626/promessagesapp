package com.team17.chatapp.calling.repository;

import com.team17.chatapp.calling.entity.CallSession;
import com.team17.chatapp.calling.entity.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {

    Optional<CallSession> findByRoomId(String roomId);

    @Query("SELECT c FROM CallSession c WHERE c.initiatorId = :userId OR c.receiverId = :userId ORDER BY c.createdAt DESC")
    List<CallSession> findCallHistoryByUserId(String userId);

    List<CallSession> findByStatus(CallStatus status);
}
