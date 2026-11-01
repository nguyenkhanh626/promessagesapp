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
}
