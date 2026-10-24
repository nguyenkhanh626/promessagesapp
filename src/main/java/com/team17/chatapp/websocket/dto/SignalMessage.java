package com.team17.chatapp.websocket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Cấu trúc dữ liệu chuẩn cho gói tin Signaling trao đổi giữa các Peer (WebRTC Client)
 * thông qua Spring WebSocket Message Broker.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {

    private SignalType type;

    /** ID của người gửi bản tin */
    private String senderId;

    /** Tên hiển thị của người gửi (nếu có) */
    private String senderName;

    /** ID của người nhận đích (cho cuộc gọi 1-1) */
    private String receiverId;

    /** Mã phòng họp (cho cuộc gọi nhóm đa người dùng) */
    private String roomId;

    /** Dữ liệu SDP Offer/Answer hoặc ICE Candidate (chuỗi JSON hoặc Object) */
    private Object payload;

    /** Thời điểm phát sinh bản tin */
    @Builder.Default
    private Instant timestamp = Instant.now();
}
