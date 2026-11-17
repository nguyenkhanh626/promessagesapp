package com.team17.chatapp.whiteboard.service;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.dto.WhiteboardSnapshotResponse;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardSession;
import com.team17.chatapp.whiteboard.entity.WhiteboardSnapshot;
import com.team17.chatapp.whiteboard.repository.WhiteboardSessionRepository;
import com.team17.chatapp.whiteboard.repository.WhiteboardSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private static final TypeReference<List<WhiteboardData>> SHAPES_TYPE = new TypeReference<>() {};

    private final WhiteboardSessionRepository sessionRepository;
    private final WhiteboardSnapshotRepository snapshotRepository;
    private final ConversationMemberRepository memberRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public WhiteboardSessionDto getOrCreate(UUID conversationId, UUID userId, String title) {
        requireConversationMember(conversationId, userId);
        WhiteboardSession session = sessionRepository.findByConversationId(conversationId)
                .orElseGet(() -> sessionRepository.save(WhiteboardSession.builder()
                        .conversationId(conversationId)
                        .createdBy(userId)
                        .title(title == null || title.isBlank() ? "Bảng vẽ nhóm" : title.trim())
                        .build()));
        return toDto(session);
    }

    @Transactional(readOnly = true)
    public WhiteboardSessionDto get(UUID sessionId, UUID userId) {
        WhiteboardSession session = findAuthorizedSession(sessionId, userId);
        return toDto(session);
    }

    @Transactional
    public WhiteboardSnapshotResponse saveSnapshot(UUID sessionId, UUID userId, List<WhiteboardData> shapes) {
        WhiteboardSession session = findAuthorizedSession(sessionId, userId);
        validateShapes(shapes);
        String snapshotData = serializeShapes(shapes);
        session.setCanvasDataJson(snapshotData);
        sessionRepository.save(session);
        long version = snapshotRepository.countByWhiteboardSessionId(sessionId) + 1;
        WhiteboardSnapshot snapshot = snapshotRepository.save(WhiteboardSnapshot.builder()
                .whiteboardSessionId(sessionId)
                .snapshotData(snapshotData)
                .version(version)
                .build());
        return new WhiteboardSnapshotResponse(sessionId, shapes, version, snapshot.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public WhiteboardSnapshotResponse getLatestSnapshot(UUID sessionId, UUID userId) {
        WhiteboardSession session = findAuthorizedSession(sessionId, userId);
        return snapshotRepository.findTopByWhiteboardSessionIdOrderByVersionDesc(sessionId)
                .map(snapshot -> new WhiteboardSnapshotResponse(
                        sessionId, deserializeShapes(snapshot.getSnapshotData()), snapshot.getVersion(),
                        snapshot.getCreatedAt()))
                .orElseGet(() -> new WhiteboardSnapshotResponse(
                        sessionId, deserializeShapes(session.getCanvasDataJson()), 0, session.getUpdatedAt()));
    }

    @Transactional(readOnly = true)
    public void requireSessionMember(UUID sessionId, UUID userId) {
        findAuthorizedSession(sessionId, userId);
    }

    private WhiteboardSession findAuthorizedSession(UUID sessionId, UUID userId) {
        WhiteboardSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException("Không tìm thấy bảng vẽ", HttpStatus.NOT_FOUND));
        requireConversationMember(session.getConversationId(), userId);
        return session;
    }

    private void requireConversationMember(UUID conversationId, UUID userId) {
        if (!memberRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new AppException("Bạn không có quyền truy cập bảng vẽ này", HttpStatus.FORBIDDEN);
        }
    }

    private void validateShapes(List<WhiteboardData> shapes) {
        if (shapes == null) {
            throw new AppException("Dữ liệu bảng vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        long pointCount = shapes.stream().filter(shape -> shape != null && shape.points() != null)
                .mapToLong(shape -> shape.points().size()).sum();
        if (pointCount > 100000 || shapes.size() > 10000
                || shapes.stream().anyMatch(shape -> shape == null || !shape.isValid())) {
            throw new AppException("Dữ liệu bảng vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
        }
    }

    private String serializeShapes(List<WhiteboardData> shapes) {
        try {
            return objectMapper.writeValueAsString(shapes);
        } catch (JacksonException exception) {
            throw new AppException("Không thể lưu dữ liệu bảng vẽ", HttpStatus.BAD_REQUEST);
        }
    }

    private List<WhiteboardData> deserializeShapes(String json) {
        try {
            return objectMapper.readValue(json, SHAPES_TYPE);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Dữ liệu snapshot của bảng vẽ bị lỗi", exception);
        }
    }

    private WhiteboardSessionDto toDto(WhiteboardSession session) {
        return WhiteboardSessionDto.from(session, deserializeShapes(session.getCanvasDataJson()));
    }
}
