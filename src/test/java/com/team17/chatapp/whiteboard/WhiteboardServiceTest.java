package com.team17.chatapp.whiteboard;

import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotResponse;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardSession;
import com.team17.chatapp.whiteboard.entity.WhiteboardShapeType;
import com.team17.chatapp.whiteboard.entity.WhiteboardSnapshot;
import com.team17.chatapp.whiteboard.repository.WhiteboardSessionRepository;
import com.team17.chatapp.whiteboard.repository.WhiteboardSnapshotRepository;
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
    private WhiteboardSnapshotRepository snapshotRepository;

    @Mock
    private ConversationMemberRepository memberRepository;

    private WhiteboardService whiteboardService;
    private UUID conversationId;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        whiteboardService = new WhiteboardService(
                sessionRepository, snapshotRepository, memberRepository, new ObjectMapper());
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
                "Member",
                null,
                0,
                "transparent");
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);
        when(sessionRepository.save(any(WhiteboardSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(snapshotRepository.countByWhiteboardSessionId(sessionId)).thenReturn(0L);
        when(snapshotRepository.save(any(WhiteboardSnapshot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WhiteboardSnapshotResponse result = whiteboardService.saveSnapshot(sessionId, userId, List.of(shape));

        assertEquals(List.of(shape), result.shapes());
        assertEquals(1, result.version());
        verify(sessionRepository).save(session);
        verify(snapshotRepository).save(any(WhiteboardSnapshot.class));
    }

    @Test
    void loadsLatestVersionedSnapshotForAuthorizedMember() {
        WhiteboardSession session = WhiteboardSession.builder()
                .conversationId(conversationId)
                .title("Sprint room")
                .canvasDataJson("[]")
                .build();
        session.setId(sessionId);
        WhiteboardSnapshot snapshot = WhiteboardSnapshot.builder()
                .whiteboardSessionId(sessionId)
                .snapshotData("[]")
                .version(3)
                .build();
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);
        when(snapshotRepository.findTopByWhiteboardSessionIdOrderByVersionDesc(sessionId))
                .thenReturn(Optional.of(snapshot));

        WhiteboardSnapshotResponse result = whiteboardService.getLatestSnapshot(sessionId, userId);

        assertEquals(sessionId, result.sessionId());
        assertEquals(3, result.version());
        assertTrue(result.shapes().isEmpty());
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
                UUID.randomUUID(), WhiteboardShapeType.TEXT, List.of(), "#ffffff", 4,
                userId, "Member", null, 20, "transparent");
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.existsByConversationIdAndUserId(conversationId, userId)).thenReturn(true);

        AppException exception = assertThrows(
                AppException.class,
                () -> whiteboardService.saveSnapshot(sessionId, userId, List.of(invalidShape)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }
}
