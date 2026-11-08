package com.team17.chatapp.whiteboard.service;

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardSessionDto;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.entity.WhiteboardSession;
import com.team17.chatapp.whiteboard.repository.WhiteboardSessionRepository;
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
    private final ConversationMemberRepository memberRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public WhiteboardSessionDto getOrCreate(UUID conversationId, UUID userId, String title) {
        requireConversationMember(conversationId, userId);
        WhiteboardSession session = sessionRepository.findByConversationId(conversationId)
                .orElseGet(() -> sessionRepository.save(WhiteboardSession.builder()
                        .conversationId(conversationId)
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
    public WhiteboardSessionDto saveSnapshot(UUID sessionId, UUID userId, List<WhiteboardData> shapes) {
        WhiteboardSession session = findAuthorizedSession(sessionId, userId);
        if (shapes == null) {
            throw new AppException("Dữ liệu bảng vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        long pointCount = shapes.stream().filter(shape -> shape != null && shape.points() != null)
                .mapToLong(shape -> shape.points().size()).sum();
        if (pointCount > 100000 || shapes.stream().anyMatch(shape -> shape == null || !shape.isValid())) {
            throw new AppException("Dữ liệu bảng vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        try {
            session.setCanvasDataJson(objectMapper.writeValueAsString(shapes));
        } catch (JacksonException exception) {
            throw new AppException("Không thể lưu dữ liệu bảng vẽ", HttpStatus.BAD_REQUEST);
        }
        return toDto(sessionRepository.save(session));
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

    private WhiteboardSessionDto toDto(WhiteboardSession session) {
        try {
            List<WhiteboardData> shapes = objectMapper.readValue(session.getCanvasDataJson(), SHAPES_TYPE);
            return WhiteboardSessionDto.from(session, shapes);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Dữ liệu snapshot của bảng vẽ bị lỗi", exception);
        }
    }
}
