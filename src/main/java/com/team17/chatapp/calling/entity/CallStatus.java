package com.team17.chatapp.calling.entity;

/**
 * Trạng thái của một phiên cuộc gọi
 */
public enum CallStatus {
    RINGING,      // Đang đổ chuông chờ bắt máy
    CONNECTED,    // Đang đàm thoại
    REJECTED,     // Người nhận từ chối cuộc gọi
    CANCELLED,    // Người gọi hủy cuộc gọi trước khi bắt máy
    BUSY,         // Người nhận đang bận trong cuộc gọi khác
    MISSED,       // Cuộc gọi nhỡ (không ai trả lời / timeout)
    ENDED         // Cuộc gọi đã kết thúc bình thường
}
