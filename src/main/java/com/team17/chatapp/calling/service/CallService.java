package com.team17.chatapp.calling.service;

import com.team17.chatapp.calling.dto.CallStatsDto;
import com.team17.chatapp.calling.entity.CallParticipant;
import com.team17.chatapp.calling.entity.CallSession;
import com.team17.chatapp.calling.entity.CallStatus;
import com.team17.chatapp.calling.entity.CallType;
import com.team17.chatapp.calling.repository.CallParticipantRepository;
import com.team17.chatapp.calling.repository.CallSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service quản lý vòng đời và lưu trữ dữ liệu cuộc gọi (Audio/Video Call)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    private final CallSessionRepository callSessionRepository;
    private final CallParticipantRepository callParticipantRepository;

    private static final List<CallStatus> ACTIVE_CALL_STATUSES = List.of(CallStatus.RINGING, CallStatus.CONNECTED);

    /**
     * Kiểm tra xem người dùng có đang bận trong một cuộc gọi khác không (đang reo hoặc đang đàm thoại)
     */
    @Transactional(readOnly = true)
    public boolean isUserInCall(String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }
        return callSessionRepository.existsByUserIdAndStatusIn(userId, ACTIVE_CALL_STATUSES);
    }

    /**
     * Lấy phiên cuộc gọi đang hoạt động của người dùng (nếu có)
     */
    @Transactional(readOnly = true)
    public Optional<CallSession> getActiveSession(String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        return callSessionRepository.findActiveSessionsByUserId(userId, ACTIVE_CALL_STATUSES).stream().findFirst();
    }

    /**
     * Khởi tạo cuộc gọi mới (Trạng thái RINGING)
     */
    @Transactional
    public CallSession initiateCall(String initiatorId, String receiverId, String roomId, CallType callType) {
        String finalRoomId = (roomId != null && !roomId.isBlank()) ? roomId : UUID.randomUUID().toString();

        CallSession session = CallSession.builder()
                .initiatorId(initiatorId)
                .receiverId(receiverId)
                .roomId(finalRoomId)
                .callType(callType != null ? callType : CallType.AUDIO)
                .status(CallStatus.RINGING)
                .build();

        CallSession savedSession = callSessionRepository.save(session);

        // Thêm người khởi xướng vào danh sách thành viên tham gia
        CallParticipant initiator = CallParticipant.builder()
                .callSessionId(savedSession.getId())
                .userId(initiatorId)
                .joinedAt(LocalDateTime.now())
                .build();
        callParticipantRepository.save(initiator);

        log.info("📞 [CallService] Khởi tạo cuộc gọi '{}' từ '{}' tới '{}' (Type: {}, Room: {})",
                savedSession.getId(), initiatorId, receiverId, callType, finalRoomId);

        return savedSession;
    }

    /**
     * Người nhận chấp nhận cuộc gọi (Chuyển sang CONNECTED)
     */
    @Transactional
    public CallSession acceptCall(String roomId, String receiverId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) {
            log.warn("⚠️ Không tìm thấy CallSession với roomId: {}", roomId);
            return null;
        }

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.CONNECTED);
        LocalDateTime now = LocalDateTime.now();
        session.setStartedAt(now);
        callSessionRepository.save(session);

        // Lưu hoặc cập nhật thông tin người nhận tham gia cuộc gọi
        Optional<CallParticipant> existingParticipant = callParticipantRepository
                .findByCallSessionIdAndUserId(session.getId(), receiverId);
        if (existingParticipant.isEmpty()) {
            CallParticipant participant = CallParticipant.builder()
                    .callSessionId(session.getId())
                    .userId(receiverId)
                    .joinedAt(now)
                    .build();
            callParticipantRepository.save(participant);
        }

        log.info("✅ [CallService] Cuộc gọi '{}' (Room: '{}') đã kết nối thành công lúc {}", 
                session.getId(), roomId, session.getStartedAt());
        return session;
    }

    /**
     * Người nhận từ chối cuộc gọi
     */
    @Transactional
    public CallSession rejectCall(String roomId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) return null;

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.REJECTED);
        LocalDateTime now = LocalDateTime.now();
        session.setEndedAt(now);
        session.setDurationSeconds(0L);
        closeParticipants(session.getId(), now);

        log.info("🚫 [CallService] Cuộc gọi room '{}' đã bị từ chối", roomId);
        return callSessionRepository.save(session);
    }

    /**
     * Người gọi chủ động hủy cuộc gọi khi đang đổ chuông (chưa ai bắt máy)
     */
    @Transactional
    public CallSession cancelCall(String roomId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) return null;

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.CANCELLED);
        LocalDateTime now = LocalDateTime.now();
        session.setEndedAt(now);
        session.setDurationSeconds(0L);
        closeParticipants(session.getId(), now);

        log.info("🛑 [CallService] Người gọi đã hủy cuộc gọi room '{}'", roomId);
        return callSessionRepository.save(session);
    }

    /**
     * Cuộc gọi bị timeout do không có phản hồi sau 30-45 giây
     */
    @Transactional
    public CallSession timeoutCall(String roomId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) return null;

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.MISSED);
        LocalDateTime now = LocalDateTime.now();
        session.setEndedAt(now);
        session.setDurationSeconds(0L);
        closeParticipants(session.getId(), now);

        log.info("⌛ [CallService] Cuộc gọi room '{}' đã bị timeout (MISSED)", roomId);
        return callSessionRepository.save(session);
    }

    /**
     * Đánh dấu cuộc gọi bận (người nhận đang trong cuộc gọi khác)
     */
    @Transactional
    public CallSession markCallBusy(String roomId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) return null;

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.BUSY);
        LocalDateTime now = LocalDateTime.now();
        session.setEndedAt(now);
        session.setDurationSeconds(0L);
        closeParticipants(session.getId(), now);

        log.info("📴 [CallService] Người nhận trong room '{}' đang bận (BUSY)", roomId);
        return callSessionRepository.save(session);
    }

    /**
     * Kết thúc cuộc gọi và tính tổng thời lượng đàm thoại
     */
    @Transactional
    public CallSession endCall(String roomId) {
        Optional<CallSession> optionalSession = callSessionRepository.findByRoomId(roomId);
        if (optionalSession.isEmpty()) return null;

        CallSession session = optionalSession.get();
        session.setStatus(CallStatus.ENDED);
        LocalDateTime now = LocalDateTime.now();
        session.setEndedAt(now);

        if (session.getStartedAt() != null) {
            long duration = Duration.between(session.getStartedAt(), now).getSeconds();
            session.setDurationSeconds(Math.max(0, duration));
        } else {
            session.setDurationSeconds(0L);
        }

        closeParticipants(session.getId(), now);

        log.info("⏹️ [CallService] Cuộc gọi '{}' (Room: '{}') đã kết thúc. Tổng thời lượng: {} giây",
                session.getId(), roomId, session.getDurationSeconds());

        return callSessionRepository.save(session);
    }

    /**
     * Lấy lịch sử các cuộc gọi của người dùng
     */
    @Transactional(readOnly = true)
    public List<CallSession> getCallHistory(String userId) {
        return callSessionRepository.findCallHistoryByUserId(userId);
    }

    /**
     * Lấy lịch sử cuộc gọi có lọc theo loại (AUDIO | VIDEO | GROUP) và trạng thái (COMPLETED | MISSED | REJECTED)
     */
    @Transactional(readOnly = true)
    public List<CallSession> getCallHistoryFiltered(String userId, String typeFilter, String statusFilter) {
        List<CallSession> all = callSessionRepository.findCallHistoryByUserId(userId);
        return all.stream()
                .filter(session -> matchesTypeFilter(session, typeFilter))
                .filter(session -> matchesStatusFilter(session, statusFilter))
                .collect(Collectors.toList());
    }

    /**
     * Tổng hợp thống kê cuộc gọi của người dùng
     */
    @Transactional(readOnly = true)
    public CallStatsDto getCallStats(String userId) {
        List<CallSession> sessions = callSessionRepository.findCallHistoryByUserId(userId);
        long completed = 0;
        long missed = 0;
        long rejected = 0;
        long groupCalls = 0;
        long totalDuration = 0;

        for (CallSession s : sessions) {
            if (Boolean.TRUE.equals(s.getIsGroup())) {
                groupCalls++;
            }
            if (s.getStatus() == CallStatus.ENDED || s.getStatus() == CallStatus.CONNECTED) {
                completed++;
            } else if (s.getStatus() == CallStatus.MISSED) {
                missed++;
            } else if (s.getStatus() == CallStatus.REJECTED
                    || s.getStatus() == CallStatus.CANCELLED
                    || s.getStatus() == CallStatus.BUSY) {
                rejected++;
            }
            if (s.getDurationSeconds() != null && s.getDurationSeconds() > 0) {
                totalDuration += s.getDurationSeconds();
            }
        }

        return CallStatsDto.builder()
                .totalCalls(sessions.size())
                .completedCalls(completed)
                .missedCalls(missed)
                .rejectedCalls(rejected)
                .groupCalls(groupCalls)
                .totalDurationSeconds(totalDuration)
                .build();
    }

    /**
     * Ghi nhận thành viên tham gia cuộc gọi nhóm vào CallSession & CallParticipant
     */
    @Transactional
    public CallSession recordGroupCallJoin(String roomId, String userId, String groupName, CallType callType) {
        if (roomId == null || roomId.isBlank() || userId == null || userId.isBlank()) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now();
        CallSession session = callSessionRepository
                .findFirstByRoomIdAndStatusInOrderByCreatedAtDesc(roomId, ACTIVE_CALL_STATUSES)
                .orElseGet(() -> {
                    UUID convId = null;
                    try {
                        convId = UUID.fromString(roomId);
                    } catch (IllegalArgumentException ignored) {
                    }
                    CallSession created = CallSession.builder()
                            .conversationId(convId)
                            .initiatorId(userId)
                            .roomId(roomId)
                            .isGroup(true)
                            .groupName(groupName != null && !groupName.isBlank() ? groupName : "Cuộc họp nhóm")
                            .callType(callType != null ? callType : CallType.VIDEO)
                            .status(CallStatus.CONNECTED)
                            .startedAt(now)
                            .build();
                    return callSessionRepository.save(created);
                });

        if (callParticipantRepository.findByCallSessionIdAndUserId(session.getId(), userId).isEmpty()) {
            CallParticipant participant = CallParticipant.builder()
                    .callSessionId(session.getId())
                    .userId(userId)
                    .joinedAt(now)
                    .build();
            callParticipantRepository.save(participant);
        }

        return session;
    }

    /**
     * Ghi nhận thành viên rời cuộc gọi nhóm; chốt thời lượng nếu phòng không còn ai
     */
    @Transactional
    public CallSession recordGroupCallLeave(String roomId, String userId, boolean roomNowEmpty) {
        if (roomId == null || roomId.isBlank()) {
            return null;
        }
        Optional<CallSession> opt = callSessionRepository
                .findFirstByRoomIdAndStatusInOrderByCreatedAtDesc(roomId, ACTIVE_CALL_STATUSES);
        if (opt.isEmpty()) {
            return null;
        }

        CallSession session = opt.get();
        LocalDateTime now = LocalDateTime.now();

        if (userId != null && !userId.isBlank()) {
            callParticipantRepository.findByCallSessionIdAndUserId(session.getId(), userId)
                    .ifPresent(p -> {
                        if (p.getLeftAt() == null) {
                            p.setLeftAt(now);
                            callParticipantRepository.save(p);
                        }
                    });
        }

        if (roomNowEmpty) {
            session.setStatus(CallStatus.ENDED);
            session.setEndedAt(now);
            if (session.getStartedAt() != null) {
                long duration = Duration.between(session.getStartedAt(), now).getSeconds();
                session.setDurationSeconds(Math.max(0, duration));
            } else {
                session.setDurationSeconds(0L);
            }
            closeParticipants(session.getId(), now);
            return callSessionRepository.save(session);
        }

        return session;
    }

    @Transactional(readOnly = true)
    public int getParticipantCount(UUID callSessionId) {
        if (callSessionId == null) return 0;
        return callParticipantRepository.findByCallSessionId(callSessionId).size();
    }

    private boolean matchesTypeFilter(CallSession session, String typeFilter) {
        if (typeFilter == null || typeFilter.isBlank() || "ALL".equalsIgnoreCase(typeFilter)) {
            return true;
        }
        boolean isGroup = Boolean.TRUE.equals(session.getIsGroup());
        return switch (typeFilter.trim().toUpperCase()) {
            case "GROUP" -> isGroup;
            case "AUDIO" -> !isGroup && session.getCallType() == CallType.AUDIO;
            case "VIDEO" -> !isGroup && session.getCallType() == CallType.VIDEO;
            default -> true;
        };
    }

    private boolean matchesStatusFilter(CallSession session, String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank() || "ALL".equalsIgnoreCase(statusFilter)) {
            return true;
        }
        return switch (statusFilter.trim().toUpperCase()) {
            case "COMPLETED" -> session.getStatus() == CallStatus.ENDED || session.getStatus() == CallStatus.CONNECTED;
            case "MISSED" -> session.getStatus() == CallStatus.MISSED;
            case "REJECTED" -> session.getStatus() == CallStatus.REJECTED
                    || session.getStatus() == CallStatus.CANCELLED
                    || session.getStatus() == CallStatus.BUSY;
            default -> true;
        };
    }

    /**
     * Lấy thông tin phiên cuộc gọi theo Room ID
     */
    @Transactional(readOnly = true)
    public Optional<CallSession> getCallByRoomId(String roomId) {
        return callSessionRepository.findByRoomId(roomId);
    }

    private void closeParticipants(UUID sessionId, LocalDateTime leftTime) {
        List<CallParticipant> participants = callParticipantRepository.findByCallSessionId(sessionId);
        for (CallParticipant p : participants) {
            if (p.getLeftAt() == null) {
                p.setLeftAt(leftTime);
                callParticipantRepository.save(p);
            }
        }
    }
}
