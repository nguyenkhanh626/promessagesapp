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

    public SignalType getType() {
        return type;
    }

    public void setType(SignalType type) {
        this.type = type;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(String receiverId) {
        this.receiverId = receiverId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
