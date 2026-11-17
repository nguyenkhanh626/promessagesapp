package com.team17.chatapp.whiteboard;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.whiteboard.controller.WhiteboardWebSocketController;
import com.team17.chatapp.whiteboard.dto.WhiteboardCursorDto;
import com.team17.chatapp.whiteboard.dto.WhiteboardEvent;
import com.team17.chatapp.whiteboard.dto.WhiteboardShapeDto;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardShapeType;
import com.team17.chatapp.whiteboard.service.WhiteboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardWebSocketControllerTest {

    @Mock
    private WhiteboardService whiteboardService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private Authentication principal;

    private WhiteboardWebSocketController controller;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        controller = new WhiteboardWebSocketController(whiteboardService, userRepository, messagingTemplate);
        sessionId = UUID.randomUUID();
        userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("member@example.com");
        user.setDisplayName("Board member");
        when(principal.getName()).thenReturn("member@example.com");
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    void broadcastsDrawingWithAuthenticatedAuthor() {
        WhiteboardShapeDto submitted = new WhiteboardShapeDto(
                UUID.randomUUID(), WhiteboardShapeType.RECTANGLE,
                List.of(new WhiteboardData.Point(1, 2), new WhiteboardData.Point(10, 20)),
                "#5B5FC7", 4, UUID.randomUUID(), "Forged name", null, 0, "transparent");
        controller.handleDrawing(sessionId,
                new WhiteboardEvent(WhiteboardEvent.Action.DRAW, submitted, null, null, null, 0), principal);

        ArgumentCaptor<WhiteboardEvent> eventCaptor = ArgumentCaptor.forClass(WhiteboardEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/whiteboard/" + sessionId), eventCaptor.capture());
        assertEquals(userId, eventCaptor.getValue().shape().authorId());
        assertEquals("Board member", eventCaptor.getValue().shape().authorName());
        verify(whiteboardService).requireSessionMember(sessionId, userId);
    }

    @Test
    void broadcastsCursorUsingAuthenticatedIdentity() {
        WhiteboardData.Point point = new WhiteboardData.Point(7, 9);
        controller.handleCursor(sessionId, new WhiteboardCursorDto(UUID.randomUUID(), point, "Fake", "#ffffff"), principal);

        ArgumentCaptor<WhiteboardCursorDto> cursorCaptor = ArgumentCaptor.forClass(WhiteboardCursorDto.class);
        verify(messagingTemplate).convertAndSend(
                eq("/topic/whiteboard/" + sessionId + "/cursors"), cursorCaptor.capture());
        assertEquals(userId, cursorCaptor.getValue().userId());
        assertEquals("Board member", cursorCaptor.getValue().authorName());
        assertEquals(point, cursorCaptor.getValue().point());
    }

    @Test
    void broadcastsClearToAllSessionMembers() {
        controller.handleClear(sessionId, principal);

        ArgumentCaptor<WhiteboardEvent> eventCaptor = ArgumentCaptor.forClass(WhiteboardEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/whiteboard/" + sessionId), eventCaptor.capture());
        assertEquals(WhiteboardEvent.Action.CLEAR, eventCaptor.getValue().action());
        verify(whiteboardService).requireSessionMember(sessionId, userId);
    }
}
