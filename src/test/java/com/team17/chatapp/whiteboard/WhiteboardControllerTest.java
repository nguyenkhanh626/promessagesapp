package com.team17.chatapp.whiteboard;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.whiteboard.controller.WhiteboardController;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionRequest;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotRequest;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotResponse;
import com.team17.chatapp.whiteboard.service.WhiteboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardControllerTest {

    @Mock
    private WhiteboardService whiteboardService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private Authentication authentication;

    private WhiteboardController controller;
    private UUID userId;
    private UUID conversationId;
    private UUID sessionId;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new WhiteboardController(whiteboardService, userRepository);
        userId = UUID.randomUUID();
        conversationId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("member@example.com");
        when(authentication.getName()).thenReturn("member@example.com");
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));
    }

    @Test
    void opensOrCreatesBoardForAuthenticatedUser() {
        WhiteboardSessionDto session = new WhiteboardSessionDto(
                sessionId, conversationId, "Planning", List.of(), null, null);
        when(whiteboardService.getOrCreate(conversationId, userId, "Planning")).thenReturn(session);

        var response = controller.openOrCreate(
                new WhiteboardSessionRequest(conversationId, "Planning"), authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(session, response.getBody().getData());
        verify(whiteboardService).getOrCreate(conversationId, userId, "Planning");
    }

    @Test
    void persistsSnapshotThroughController() {
        WhiteboardSnapshotResponse snapshot = new WhiteboardSnapshotResponse(
                sessionId, List.of(), 1, null);
        when(whiteboardService.saveSnapshot(sessionId, userId, List.of())).thenReturn(snapshot);

        var response = controller.saveSnapshot(
                sessionId, new WhiteboardSnapshotRequest(List.of()), authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(snapshot, response.getBody().getData());
        verify(whiteboardService).saveSnapshot(sessionId, userId, List.of());
    }

    @Test
    void retrievesLatestSnapshotThroughController() {
        WhiteboardSnapshotResponse snapshot = new WhiteboardSnapshotResponse(
                sessionId, List.of(), 2, null);
        when(whiteboardService.getLatestSnapshot(sessionId, userId)).thenReturn(snapshot);

        var response = controller.getLatestSnapshot(sessionId, authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(snapshot, response.getBody().getData());
        verify(whiteboardService).getLatestSnapshot(sessionId, userId);
    }
}
