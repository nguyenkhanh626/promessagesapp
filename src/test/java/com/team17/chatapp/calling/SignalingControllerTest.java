package com.team17.chatapp.calling;

import com.team17.chatapp.calling.service.CallService;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.controller.SignalingController;
import com.team17.chatapp.websocket.dto.SignalMessage;
import com.team17.chatapp.websocket.dto.SignalType;
import com.team17.chatapp.websocket.service.UserSessionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SignalingControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private UserSessionRegistry sessionRegistry;

    @Mock
    private CallService callService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SignalingController signalingController;

    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = () -> "user-sender";
    }

    @Test
    @DisplayName("Gửi PING -> Nhận về PONG có chứa thời gian và số session")
    void handlePing_Success() {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId("session-123");

        when(sessionRegistry.getTotalActiveSessions()).thenReturn(5);

        SignalMessage response = signalingController.handlePing(principal, accessor);

        assertNotNull(response);
        assertEquals(SignalType.PONG, response.getType());
        assertEquals("SERVER", response.getSenderId());
        assertEquals("user-sender", response.getReceiverId());
    }

    @Test
    @DisplayName("Gửi CALL_INVITE khi người nhận không bận -> Khởi tạo cuộc gọi và chuyển tiếp")
    void handleP2PSignal_InviteNotBusy() {
        SignalMessage inviteMsg = SignalMessage.builder()
                .type(SignalType.CALL_INVITE)
                .receiverId("user-callee")
                .roomId("room-123")
                .build();

        when(callService.isUserInCall("user-callee")).thenReturn(false);

        signalingController.handleP2PSignal(inviteMsg, principal);

        verify(callService).initiateCall(eq("user-sender"), eq("user-callee"), eq("room-123"), any());
        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(inviteMsg));
    }

    @Test
    @DisplayName("Gửi CALL_INVITE khi người nhận ĐANG BẬN -> Bắn CALL_BUSY ngược lại cho người gọi")
    void handleP2PSignal_InviteBusy() {
        SignalMessage inviteMsg = SignalMessage.builder()
                .type(SignalType.CALL_INVITE)
                .receiverId("user-callee")
                .roomId("room-123")
                .build();

        when(callService.isUserInCall("user-callee")).thenReturn(true);

        signalingController.handleP2PSignal(inviteMsg, principal);

        verify(callService).markCallBusy(eq("room-123"));

        ArgumentCaptor<SignalMessage> captor = ArgumentCaptor.forClass(SignalMessage.class);
        verify(messagingTemplate).convertAndSendToUser(eq("user-sender"), eq("/queue/signals"), captor.capture());

        SignalMessage sentBack = captor.getValue();
        assertEquals(SignalType.CALL_BUSY, sentBack.getType());
        assertEquals("SERVER", sentBack.getSenderId());

        verify(messagingTemplate, never()).convertAndSendToUser(eq("user-callee"), anyString(), any(Object.class));
    }

    @Test
    @DisplayName("Gửi CALL_ACCEPT -> Gọi acceptCall và chuyển tiếp cho người gọi")
    void handleP2PSignal_Accept() {
        SignalMessage acceptMsg = SignalMessage.builder()
                .type(SignalType.CALL_ACCEPT)
                .receiverId("user-caller")
                .roomId("room-123")
                .build();

        signalingController.handleP2PSignal(acceptMsg, principal);

        verify(callService).acceptCall(eq("room-123"), eq("user-sender"));
        verify(messagingTemplate).convertAndSendToUser(eq("user-caller"), eq("/queue/signals"), eq(acceptMsg));
    }

    @Test
    @DisplayName("Gửi CALL_CANCEL -> Gọi cancelCall và chuyển tiếp")
    void handleP2PSignal_Cancel() {
        SignalMessage cancelMsg = SignalMessage.builder()
                .type(SignalType.CALL_CANCEL)
                .receiverId("user-callee")
                .roomId("room-123")
                .build();

        signalingController.handleP2PSignal(cancelMsg, principal);

        verify(callService).cancelCall(eq("room-123"));
        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(cancelMsg));
    }

    @Test
    @DisplayName("Gửi CALL_INVITE với callType = VIDEO -> initiateCall được gọi với CallType.VIDEO")
    void handleP2PSignal_VideoInvite() {
        SignalMessage videoInviteMsg = SignalMessage.builder()
                .type(SignalType.CALL_INVITE)
                .receiverId("user-callee")
                .roomId("room-video-123")
                .callType(com.team17.chatapp.calling.entity.CallType.VIDEO)
                .build();

        when(callService.isUserInCall("user-callee")).thenReturn(false);

        signalingController.handleP2PSignal(videoInviteMsg, principal);

        verify(callService).initiateCall(
                eq("user-sender"),
                eq("user-callee"),
                eq("room-video-123"),
                eq(com.team17.chatapp.calling.entity.CallType.VIDEO)
        );
        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(videoInviteMsg));
    }

    @Test
    @DisplayName("Gửi CAMERA_TOGGLE -> Chuyển tiếp tín hiệu toggle camera sang đối phương")
    void handleP2PSignal_CameraToggle() {
        SignalMessage toggleMsg = SignalMessage.builder()
                .type(SignalType.CAMERA_TOGGLE)
                .receiverId("user-callee")
                .roomId("room-video-123")
                .payload(java.util.Map.of("enabled", false))
                .build();

        signalingController.handleP2PSignal(toggleMsg, principal);

        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(toggleMsg));
    }

    @Test
    @DisplayName("Tham gia phòng nhóm -> Gửi JOIN_ROOM cho user và broadcast USER_JOINED tới room")
    void handleJoinRoom_Success() {
        SignalMessage joinMsg = SignalMessage.builder()
                .type(SignalType.JOIN_ROOM)
                .roomId("group-room-1")
                .senderName("User A")
                .build();

        when(sessionRegistry.getRoomParticipants("group-room-1")).thenReturn(java.util.Set.of("user-existing"));
        when(sessionRegistry.isRoomFull("group-room-1")).thenReturn(false);

        signalingController.handleJoinRoom(joinMsg, principal);

        verify(sessionRegistry).joinRoom("group-room-1", "user-sender");
        verify(messagingTemplate).convertAndSendToUser(
                eq("user-sender"),
                eq("/queue/signals"),
                org.mockito.ArgumentMatchers.argThat((SignalMessage m) -> m.getType() == SignalType.JOIN_ROOM)
        );
        verify(messagingTemplate).convertAndSend(
                eq("/topic/call/room/group-room-1"),
                org.mockito.ArgumentMatchers.argThat((SignalMessage m) -> m.getType() == SignalType.USER_JOINED)
        );
    }

    @Test
    @DisplayName("Tham gia phòng đã đủ 5 người -> Trả về ROOM_FULL và không gọi joinRoom")
    void handleJoinRoom_RoomFull() {
        SignalMessage joinMsg = SignalMessage.builder()
                .type(SignalType.JOIN_ROOM)
                .roomId("group-room-full")
                .build();

        when(sessionRegistry.getRoomParticipants("group-room-full"))
                .thenReturn(java.util.Set.of("u1", "u2", "u3", "u4", "u5"));
        when(sessionRegistry.isRoomFull("group-room-full")).thenReturn(true);

        signalingController.handleJoinRoom(joinMsg, principal);

        verify(sessionRegistry, org.mockito.Mockito.never()).joinRoom(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString()
        );
        verify(messagingTemplate).convertAndSendToUser(
                eq("user-sender"),
                eq("/queue/signals"),
                org.mockito.ArgumentMatchers.argThat((SignalMessage m) -> m.getType() == SignalType.ROOM_FULL)
        );
    }

    @Test
    @DisplayName("Rời phòng họp nhóm -> Xóa khỏi registry và broadcast USER_LEFT")
    void handleLeaveRoom_Success() {
        SignalMessage leaveMsg = SignalMessage.builder()
                .type(SignalType.LEAVE_ROOM)
                .roomId("group-room-1")
                .build();

        signalingController.handleLeaveRoom(leaveMsg, principal);

        verify(sessionRegistry).leaveRoom("group-room-1", "user-sender");
        verify(messagingTemplate).convertAndSend(
                eq("/topic/call/room/group-room-1"),
                org.mockito.ArgumentMatchers.argThat((SignalMessage m) -> m.getType() == SignalType.USER_LEFT)
        );
    }

    @Test
    @DisplayName("Gửi tín hiệu Mic/Cam trong phòng nhóm -> Broadcast tới /topic/call/room/{roomId}")
    void handleRoomMediaSignal_BroadcastsToRoom() {
        SignalMessage micMsg = SignalMessage.builder()
                .type(SignalType.MIC_TOGGLE)
                .roomId("group-room-1")
                .payload(java.util.Map.of("enabled", false))
                .build();

        signalingController.handleRoomMediaSignal(micMsg, principal);

        verify(messagingTemplate).convertAndSend(eq("/topic/call/room/group-room-1"), eq(micMsg));
    }

    @Test
    @DisplayName("Gửi SCREEN_SHARE_START 1-1 -> Chuyển tiếp tín hiệu chia sẻ màn hình tới đối phương")
    void handleP2PSignal_ScreenShareStart() {
        SignalMessage shareMsg = SignalMessage.builder()
                .type(SignalType.SCREEN_SHARE_START)
                .receiverId("user-callee")
                .roomId("room-123")
                .build();

        signalingController.handleP2PSignal(shareMsg, principal);

        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(shareMsg));
    }

    @Test
    @DisplayName("Gửi SCREEN_SHARE_START & STOP trong phòng nhóm -> Cập nhật registry và broadcast")
    void handleRoomMediaSignal_ScreenShareStartAndStop() {
        SignalMessage startMsg = SignalMessage.builder()
                .type(SignalType.SCREEN_SHARE_START)
                .roomId("group-room-1")
                .build();

        signalingController.handleRoomMediaSignal(startMsg, principal);

        verify(sessionRegistry).setRoomScreenSharer("group-room-1", "user-sender");
        verify(messagingTemplate).convertAndSend(eq("/topic/call/room/group-room-1"), eq(startMsg));

        SignalMessage stopMsg = SignalMessage.builder()
                .type(SignalType.SCREEN_SHARE_STOP)
                .roomId("group-room-1")
                .build();

        signalingController.handleRoomMediaSignal(stopMsg, principal);

        verify(sessionRegistry).clearRoomScreenSharer("group-room-1", "user-sender");
        verify(messagingTemplate).convertAndSend(eq("/topic/call/room/group-room-1"), eq(stopMsg));
    }

    @Test
    @DisplayName("Tham gia phòng đang có người chia sẻ màn hình -> JOIN_ROOM chứa activeScreenSharerId")
    void handleJoinRoom_IncludesActiveScreenSharer() {
        SignalMessage joinMsg = SignalMessage.builder()
                .type(SignalType.JOIN_ROOM)
                .roomId("group-room-share")
                .build();

        when(sessionRegistry.getRoomParticipants("group-room-share")).thenReturn(java.util.Set.of("user-sharer"));
        when(sessionRegistry.isRoomFull("group-room-share")).thenReturn(false);
        when(sessionRegistry.getRoomScreenSharer("group-room-share")).thenReturn("user-sharer");

        signalingController.handleJoinRoom(joinMsg, principal);

        verify(messagingTemplate).convertAndSendToUser(
                eq("user-sender"),
                eq("/queue/signals"),
                org.mockito.ArgumentMatchers.argThat((SignalMessage m) ->
                        m.getType() == SignalType.JOIN_ROOM
                                && m.getPayload() instanceof java.util.Map<?, ?> map
                                && "user-sharer".equals(map.get("activeScreenSharerId"))
                )
        );
    }

    @Test
    @DisplayName("GET /api/call/ice-servers -> Trả về danh sách ICE Servers hợp lệ")
    void getIceServers_ReturnsDefaultOrConfiguredServers() {
        var response = signalingController.getIceServers();

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertTrue(response.getBody().getData().containsKey("iceServers"));
    }

    @Test
    @DisplayName("Gửi ICE_RESTART -> Chuyển tiếp thẳng Offer tới đối phương mà không tạo CallSession mới")
    void handleP2PSignal_IceRestart_ForwardsWithoutCreatingSession() {
        SignalMessage restartMsg = SignalMessage.builder()
                .type(SignalType.ICE_RESTART)
                .receiverId("user-callee")
                .roomId("room-123")
                .payload(java.util.Map.of("type", "offer", "sdp", "v=0..."))
                .build();

        signalingController.handleP2PSignal(restartMsg, principal);

        verify(callService, org.mockito.Mockito.never()).initiateCall(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any()
        );
        verify(messagingTemplate).convertAndSendToUser(eq("user-callee"), eq("/queue/signals"), eq(restartMsg));
    }

    @Test
    @DisplayName("GET /api/call/stats/{userId} -> Trả về thống kê cuộc gọi CallStatsDto")
    void getCallStats_ReturnsStatsDto() {
        com.team17.chatapp.calling.dto.CallStatsDto mockStats =
                com.team17.chatapp.calling.dto.CallStatsDto.builder()
                        .totalCalls(5)
                        .completedCalls(3)
                        .missedCalls(1)
                        .rejectedCalls(1)
                        .groupCalls(2)
                        .totalDurationSeconds(300)
                        .build();

        when(callService.getCallStats("user-sender")).thenReturn(mockStats);

        var response = signalingController.getCallStats("user-sender");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(5L, response.getBody().getData().getTotalCalls());
        assertEquals(2L, response.getBody().getData().getGroupCalls());
    }
}
