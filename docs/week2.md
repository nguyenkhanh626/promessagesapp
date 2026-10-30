# KẾ HOẠCH CHI TIẾT TUẦN 2 (SPRINT 2) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 2 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 2

- [x] **Tiến độ chung toàn đội:** `40%` (Phân hệ Nhắn tin 1-1 hoàn thành 100%, Phân hệ Calling & Whiteboard đang tiến hành)
- [x] **Mục tiêu 1:** Hệ thống Nhắn tin thời gian thực 1-1 (Direct Chat) hoàn chỉnh từ Backend đến Frontend (TV1) - ĐÃ HOÀN THÀNH
- [ ] **Mục tiêu 2:** Thực hiện cuộc gọi thoại 1-1 WebRTC Audio P2P qua STOMP Signaling (TV2)
- [ ] **Mục tiêu 3:** Studio Bảng vẽ Canvas cơ bản và kênh đồng bộ nét vẽ WebSocket (TV3)

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w2-tv1-realtime-chat-1-1`  
> **Trọng tâm:** Xây dựng hệ thống nhắn tin 1-1 thời gian thực, lưu trữ lịch sử tin nhắn, kênh WebSocket STOMP và giao diện Chat Teams hoàn chỉnh.

### 📅 Ngày 1: Thiết kế Cơ sở dữ liệu Chat & Entity
- [x] **Sáng:** Tham gia họp Kick-off Sprint 2, chốt cấu trúc tin nhắn và giao thức `/topic/chat/{conversationId}`.
- [x] **Chiều:** Tạo Entity `Conversation.java` (id, name, type: `DIRECT | GROUP`, avatarUrl, lastMessageContent, lastMessageAt).
- [x] **Chiều:** Tạo Entity `ConversationMember.java` (conversationId, userId, role: `ADMIN | MEMBER`, joinedAt).
- [x] **Chiều:** Tạo Entity `Message.java` (conversationId, senderId, content, messageType: `TEXT | IMAGE | FILE | SYSTEM`, fileUrl).
- [x] **Chiều:** Tạo các Enum: `ConversationType.java`, `MessageType.java`, `MemberRole.java`.

### 📅 Ngày 2: Xây dựng Repositories & DTOs
- [x] **Sáng:** Tạo `ConversationRepository.java` với truy vấn lấy danh sách hội thoại theo `userId` và tìm direct chat giữa 2 user.
- [x] **Sáng:** Tạo `ConversationMemberRepository.java` kiểm tra thành viên và quyền hạn trong cuộc hội thoại.
- [x] **Sáng:** Tạo `MessageRepository.java` lấy lịch sử tin nhắn hỗ trợ phân trang (Pagination).
- [x] **Chiều:** Tạo các DTOs:
  - [x] `DirectConversationRequest.java` (Mở/tạo chat 1-1).
  - [x] `SendMessageRequest.java` (Gửi tin nhắn kèm validate nội dung).
  - [x] `MessageDto.java` (Đóng gói thông tin tin nhắn kèm tên và avatar người gửi).
  - [x] `ConversationDto.java` (Đóng gói thông tin hội thoại và đối phương).
  - [x] `ChatMessagePayload.java` (Khung bản tin truyền qua WebSocket).

### 📅 Ngày 3: Tầng Nghiệp vụ Service & REST APIs
- [x] **Sáng:** Xây dựng `ChatService.java` và `ChatServiceImpl.java`:
  - [x] `getUserConversations()`: Lấy danh sách cuộc trò chuyện kèm đối tác và tin nhắn cuối.
  - [x] `getOrCreateDirectConversation()`: Kiểm tra hoặc tự động tạo mới phòng chat 1-1 giữa 2 người.
  - [x] `getConversationMessages()` & `getAllMessagesAsc()`: Lấy lịch sử hội thoại.
  - [x] `saveMessage()`: Lưu tin nhắn và tự động cập nhật `lastMessageContent` cho phòng chat.
  - [x] `searchUsers()`: Tìm kiếm người dùng để bắt đầu nhắn tin mới.
- [x] **Chiều:** Tạo `ConversationController.java`:
  - [x] `GET /api/conversations`: Danh sách các cuộc trò chuyện.
  - [x] `POST /api/conversations/direct`: Mở phòng chat 1-1.
  - [x] `GET /api/conversations/{id}`: Chi tiết phòng chat.
  - [x] `GET /api/conversations/{id}/messages`: Lịch sử tin nhắn.
  - [x] `POST /api/conversations/{id}/messages`: Gửi tin nhắn qua REST API.
  - [x] `GET /api/users/search?q=...`: Tìm kiếm người dùng.

### 📅 Ngày 4: Kênh WebSocket STOMP Chat Thời gian thực
- [x] **Sáng:** Tạo `ChatWebSocketController.java` lắng nghe `@MessageMapping("/chat.sendMessage")`.
- [x] **Sáng:** Trích xuất Principal người dùng từ kết nối WebSocket STOMP.
- [x] **Chiều:** Lưu tin nhắn vào CSDL và broadcast tức thì tới `/topic/chat/{conversationId}` bằng `SimpMessagingTemplate`.
- [x] **Chiều:** Tích hợp đồng bộ broadcast cho cả hai kênh REST và WebSocket.

### 📅 Ngày 5: Frontend Chat Sidebar & Tìm kiếm người dùng
- [x] **Sáng:** Tạo `frontend/src/types/chat.ts` định nghĩa kiểu dữ liệu `Message`, `Conversation`.
- [x] **Sáng:** Tạo `frontend/src/services/chatService.ts` kết nối REST API.
- [x] **Chiều:** Xây dựng Component `ChatSidebar.tsx`:
  - [x] Danh sách các cuộc trò chuyện gần đây, hiển thị avatar và tin nhắn cuối.
  - [x] Chấm trạng thái Online/Offline theo thời gian thực.
  - [x] Nút "Bắt đầu cuộc trò chuyện mới" mở ô tìm kiếm người dùng.
  - [x] Bấm vào người dùng để khởi tạo chat 1-1 tức thì.

### 📅 Ngày 6: Khung Chat Chính (ChatWindow) & Đồng bộ WebSocket
- [x] **Sáng:** Xây dựng Component `ChatWindow.tsx`:
  - [x] Header phòng chat hiển thị tên, avatar và trạng thái người đang trò chuyện.
  - [x] Nút gọi thoại và gọi video (chuẩn bị kết nối với TV2).
  - [x] Bong bóng tin nhắn bên phải (của tôi) và bên trái (đối phương) chuẩn Teams.
  - [x] Tự động cuộn xuống đáy khi có tin nhắn mới (Smooth Auto-scroll).
  - [x] Ô nhập tin nhắn hỗ trợ gõ Enter để gửi.
- [x] **Chiều:** Xây dựng Hook `useChatWebSocket.ts`:
  - [x] Tự động subscribe kênh STOMP `/topic/chat/{conversationId}`.
  - [x] Nhận tin nhắn mới tức thì không cần tải lại trang.
- [x] **Chiều:** Hoàn thiện `ChatPage.tsx` và nhúng vào `App.tsx` thay thế placeholder cũ.

### 📅 Ngày 7: Unit Tests, Tinh chỉnh & Nghiệm thu
- [x] **Sáng:** Viết Unit Test `ChatServiceTest.java` (test tạo chat 1-1, lưu tin nhắn, lấy danh sách).
- [x] **Sáng:** Chạy `./mvnw test` đạt 100% PASS.
- [x] **Chiều:** Sẵn sàng nghiệm thu Sprint 2 cho phân hệ Nhắn tin 1-1.

---

## 3. BẢNG CHECKLIST WBS THEO ĐẦU VIỆC (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [x] | **W2-TV1-01** | **TV1** | Entity Conversation, Member & Message | 6h | Sinh đúng bảng `conversations`, `conversation_members`, `messages` trong PostgreSQL. |
| [x] | **W2-TV1-02** | **TV1** | Repositories & DTOs Chat | 6h | Truy vấn hội thoại theo user, kiểm tra quyền xem tin nhắn; DTOs chuẩn format. |
| [x] | **W2-TV1-03** | **TV1** | Service & REST APIs Chat 1-1 | 8h | API tạo direct chat, lấy lịch sử tin nhắn, tìm kiếm người dùng 200 OK. |
| [x] | **W2-TV1-04** | **TV1** | STOMP Controller `/topic/chat/{id}` | 6h | Nhận tin nhắn từ client, lưu DB và broadcast tức thì tới mọi người trong phòng. |
| [x] | **W2-TV1-05** | **TV1** | Giao diện Chat Sidebar & Tìm kiếm | 8h | Danh sách hội thoại đẹp, preview tin nhắn cuối, tìm kiếm người dùng để chat mượt mà. |
| [x] | **W2-TV1-06** | **TV1** | Giao diện ChatWindow & STOMP Client | 8h | Bong bóng chat chuẩn màu Teams, gõ Enter gửi tin, auto-scroll, realtime qua WebSocket. |
| [x] | **W2-TV1-07** | **TV1** | Unit Tests ChatService & Review | 6h | Test cases bao quát đủ logic nghiệp vụ, `./mvnw test` xanh 100%. |

