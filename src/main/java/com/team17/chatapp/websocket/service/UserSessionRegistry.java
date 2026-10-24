package com.team17.chatapp.websocket.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Quản lý các phiên kết nối WebSocket (In-memory Session Registry)
 * Theo dõi trạng thái Online/Offline của người dùng và các phòng gọi đang hoạt động.
 */
@Slf4j
@Service
public class UserSessionRegistry {

    // sessionId -> userId
    private final ConcurrentHashMap<String, String> sessionToUserMap = new ConcurrentHashMap<>();

    // userId -> Set<sessionId> (Một tài khoản có thể đăng nhập trên nhiều tab/thiết bị)
    private final ConcurrentHashMap<String, Set<String>> userToSessionsMap = new ConcurrentHashMap<>();

    // roomId -> Set<userId> (Danh sách người tham gia trong từng phòng gọi)
    private final ConcurrentHashMap<String, Set<String>> roomParticipantsMap = new ConcurrentHashMap<>();

    /**
     * Đăng ký một phiên kết nối mới
     */
    public void registerSession(String sessionId, String userId) {
        if (sessionId == null || userId == null) {
            return;
        }

        sessionToUserMap.put(sessionId, userId);
        userToSessionsMap.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(sessionId);

        log.info("[SessionRegistry] Đã liên kết Session '{}' với User '{}'. Tổng session của user: {}",
                sessionId, userId, userToSessionsMap.get(userId).size());
    }

    /**
     * Hủy đăng ký phiên kết nối khi người dùng ngắt kết nối
     * @return userId tương ứng nếu tìm thấy
     */
    public String unregisterSession(String sessionId) {
        if (sessionId == null) {
            return null;
        }

        String userId = sessionToUserMap.remove(sessionId);
        if (userId != null) {
            Set<String> sessions = userToSessionsMap.get(userId);
            if (sessions != null) {
                sessions.remove(sessionId);
                if (sessions.isEmpty()) {
                    userToSessionsMap.remove(userId);
                    // Rời khỏi các phòng gọi nếu user không còn phiên kết nối nào
                    removeUserFromAllRooms(userId);
                    log.info("[SessionRegistry] User '{}' đã ngắt toàn bộ phiên kết nối (OFFLINE).", userId);
                } else {
                    log.info("[SessionRegistry] User '{}' đã đóng 1 session. Còn lại {} session active.",
                            userId, sessions.size());
                }
            }
        }
        return userId;
    }

    /**
     * Lấy userId từ sessionId
     */
    public String getUserId(String sessionId) {
        return sessionToUserMap.get(sessionId);
    }

    /**
     * Lấy tất cả sessionIds của một user
     */
    public Set<String> getSessionsForUser(String userId) {
        return userToSessionsMap.getOrDefault(userId, Collections.emptySet());
    }

    /**
     * Kiểm tra user có đang online không
     */
    public boolean isUserOnline(String userId) {
        Set<String> sessions = userToSessionsMap.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    /**
     * Thêm user vào phòng gọi
     */
    public void joinRoom(String roomId, String userId) {
        if (roomId == null || userId == null) return;
        roomParticipantsMap.computeIfAbsent(roomId, k -> new CopyOnWriteArraySet<>()).add(userId);
        log.info("[SessionRegistry] User '{}' đã vào phòng gọi '{}'. Tổng thành viên: {}",
                userId, roomId, roomParticipantsMap.get(roomId).size());
    }

    /**
     * Xóa user khỏi phòng gọi
     */
    public void leaveRoom(String roomId, String userId) {
        if (roomId == null || userId == null) return;
        Set<String> participants = roomParticipantsMap.get(roomId);
        if (participants != null) {
            participants.remove(userId);
            if (participants.isEmpty()) {
                roomParticipantsMap.remove(roomId);
                log.info("[SessionRegistry] Phòng gọi '{}' đã đóng do không còn thành viên.", roomId);
            } else {
                log.info("[SessionRegistry] User '{}' đã rời phòng gọi '{}'. Còn lại {} thành viên.",
                        userId, roomId, participants.size());
            }
        }
    }

    /**
     * Lấy danh sách thành viên trong phòng gọi
     */
    public Set<String> getRoomParticipants(String roomId) {
        return roomParticipantsMap.getOrDefault(roomId, Collections.emptySet());
    }

    /**
     * Xóa user khỏi mọi phòng khi disconnect
     */
    private void removeUserFromAllRooms(String userId) {
        roomParticipantsMap.forEach((roomId, participants) -> {
            if (participants.remove(userId)) {
                log.info("[SessionRegistry] Đã tự động dọn dẹp User '{}' khỏi phòng '{}' do mất kết nối.", userId, roomId);
                if (participants.isEmpty()) {
                    roomParticipantsMap.remove(roomId);
                }
            }
        });
    }

    /**
     * Lấy tổng số kết nối active trên toàn hệ thống
     */
    public int getTotalActiveSessions() {
        return sessionToUserMap.size();
    }
}
