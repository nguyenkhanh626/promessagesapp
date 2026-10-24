package com.team17.chatapp.websocket.dto;

/**
 * Định nghĩa các loại bản tin tín hiệu trao đổi qua WebSocket STOMP
 * phục vụ thiết lập cuộc gọi WebRTC và kiểm tra kết nối.
 */
public enum SignalType {
    // Heartbeat / Ping-Pong kiểm tra đường truyền
    PING,
    PONG,

    // WebRTC Signaling Handshake
    CALL_INVITE,        // Người gọi gửi lời mời (ring)
    CALL_ACCEPT,        // Người nhận đồng ý cuộc gọi
    CALL_REJECT,        // Người nhận từ chối cuộc gọi
    CALL_END,           // Một trong hai bên kết thúc cuộc gọi

    CALL_OFFER,         // WebRTC SDP Offer
    CALL_ANSWER,        // WebRTC SDP Answer
    ICE_CANDIDATE,      // WebRTC ICE Candidate (trao đổi địa chỉ mạng/port)

    // Quản lý phòng họp nhóm (Mesh WebRTC)
    JOIN_ROOM,          // Thành viên vào phòng họp
    LEAVE_ROOM,         // Thành viên rời phòng họp
    USER_JOINED,        // Server broadcast thông báo có người mới vào
    USER_LEFT           // Server broadcast thông báo có người rời phòng
}
