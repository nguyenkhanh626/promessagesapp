package com.team17.chatapp.whiteboard.controller;

import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.whiteboard.dto.WhiteboardEvent;
import com.team17.chatapp.whiteboard.entity.WhiteboardData;
import com.team17.chatapp.whiteboard.service.WhiteboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WhiteboardWebSocketController {

    private final WhiteboardService whiteboardService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/whiteboard/{sessionId}/draw")
    public void handleDrawing(
            @DestinationVariable UUID sessionId,
            @Payload WhiteboardEvent event,
            Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new AppException("Cần đăng nhập để vẽ trên bảng", HttpStatus.UNAUTHORIZED);
        }
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new AppException("Người dùng không tồn tại", HttpStatus.UNAUTHORIZED));
        whiteboardService.requireSessionMember(sessionId, user.getId());
        validateEvent(event);

        WhiteboardEvent trustedEvent = event;
        if (event.action() == WhiteboardEvent.Action.DRAW) {
            var shape = event.shape();
            trustedEvent = new WhiteboardEvent(
                    event.action(),
                    new WhiteboardData(
                            shape.id(), shape.type(), shape.points(), shape.strokeColor(), shape.strokeWidth(),
                            user.getId(), shape.text(), shape.fontSize()),
                    event.shapeId(),
                    event.point(),
                    event.eraserSize());
        }
        messagingTemplate.convertAndSend("/topic/whiteboard/" + sessionId, trustedEvent);
    }

    private void validateEvent(WhiteboardEvent event) {
        if (event == null || event.action() == null) {
            throw new AppException("Sự kiện bảng vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        switch (event.action()) {
            case DRAW -> {
                if (event.shape() == null || !event.shape().isValid()) {
                    throw new AppException("Nét vẽ không hợp lệ", HttpStatus.BAD_REQUEST);
                }
            }
            case ERASE -> {
                if (event.point() == null || !event.point().isValid()
                        || !Double.isFinite(event.eraserSize())
                        || event.eraserSize() < 1 || event.eraserSize() > 200) {
                    throw new AppException("Thao tác tẩy không hợp lệ", HttpStatus.BAD_REQUEST);
                }
            }
            case UNDO -> {
                if (event.shapeId() == null) {
                    throw new AppException("Không tìm thấy nét cần hoàn tác", HttpStatus.BAD_REQUEST);
                }
            }
            case MOVE -> {
                if (event.shapeId() == null || event.point() == null || !event.point().isValid()) {
                    throw new AppException("Vị trí văn bản không hợp lệ", HttpStatus.BAD_REQUEST);
                }
            }
            case CLEAR -> {
            }
        }
    }
}
