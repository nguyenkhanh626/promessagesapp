package com.team17.chatapp.whiteboard;

import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardSession;
import com.team17.chatapp.whiteboard.entity.WhiteboardShapeType;
import com.team17.chatapp.whiteboard.repository.WhiteboardSessionRepository;
import com.team17.chatapp.whiteboard.service.WhiteboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhiteboardServiceTest {

    @Mock
    private WhiteboardSessionRepository sessionRepository;

    @Mock
    private ConversationMemberRepository memberRepository;

    private WhiteboardService whiteboardService;
    private UUID conversationId;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        whiteboardService = new WhiteboardService(sessionRepository, memberRepository, new ObjectMapper());
        conversationId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void createsSessionForConversationMember() {
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);
        when(sessionRepository.findByConversationId(conversationId)).thenReturn(Optional.empty());
        when(sessionRepository.save(any(WhiteboardSession.class))).thenAnswer(invocation -> {
            WhiteboardSession session = invocation.getArgument(0);
            session.setId(sessionId);
            return session;
        });

        WhiteboardSessionDto result = whiteboardService.getOrCreate(conversationId, userId, "Sprint room");

        assertEquals(sessionId, result.id());
        assertEquals(conversationId, result.conversationId());
        assertEquals("Sprint room", result.title());
        assertTrue(result.shapes().isEmpty());
    }

    @Test
    void savesSnapshotForAuthorizedMember() {
        WhiteboardSession session = WhiteboardSession.builder()
                .conversationId(conversationId)
                .title("Sprint room")
                .canvasDataJson("[]")
                .build();
        session.setId(sessionId);
        WhiteboardData shape = new WhiteboardData(
                UUID.randomUUID(),
                WhiteboardShapeType.FREEHAND,
                List.of(new WhiteboardData.Point(1, 2), new WhiteboardData.Point(3, 4)),
                "#5B5FC7",
                4,
                userId,
                null,
                0);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);
        when(sessionRepository.save(any(WhiteboardSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WhiteboardSessionDto result = whiteboardService.saveSnapshot(sessionId, userId, List.of(shape));

        assertEquals(List.of(shape), result.shapes());
        verify(sessionRepository).save(session);
    }

    @Test
    void deniesNonMemberAccess() {
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(false);

        AppException exception = assertThrows(
                AppException.class,
                () -> whiteboardService.getOrCreate(conversationId, userId, null));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
    }

    @Test
    void rejectsMalformedSnapshotShape() {
        WhiteboardSession session = WhiteboardSession.builder()
                .conversationId(conversationId)
                .title("Sprint room")
                .canvasDataJson("[]")
                .build();
        session.setId(sessionId);
        WhiteboardData invalidShape = new WhiteboardData(
                UUID.randomUUID(), WhiteboardShapeType.TEXT, List.of(), "#ffffff", 4, userId, null, 20);
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);

        AppException exception = assertThrows(
                AppException.class,
                () -> whiteboardService.saveSnapshot(sessionId, userId, List.of(invalidShape)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }
}
