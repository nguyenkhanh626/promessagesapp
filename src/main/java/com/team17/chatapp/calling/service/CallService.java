package com.team17.chatapp.calling.service;

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

/**
 * Service quản lý vòng đời và lưu trữ dữ liệu cuộc gọi (Audio/Video Call)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    private final CallSessionRepository callSessionRepository;
    private final CallParticipantRepository callParticipantRepository;

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
        session.setStartedAt(LocalDateTime.now());
        callSessionRepository.save(session);

        // Lưu thông tin người nhận tham gia cuộc gọi
        CallParticipant participant = CallParticipant.builder()
                .callSessionId(session.getId())
                .userId(receiverId)
                .joinedAt(LocalDateTime.now())
                .build();
        callParticipantRepository.save(participant);

        log.info("✅ [CallService] Cuộc gọi '{}' đã kết nối thành công lúc {}", session.getId(), session.getStartedAt());
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
        session.setEndedAt(LocalDateTime.now());
        session.setDurationSeconds(0L);
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

        log.info("⏹️ [CallService] Cuộc gọi '{}' đã kết thúc. Tổng thời lượng: {} giây",
                session.getId(), session.getDurationSeconds());

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
     * Lấy thông tin phiên cuộc gọi theo Room ID
     */
    @Transactional(readOnly = true)
    public Optional<CallSession> getCallByRoomId(String roomId) {
        return callSessionRepository.findByRoomId(roomId);
    }
}
