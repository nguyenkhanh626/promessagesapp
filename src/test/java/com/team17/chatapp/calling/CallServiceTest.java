package com.team17.chatapp.calling;

import com.team17.chatapp.calling.entity.CallParticipant;
import com.team17.chatapp.calling.entity.CallSession;
import com.team17.chatapp.calling.entity.CallStatus;
import com.team17.chatapp.calling.entity.CallType;
import com.team17.chatapp.calling.repository.CallParticipantRepository;
import com.team17.chatapp.calling.repository.CallSessionRepository;
import com.team17.chatapp.calling.service.CallService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CallServiceTest {

    @Mock
    private CallSessionRepository callSessionRepository;

    @Mock
    private CallParticipantRepository callParticipantRepository;

    @InjectMocks
    private CallService callService;

    private String callerId;
    private String calleeId;
    private String roomId;

    @BeforeEach
    void setUp() {
        callerId = "user-123";
        calleeId = "user-456";
        roomId = "room-abc";
    }

    @Test
    @DisplayName("Khởi tạo cuộc gọi mới -> Trạng thái RINGING và lưu người gọi")
    void initiateCall_Success() {
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .callType(CallType.AUDIO)
                .status(CallStatus.RINGING)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.save(any(CallSession.class))).thenReturn(mockSession);
        when(callParticipantRepository.save(any(CallParticipant.class))).thenAnswer(i -> i.getArgument(0));

        CallSession created = callService.initiateCall(callerId, calleeId, roomId, CallType.AUDIO);

        assertNotNull(created);
        assertEquals(CallStatus.RINGING, created.getStatus());
        assertEquals(callerId, created.getInitiatorId());
        assertEquals(calleeId, created.getReceiverId());
        assertEquals(roomId, created.getRoomId());

        verify(callSessionRepository).save(any(CallSession.class));
        verify(callParticipantRepository).save(any(CallParticipant.class));
    }

    @Test
    @DisplayName("Kiểm tra người dùng đang trong cuộc gọi -> isUserInCall trả về đúng")
    void isUserInCall_Check() {
        when(callSessionRepository.existsByUserIdAndStatusIn(eq(callerId), anyCollection())).thenReturn(true);
        when(callSessionRepository.existsByUserIdAndStatusIn(eq(calleeId), anyCollection())).thenReturn(false);

        assertTrue(callService.isUserInCall(callerId));
        assertFalse(callService.isUserInCall(calleeId));
    }

    @Test
    @DisplayName("Người nhận chấp nhận cuộc gọi -> Chuyển sang CONNECTED và lưu joinedAt")
    void acceptCall_Success() {
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .status(CallStatus.RINGING)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.findByRoomId(roomId)).thenReturn(Optional.of(mockSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(i -> i.getArgument(0));
        when(callParticipantRepository.findByCallSessionIdAndUserId(eq(mockSession.getId()), eq(calleeId)))
                .thenReturn(Optional.empty());

        CallSession accepted = callService.acceptCall(roomId, calleeId);

        assertNotNull(accepted);
        assertEquals(CallStatus.CONNECTED, accepted.getStatus());
        assertNotNull(accepted.getStartedAt());
        verify(callParticipantRepository).save(any(CallParticipant.class));
    }

    @Test
    @DisplayName("Người nhận từ chối cuộc gọi -> Trạng thái REJECTED, duration = 0")
    void rejectCall_Success() {
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .status(CallStatus.RINGING)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.findByRoomId(roomId)).thenReturn(Optional.of(mockSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(i -> i.getArgument(0));
        when(callParticipantRepository.findByCallSessionId(mockSession.getId())).thenReturn(Collections.emptyList());

        CallSession rejected = callService.rejectCall(roomId);

        assertNotNull(rejected);
        assertEquals(CallStatus.REJECTED, rejected.getStatus());
        assertEquals(0L, rejected.getDurationSeconds());
        assertNotNull(rejected.getEndedAt());
    }

    @Test
    @DisplayName("Người gọi hủy cuộc gọi khi đang đổ chuông -> Trạng thái CANCELLED")
    void cancelCall_Success() {
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .status(CallStatus.RINGING)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.findByRoomId(roomId)).thenReturn(Optional.of(mockSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(i -> i.getArgument(0));
        when(callParticipantRepository.findByCallSessionId(mockSession.getId())).thenReturn(Collections.emptyList());

        CallSession cancelled = callService.cancelCall(roomId);

        assertNotNull(cancelled);
        assertEquals(CallStatus.CANCELLED, cancelled.getStatus());
        assertEquals(0L, cancelled.getDurationSeconds());
    }

    @Test
    @DisplayName("Cuộc gọi timeout không ai trả lời -> Trạng thái MISSED")
    void timeoutCall_Success() {
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .status(CallStatus.RINGING)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.findByRoomId(roomId)).thenReturn(Optional.of(mockSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(i -> i.getArgument(0));
        when(callParticipantRepository.findByCallSessionId(mockSession.getId())).thenReturn(Collections.emptyList());

        CallSession timedOut = callService.timeoutCall(roomId);

        assertNotNull(timedOut);
        assertEquals(CallStatus.MISSED, timedOut.getStatus());
        assertEquals(0L, timedOut.getDurationSeconds());
    }

    @Test
    @DisplayName("Kết thúc cuộc gọi đàm thoại -> Trạng thái ENDED và tính thời lượng giây chính xác")
    void endCall_Success() {
        LocalDateTime started = LocalDateTime.now().minusSeconds(125);
        CallSession mockSession = CallSession.builder()
                .initiatorId(callerId)
                .receiverId(calleeId)
                .roomId(roomId)
                .status(CallStatus.CONNECTED)
                .startedAt(started)
                .build();
        mockSession.setId(UUID.randomUUID());

        when(callSessionRepository.findByRoomId(roomId)).thenReturn(Optional.of(mockSession));
        when(callSessionRepository.save(any(CallSession.class))).thenAnswer(i -> i.getArgument(0));
        when(callParticipantRepository.findByCallSessionId(mockSession.getId())).thenReturn(Collections.emptyList());

        CallSession ended = callService.endCall(roomId);

        assertNotNull(ended);
        assertEquals(CallStatus.ENDED, ended.getStatus());
        assertNotNull(ended.getEndedAt());
        assertTrue(ended.getDurationSeconds() >= 125);
    }
}
