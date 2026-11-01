package com.team17.chatapp.calling.repository;

import com.team17.chatapp.calling.entity.CallSession;
import com.team17.chatapp.calling.entity.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {

    Optional<CallSession> findByRoomId(String roomId);

    @Query("SELECT c FROM CallSession c WHERE c.initiatorId = :userId OR c.receiverId = :userId ORDER BY c.createdAt DESC")
    List<CallSession> findCallHistoryByUserId(@Param("userId") String userId);

    List<CallSession> findByStatus(CallStatus status);

    @Query("SELECT COUNT(c) > 0 FROM CallSession c WHERE (c.initiatorId = :userId OR c.receiverId = :userId) AND c.status IN :statuses")
    boolean existsByUserIdAndStatusIn(@Param("userId") String userId, @Param("statuses") Collection<CallStatus> statuses);

    @Query("SELECT c FROM CallSession c WHERE (c.initiatorId = :userId OR c.receiverId = :userId) AND c.status IN :statuses ORDER BY c.createdAt DESC")
    List<CallSession> findActiveSessionsByUserId(@Param("userId") String userId, @Param("statuses") Collection<CallStatus> statuses);
}
