# KẾ HOẠCH CHI TIẾT TUẦN 4 (SPRINT 4) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 4 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 4

- [ ] **Tiến độ chung toàn đội:** `70%` (Phân hệ của TV1 và Hội nghị Video Nhóm Mesh WebRTC của TV2 đã hoàn thành 100%)
- [x] **Mục tiêu 1:** Hệ thống User Presence (`ONLINE / BUSY / AWAY / OFFLINE`), Typing Indicator thời gian thực, Tìm kiếm tin nhắn & Danh bạ người dùng (TV1) - **ĐÃ HOÀN THÀNH 100%**
- [x] **Mục tiêu 2:** Hội nghị Video Nhóm đa người dùng (Mesh WebRTC 3-5 người), Video Grid tự co giãn & Nhận diện giọng nói VAD (TV2) - **ĐÃ HOÀN THÀNH 100%**
- [ ] **Mục tiêu 3:** Tích hợp Bot trợ lý `@AI-Assistant` trong khung chat, SSE Streaming câu trả lời & Render Markdown/Code (TV3)

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w4-tv1-presence-typing-search`  
> **Trọng tâm:** Xây dựng cơ chế quản lý và đồng bộ trạng thái hoạt động thời gian thực (User Presence), kênh thông báo đang soạn tin nhắn (Typing Indicator), trình tìm kiếm nội dung tin nhắn và danh bạ người dùng toàn hệ thống.

### 📅 Ngày 1: Thiết kế Cơ chế User Presence & DTOs Sự kiện Thời gian thực
- [x] **Sáng:** Họp Sprint Planning Tuần 4, thống nhất kênh WebSocket STOMP `/topic/presence` và `/topic/chat/{conversationId}/typing`.
- [x] **Chiều:** Tạo các DTOs phục vụ Presence và Typing:
  - [x] `PresenceEventDto.java` (Đóng gói `userId`, `email`, `displayName`, `avatarUrl`, `status: ONLINE | BUSY | AWAY | OFFLINE`, `updatedAt`).
  - [x] `UpdateStatusRequest.java` (Yêu cầu đổi trạng thái cá nhân).
  - [x] `TypingEventPayload.java` (Bản tin trạng thái đang gõ phím kèm thông tin người gõ).

### 📅 Ngày 2: Xây dựng `PresenceService` & Đồng bộ Sự kiện Kết nối WebSocket
- [x] **Sáng:** Tạo `PresenceService.java` và `PresenceServiceImpl.java`:
  - [x] Lưu trữ trạng thái người dùng kết hợp In-memory Cache (`ConcurrentHashMap<UUID, UserStatus>`) và đồng bộ xuống bảng `users` trong PostgreSQL.
  - [x] Tự động phát sóng (broadcast) bản tin `PresenceEventDto` tới `/topic/presence` mỗi khi trạng thái thay đổi.
  - [x] Xây dựng hàm `getUserDirectory()` hỗ trợ tìm kiếm danh bạ và lọc theo từng trạng thái (`ONLINE`, `BUSY`, `AWAY`, `OFFLINE`).
- [x] **Chiều:** Tích hợp `PresenceService` vào `WebSocketEventListener.java`:
  - [x] Khi người dùng kết nối STOMP (`SessionConnectedEvent`), tự động kích hoạt trạng thái `ONLINE` và broadcast cho toàn hệ thống.
  - [x] Khi người dùng đóng toàn bộ phiên kết nối (`SessionDisconnectEvent`), tự động chuyển trạng thái về `OFFLINE` và broadcast tức thì.

### 📅 Ngày 3: Kênh WebSocket Typing Indicator & Truy vấn Tìm kiếm Tin nhắn
- [x] **Sáng:** Nâng cấp `ChatWebSocketController.java` và `ConversationController.java`:
  - [x] Lắng nghe `@MessageMapping("/chat.typing")` và endpoint `POST /api/conversations/{id}/typing`.
  - [x] Phát sóng sự kiện đang soạn tin tới kênh `/topic/chat/{conversationId}/typing`.
- [x] **Chiều:** Xây dựng tính năng Tìm kiếm Tin nhắn trong `MessageRepository.java` và `ChatServiceImpl.java`:
  - [x] Query `searchMessagesInConversation()`: Tìm kiếm tin nhắn theo từ khóa (không phân biệt hoa thường) trong một cuộc hội thoại.
  - [x] Query `searchMessagesForUser()`: Tìm kiếm tin nhắn trên toàn bộ các cuộc trò chuyện mà người dùng tham gia.
  - [x] Mở các REST API: `GET /api/conversations/{id}/messages/search?q=...`, `GET /api/messages/search?q=...`, `PUT /api/users/me/status`, `GET /api/users/directory`.

### 📅 Ngày 4: Nâng cấp Hook `useChatWebSocket` & Bộ Chuyển đổi Trạng thái Cá nhân
- [x] **Sáng:** Nâng cấp `frontend/src/hooks/useChatWebSocket.ts`:
  - [x] Tự động subscribe đồng thời 3 kênh: `/topic/presence`, `/topic/chat/{id}`, và `/topic/chat/{id}/typing`.
  - [x] Phân luồng chính xác bản tin STOMP dựa theo header `destination` và cung cấp hàm `sendTypingSignal()`.
- [x] **Chiều:** Nâng cấp `ChatSidebar.tsx`:
  - [x] Xây dựng thanh chuyển đổi trạng thái cá nhân (**Đang hoạt động** xanh lá, **Đang bận** đỏ, **Tạm vắng** vàng cam, **Ngoại tuyến** xám).
  - [x] Hiển thị chấm màu trạng thái thời gian thực trên tất cả avatar hội thoại 1-1 và kết quả tìm kiếm.

### 📅 Ngày 5: Giao diện Danh bạ Người dùng (`UserDirectoryModal`)
- [x] **Sáng:** Xây dựng Component `UserDirectoryModal.tsx`:
  - [x] Hiển thị danh sách toàn bộ thành viên trong hệ thống kèm huy hiệu trạng thái trực quan.
  - [x] Bộ lọc nhanh theo 5 tab trạng thái: **Tất cả** | **Đang hoạt động** | **Đang bận** | **Tạm vắng** | **Ngoại tuyến**.
  - [x] Ô tìm kiếm đồng nghiệp theo tên hiển thị hoặc email.
  - [x] Nút **"Nhắn tin"** mở ngay khung chat 1-1 với người dùng được chọn.

### 📅 Ngày 6: Hiệu ứng Typing Indicator & Tìm kiếm Tin nhắn trong `ChatWindow`
- [x] **Sáng:** Tích hợp Typing Indicator vào `ChatWindow.tsx`:
  - [x] Tự động phát tín hiệu `typing: true` khi người dùng gõ phím và tự động ngắt `typing: false` sau 2.5 giây ngừng gõ hoặc ngay khi bấm gửi.
  - [x] Hiển thị dòng chữ động *"[Tên người dùng] đang nhập tin nhắn..."* kèm hiệu ứng 3 chấm nhảy (bouncing dots) chuẩn Microsoft Teams.
- [x] **Chiều:** Xây dựng Thanh Tìm kiếm Tin nhắn trong `ChatWindow.tsx`:
  - [x] Nút kính lúp (`Search`) trên Header mở khung tìm kiếm tin nhắn nội bộ.
  - [x] Hiển thị danh sách tin nhắn khớp từ khóa; khi bấm vào kết quả sẽ tự động cuộn mượt (`scrollIntoView`) tới đúng vị trí tin nhắn đó và làm nổi bật (highlight viền sáng).

### 📅 Ngày 7: Kiểm thử Tự động (Unit Tests) & Nghiệm thu Sprint 4
- [x] **Sáng:** Viết mới `PresenceServiceTest.java` (kiểm thử đổi trạng thái, xử lý disconnect, lọc danh bạ) và bổ sung test tìm kiếm tin nhắn vào `ChatServiceTest.java`.
- [x] **Chiều:** Chạy `./mvnw test` đạt 100% PASS và `npm run build` thành công không lỗi TypeScript.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w4-tv2-group-mesh-call`  
> **Trọng tâm:** Nâng cấp từ cuộc gọi 1-1 lên Hội nghị Video Nhóm đa người dùng (3-5 người) theo kiến trúc WebRTC Full Mesh, xây dựng Video Grid tự co giãn (Adaptive Layout + Spotlight Pin) và Nhận diện giọng nói thời gian thực (VAD).

### 📅 Ngày 1-2: Backend Mesh Signaling & Giới hạn Phòng họp Nhóm
- [x] Nâng cấp `SignalType.java` bổ sung `ROOM_FULL`, `ROOM_STATE`.
- [x] Nâng cấp `UserSessionRegistry.java`: Giới hạn tối đa 5 thành viên/phòng (`MAX_ROOM_PARTICIPANTS = 5`), cung cấp `isRoomFull()`, `getRoomsByUser()`.
- [x] Nâng cấp `SignalingController.java`:
  - [x] `/app/call/join`: Kiểm tra đầy phòng, trả về danh sách hồ sơ thành viên đang có mặt trong phòng và broadcast `USER_JOINED`.
  - [x] `/app/call/room-signal`: Chuyển tiếp trạng thái Mic/Camera (`MIC_TOGGLE`, `CAMERA_TOGGLE`) tới `/topic/call/room/{roomId}`.
- [x] Nâng cấp `WebSocketEventListener.java`: Tự động broadcast `USER_LEFT` tới các phòng gọi nếu thành viên rớt mạng hoặc đóng tab đột ngột.

### 📅 Ngày 3-4: Frontend `MeshWebRtcManager` & STOMP Room Subscription
- [x] Mở rộng `calling.ts` (`CallMode`, `GroupParticipant`) và `signalingService.ts` (`subscribeToRoom`, `unsubscribeFromRoom`, `joinRoom`, `leaveRoom`, `sendRoomSignal`).
- [x] Xây dựng `meshWebrtcManager.ts` quản lý `Map<string, RTCPeerConnection>` theo `peerId`, hỗ trợ hàng đợi ICE Candidate và `replaceTrackForAllPeers()`.
- [x] Nâng cấp `CallContext.tsx`: Hỗ trợ `joinGroupCall()`, xử lý vòng đời Mesh (người mới vào chủ động gửi `CALL_OFFER` tới thành viên cũ để tránh xung đột Offer).

### 📅 Ngày 5-6: Giao diện `GroupVideoGrid`, Nhận diện giọng nói VAD & Group Call Trigger
- [x] Xây dựng hook `useVoiceActivity.ts` dùng Web Audio API (`AnalyserNode`) phân tích cường độ âm thanh thời gian thực (debounce 650ms).
- [x] Xây dựng `GroupVideoGrid.tsx` tự co giãn lưới 1–5 người (`1x1`, `1x2`, `2x2`, `3+2`), hỗ trợ Ghim (`Pin`) chế độ Spotlight và làm nổi bật khung viền người đang nói.
- [x] Tích hợp vào `ActiveCallModal.tsx` và mở khóa nút gọi Nhóm kèm banner *"Cuộc họp đang diễn ra"* trong `ChatWindow.tsx`.

### 📅 Ngày 7: Kiểm thử Tự động & Nghiệm thu
- [x] Bổ sung Unit Test cho `handleJoinRoom`, `ROOM_FULL`, `handleLeaveRoom`, `handleRoomMediaSignal` trong `SignalingControllerTest.java`.
- [x] Chạy `./mvnw test` PASS 100% và `npm run build` thành công không lỗi TypeScript.

---

## 4. BẢNG CHECKLIST WBS TUẦN 4 (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [x] | **W4-TV1-01** | **TV1** | Dịch vụ `PresenceService` & Đồng bộ WebSocket Connect/Disconnect | 6h | Tự động cập nhật `ONLINE/OFFLINE` và broadcast qua `/topic/presence`. |
| [x] | **W4-TV1-02** | **TV1** | Kênh WebSocket STOMP Typing Indicator (`/chat.typing`) | 4h | Broadcast tức thì trạng thái đang gõ phím tới các thành viên trong phòng. |
| [x] | **W4-TV1-03** | **TV1** | API Tìm kiếm Tin nhắn & Danh bạ Người dùng | 6h | Tìm kiếm tin nhắn không phân biệt hoa thường; lọc danh bạ theo trạng thái. |
| [x] | **W4-TV1-04** | **TV1** | Bộ chọn Trạng thái (`ONLINE/BUSY/AWAY/OFFLINE`) & Chấm Avatar | 6h | Đổi trạng thái cá nhân tức thì, cập nhật màu chấm avatar realtime. |
| [x] | **W4-TV1-05** | **TV1** | Giao diện Typing Indicator & Tìm kiếm Tin nhắn trong `ChatWindow` | 8h | Hiện dòng chữ động *"đang nhập tin nhắn..."*, click kết quả tìm kiếm cuộn tới tin nhắn. |
| [x] | **W4-TV1-06** | **TV1** | Giao diện Danh bạ Người dùng (`UserDirectoryModal`) & Unit Tests | 6h | Tra cứu danh bạ mượt mà; toàn bộ Unit Tests Backend & Frontend build PASS 100%. |
| [x] | **W4-TV2-01** | **TV2** | Backend Mesh Room Signaling & Giới hạn 5 thành viên | 6h | Hỗ trợ `/call/join`, `/call/leave`, `/call/room-signal`, `ROOM_FULL`, tự dọn dẹp khi disconnect. |
| [x] | **W4-TV2-02** | **TV2** | Service `MeshWebRtcManager` & STOMP Room Subscription | 8h | Quản lý đồng thời nhiều `RTCPeerConnection` theo `peerId`, không lỗi Offer Collision. |
| [x] | **W4-TV2-03** | **TV2** | Hook Nhận diện giọng nói `useVoiceActivity` (Web Audio VAD) | 4h | Phát hiện chính xác thành viên đang phát biểu theo thời gian thực. |
| [x] | **W4-TV2-04** | **TV2** | Giao diện `GroupVideoGrid` (1-5 ô, Spotlight Pin, VAD Highlight) | 8h | Co giãn mượt mà 1–5 ô video, viền sáng khi nói, ghim phóng to người trình bày. |
| [x] | **W4-TV2-05** | **TV2** | Tích hợp Nút Gọi Nhóm & Banner Phòng họp trong `ChatWindow` | 4h | Bắt đầu hoặc tham gia cuộc họp video nhóm trực tiếp từ header cuộc hội thoại nhóm. |
| [x] | **W4-TV2-06** | **TV2** | Unit Tests Mesh Signaling & Nghiệm thu Build | 6h | Unit Tests `SignalingControllerTest` & `npm run build` PASS 100%. |
