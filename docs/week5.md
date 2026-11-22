# KẾ HOẠCH CHI TIẾT TUẦN 5 (SPRINT 5) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 5 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Mục tiêu tuần:** Ghim tin nhắn/tài liệu & thư viện Media/Files trong nhóm chat (TV1); Chia sẻ màn hình trong cuộc gọi 1-1 & nhóm (TV2); Nhúng Bảng vẽ tương tác Split-screen vào phòng họp, xuất PNG/PDF & Tóm tắt cuộc trò chuyện bằng AI (TV3).  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 5

- [ ] **Tiến độ chung toàn đội:** `64%` (Phân hệ Chia sẻ màn hình của TV2 và Bảng vẽ Split-screen + AI Summarizer của TV3 đã hoàn thành 100%)
- [ ] **Mục tiêu 1 (TV1):** Tính năng Ghim tin nhắn (`PinnedMessages`), Đánh dấu tin nhắn quan trọng, Thư viện Tệp/Media đã chia sẻ (`GET /api/conversations/{id}/media`), Drawer tab bên phải khung chat & Xem trước Ảnh/PDF trực tiếp.
- [x] **Mục tiêu 2 (TV2):** Báo hiệu Chia sẻ màn hình qua Signaling Server (`SCREEN_SHARE`), Tích hợp `getDisplayMedia()` cho cả gọi 1-1 và Mesh nhóm, Layout ưu tiên phóng to màn hình đang chia sẻ. - **ĐÃ HOÀN THÀNH 100%**
- [x] **Mục tiêu 3 (TV3):** Chế độ Bảng vẽ ngay trong cuộc họp (Split-screen Video + Whiteboard), Xuất bảng vẽ ra ảnh PNG/PDF và API + UI Tóm tắt cuộc trò chuyện AI (Chat Summarizer & Action Items). - **ĐÃ HOÀN THÀNH 100%**
> ⚠️ *Lưu ý đầu tuần cho TV3:* Phần bot `@AI-Assistant` và SSE đã được triển khai ở Tuần 4; xác nhận `GEMINI_API_KEY` hoạt động trước khi ghép nối luồng Chat Summarizer của Tuần 5.

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w5-tv1-pin-and-media-library`  
> **Trọng tâm:** Xây dựng chức năng Ghim tin nhắn quan trọng, Thư viện lưu trữ tập trung toàn bộ Hình ảnh & Tệp tài liệu của từng cuộc hội thoại, Drawer bên phải khung chat với 2 tab (**Tin nhắn đã ghim** & **Tệp đã chia sẻ**) và Modal xem trước Ảnh/PDF trực tiếp.

### 📅 Ngày 1: Thiết kế Cơ sở dữ liệu Ghim tin nhắn & Mở rộng `Message`
- [ ] **Sáng:** Họp Sprint Planning Tuần 5, thống nhất cấu trúc sự kiện WebSocket `/topic/chat/{conversationId}/pin` và quy ước quyền ghim/bỏ ghim tin nhắn trong hội thoại.
- [ ] **Chiều:** Cập nhật `Message.java` (hoặc tạo Entity `PinnedMessage.java` tùy chọn tham chiếu):
  - [ ] Bổ sung trường `isPinned` (`boolean`, mặc định `false`), `pinnedBy` (`UUID`), `pinnedAt` (`LocalDateTime`).
  - [ ] Bổ sung trường `isImportant` (`boolean`, mặc định `false`) phục vụ đánh dấu tin nhắn quan trọng (Important / Priority Message).
- [ ] **Chiều:** Cập nhật `MessageDto.java` và `SendMessageRequest.java` bổ sung `isPinned`, `pinnedByName`, `pinnedAt`, `isImportant`.

### 📅 Ngày 2: Truy vấn Kho lưu trữ Media/Files & Ghim Tin nhắn (`MessageRepository`)
- [ ] **Sáng:** Mở rộng `MessageRepository.java`:
  - [ ] `findByConversationIdAndIsPinnedTrueOrderByPinnedAtDesc(UUID conversationId)`: Lấy danh sách tin nhắn đã ghim theo thứ tự mới ghim nhất.
  - [ ] `findByConversationIdAndMessageTypeInOrderByCreatedAtDesc(UUID conversationId, List<MessageType> types)`: Truy vấn toàn bộ tin nhắn loại `IMAGE` và `FILE` có `fileUrl != null` trong hội thoại.
  - [ ] Hỗ trợ lọc riêng theo loại `IMAGE` (Ảnh) hoặc `FILE` (Tài liệu) và phân trang (`Pageable`).
- [ ] **Chiều:** Tạo DTOs phản hồi:
  - [ ] `ConversationMediaDto.java` (`messageId`, `senderId`, `senderName`, `messageType`, `fileUrl`, `fileName`, `fileSize`, `createdAt`).
  - [ ] `PinMessageEventDto.java` (`conversationId`, `messageId`, `pinned`, `pinnedById`, `pinnedByName`, `pinnedAt`, `message`).

### 📅 Ngày 3: Nghiệp vụ Backend & REST APIs (Pin, Important & Media Library)
- [ ] **Sáng:** Bổ sung các phương thức vào `ChatService.java` và `ChatServiceImpl.java`:
  - [ ] `togglePinMessage(UUID conversationId, UUID messageId, UUID requesterId, boolean pin)`: Kiểm tra quyền thành viên cuộc trò chuyện, cập nhật trạng thái ghim, tạo tin nhắn hệ thống (`SYSTEM`) thông báo *"Nguyễn Văn A đã ghim một tin nhắn"* và trả về `MessageDto`.
  - [ ] `getPinnedMessages(UUID conversationId, UUID currentUserId)`: Trả về danh sách tin nhắn đang được ghim.
  - [ ] `getConversationMedia(UUID conversationId, UUID currentUserId, MessageType filterType)`: Trả về danh sách hình ảnh và tệp đã chia sẻ trong phòng chat.
- [ ] **Chiều:** Mở các REST API mới trong `ConversationController.java`:
  - [ ] `POST /api/conversations/{id}/messages/{messageId}/pin`: Ghim tin nhắn (kèm broadcast tới `/topic/chat/{id}/pin` và `/topic/chat/{id}`).
  - [ ] `DELETE /api/conversations/{id}/messages/{messageId}/pin`: Bỏ ghim tin nhắn (kèm broadcast realtime).
  - [ ] `GET /api/conversations/{id}/pinned-messages`: Lấy danh sách tin nhắn đã ghim.
  - [ ] `GET /api/conversations/{id}/media?type=ALL|IMAGE|FILE`: Lấy kho thư viện Media/Files đã chia sẻ trong nhóm chat.

### 📅 Ngày 4: Cập nhật TypeScript Types, Service & WebSocket Pin Sync
- [ ] **Sáng:** Cập nhật `frontend/src/types/chat.ts`:
  - [ ] Thêm `isPinned`, `pinnedByName`, `pinnedAt`, `isImportant` vào `Message`.
  - [ ] Định nghĩa `ConversationMediaItem` và `PinMessageEvent`.
- [ ] **Sáng:** Cập nhật `frontend/src/services/chatService.ts`:
  - [ ] Thêm `pinMessage()`, `unpinMessage()`, `getPinnedMessages()`, `getConversationMedia()`.
- [ ] **Chiều:** Nâng cấp `frontend/src/hooks/useChatWebSocket.ts` và `ChatPage.tsx`:
  - [ ] Subscribe thêm kênh `/topic/chat/{conversationId}/pin` để đồng bộ tức thì danh sách tin nhắn ghim giữa các thành viên mà không cần F5.

### 📅 Ngày 5: Thanh Ghim Đầu Khung Chat & Nút Thao tác trên Bong bóng Tin nhắn
- [ ] **Sáng:** Nâng cấp `ChatWindow.tsx`:
  - [ ] Thanh **Pinned Message Banner** nổi gọn dưới Header (hiển thị tin nhắn mới ghim nhất kèm số lượng `📌 3 tin nhắn đã ghim`), bấm vào sẽ tự động cuộn tới tin nhắn gốc hoặc mở Drawer danh sách ghim.
  - [ ] Thanh công cụ nổi (Hover Action Bar) khi rê chuột vào mỗi tin nhắn: Nút **Ghim / Bỏ ghim (`Pin`)**.
  - [ ] Tùy chọn đánh dấu **"Quan trọng (!)"** trên thanh soạn thảo tin nhắn (hiển thị viền đỏ cam + nhãn `QUAN TRỌNG` nổi bật trên bong bóng chat chuẩn Microsoft Teams).

### 📅 Ngày 6: Drawer Bên Phải ("Tệp đã chia sẻ" & "Tin nhắn đã ghim") + Xem trước PDF/Ảnh
- [ ] **Sáng:** Xây dựng Component `ConversationAssetsDrawer.tsx` (Drawer bên phải khung chat với 2 tab):
  - [ ] **Tab "Tin nhắn đã ghim":** Hiển thị toàn bộ tin nhắn ghim kèm tên người gửi, thời gian, nút **"Đi tới tin nhắn"** (scroll & highlight) và nút **"Bỏ ghim"**.
  - [ ] **Tab "Tệp đã chia sẻ":** Chia 2 sub-tab **Hình ảnh** (lưới thumbnail 3 cột đẹp mắt) và **Tài liệu** (danh sách file kèm dung lượng, người gửi, nút Xem trước & Tải xuống).
- [ ] **Chiều:** Xây dựng Component `FilePreviewModal.tsx`:
  - [ ] Cho phép xem trước (Preview) **Hình ảnh** (zoom in/out) và **File PDF** (`<iframe>` / `<object>` render trực tiếp nội dung PDF từ `/api/files/{fileName}` mà không cần tải về máy).
  - [ ] Bổ sung nút mở Drawer ngay trên Header `ChatWindow.tsx` (cạnh nút Tìm kiếm & Thành viên nhóm).

### 📅 Ngày 7: Unit Tests, Kiểm thử Tích hợp & Nghiệm thu Sprint 5
- [ ] **Sáng:** Mở rộng `ChatServiceTest.java`:
  - [ ] Test ghim & bỏ ghim tin nhắn thành công, chặn người ngoài hội thoại ghim tin nhắn (`403 Forbidden`).
  - [ ] Test truy vấn thư viện Media/Files phân tách đúng `IMAGE` và `FILE`.
  - [ ] Test gửi tin nhắn đánh dấu quan trọng (`isImportant = true`).
- [ ] **Chiều:** Chạy `./mvnw test` đạt 100% PASS và `npm run build` sạch sẽ không lỗi TypeScript.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w5-tv2-screen-sharing`  
> **Trọng tâm:** Xây dựng tính năng Chia sẻ màn hình (Screen Share) qua WebRTC `getDisplayMedia()`, đồng bộ tín hiệu qua Signaling Server (`SCREEN_SHARE`) cho cả cuộc gọi 1-1 lẫn cuộc họp nhóm, và thiết kế bố cục Presentation ưu tiên phóng to màn hình được chia sẻ.

### 📅 Ngày 1: Mở rộng Giao thức Signaling cho Chia sẻ Màn hình
- [x] **Sáng:** Cập nhật `SignalType.java`:
  - [x] Thêm `SCREEN_SHARE_START` (bắt đầu chia sẻ màn hình) và `SCREEN_SHARE_STOP` (dừng chia sẻ màn hình).
- [x] **Chiều:** Nâng cấp `SignalMessage.java` & `SignalingController.java`:
  - [x] Hỗ trợ chuyển tiếp tín hiệu chia sẻ màn hình trong cuộc gọi 1-1 (`/app/call/signal` -> `/user/queue/signals`) và phòng họp nhóm (`/app/call/room-signal` -> `/topic/call/room/{roomId}`).
  - [x] Cập nhật `UserSessionRegistry.java` lưu `activeScreenSharerId` cho từng phòng gọi để người mới vào phòng nhận biết ngay ai đang chia sẻ màn hình.

### 📅 Ngày 2: Nâng cấp `useMediaStream` hỗ trợ `getDisplayMedia()`
- [x] **Sáng:** Cập nhật `frontend/src/hooks/useMediaStream.ts`:
  - [x] Xây dựng hàm `startScreenShare()`: Gọi `navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })` để lấy màn hình hoặc cửa sổ ứng dụng.
  - [x] Xử lý sự kiện `videoTrack.onended` (khi người dùng bấm nút *"Stop sharing"* mặc định của trình duyệt) để tự động dọn dẹp state và khôi phục lại Webcam.
  - [x] Viết hàm `stopScreenShare()` giải phóng toàn bộ track màn hình.
- [x] **Chiều:** Cập nhật `frontend/src/types/calling.ts`:
  - [x] Thêm `isScreenSharing`, `screenShareUserId`, `screenStream` vào trạng thái cuộc gọi và `GroupParticipant`.

### 📅 Ngày 3: Thay thế Video Track Không Gián đoạn qua WebRTC (`replaceTrack`)
- [x] **Sáng:** Nâng cấp `webrtcManager.ts` (gọi 1-1) & `meshWebrtcManager.ts` (gọi nhóm):
  - [x] Sử dụng `RTCRtpSender.replaceTrack()` (hoặc `replaceTrackForAllPeers()`) để tráo đổi track gửi đi giữa **Webcam track** và **Screen Share track** mà không phải đàm phán lại toàn bộ SDP hoặc ngắt kết nối P2P.
  - [x] Trường hợp cuộc gọi ban đầu là Audio-only (chưa có video sender), tự động đàm phán lại (`renegotiate` gửi `CALL_OFFER`) khi bật chia sẻ màn hình.
- [x] **Chiều:** Tích hợp vào `CallContext.tsx`:
  - [x] Expose hàm `toggleScreenShare()`, biến `isScreenSharing` và `activeScreenSharerId`.
  - [x] Gửi tín hiệu `SCREEN_SHARE_START` / `SCREEN_SHARE_STOP` qua `signalingService.ts` khi bật/tắt chia sẻ.

### 📅 Ngày 4-5: Giao diện Presentation (Phóng to Màn hình Chia sẻ, Thu nhỏ Camera)
- [x] **Sáng (Ngày 4):** Cập nhật `VideoCallView.tsx` (Cuộc gọi 1-1):
  - [x] Khi có người chia sẻ màn hình: Đặt video màn hình chia sẻ chiếm **toàn bộ vùng trung tâm** (`object-contain` để không bị cắt mất chữ/góc màn hình), thu nhỏ video camera người nói thành dải PiP gọn ở góc dưới.
  - [x] Hiển thị nhãn thông báo *"Đang xem màn hình của [Tên người chia sẻ]"* hoặc *"Bạn đang chia sẻ màn hình"*.
- [x] **Chiều (Ngày 4) & Ngày 5:** Cập nhật `GroupVideoGrid.tsx` (Cuộc họp nhóm):
  - [x] Tự động chuyển sang **Presentation Layout** khi nhận tín hiệu `activeScreenSharerId`: Khung màn hình chia sẻ chiếm 75–80% không gian chính, thanh camera các thành viên còn lại xếp gọn thành dải cuộn (filmstrip) ở cạnh phải hoặc cạnh dưới.
  - [x] Bổ sung nút **"Chia sẻ màn hình (`MonitorUp` / `ScreenShareOff`)"** trên thanh điều khiển `ActiveCallModal.tsx`.

### 📅 Ngày 6-7: Kiểm thử Chéo Đa trình duyệt & Unit Tests
- [x] **Sáng (Ngày 6):** Viết Unit Test trong `SignalingControllerTest.java` cho `SCREEN_SHARE_START`, `SCREEN_SHARE_STOP` và dọn dẹp trạng thái khi người chia sẻ rời phòng.
- [x] **Chiều (Ngày 6) & Ngày 7:** Kiểm thử E2E thực tế 2–3 tab trình duyệt: Chia sẻ cửa sổ IDE/Slide khi họp nhóm, kiểm tra tự động khôi phục Webcam khi bấm Stop Sharing, chạy `./mvnw test` và `npm run build` PASS 100%.

---

## 4. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 3 (WHITEBOARD & AI ASSISTANT LEAD)
> **Nhánh Git:** `feature/w5-tv3-meeting-whiteboard-and-ai-summarizer`  
> **Trọng tâm:** Tích hợp Bảng vẽ tương tác chạy ngay trong giao diện cuộc gọi (Split-screen Meeting Mode), Xuất bảng vẽ ra file ảnh PNG & PDF, và xây dựng tính năng AI Tóm tắt cuộc trò chuyện & trích xuất Action Items (`Chat Summarizer`).

### 📅 Ngày 1: Đồng bộ Tồn đọng Tuần 4 (`@AI-Assistant`) & Chuẩn bị Kiến trúc Tuần 5
- [x] **Sáng:** Hoàn thiện nốt phần còn thiếu từ Tuần 4: Endpoint SSE Streaming `/api/ai/chat/stream` trong `AiController.java` và triệu hồi `@AI-Assistant` trong khung chat nhóm.
- [x] **Chiều:** Chốt cơ chế truyền `conversationId` / `roomId` từ `CallContext` sang `EmbeddedWhiteboard` khi bật bảng vẽ trong cuộc họp.

### 📅 Ngày 2: Nhúng Bảng vẽ Tương tác Trực tiếp vào Phòng họp (Split-screen View)
- [x] **Sáng:** Tái cấu trúc `WhiteboardCanvas.tsx` và `WhiteboardPage.tsx` để tách phần Studio Toolbar + Canvas thành Component tái sử dụng được (`EmbeddedWhiteboard`) nhận prop `sessionId` (gắn với `roomId` / `conversationId` của cuộc họp).
- [x] **Chiều:** Tích hợp vào `ActiveCallModal.tsx`:
  - [x] Bổ sung nút **"Bảng vẽ (`PenTool`)"** trên thanh điều khiển cuộc họp.
  - [x] Khi bật chế độ Bảng vẽ trong họp: Chia giao diện thành **Split-screen View** — một bên hiển thị Video người họp (dạng cột gọn hoặc lưới thu nhỏ), phần không gian chính còn lại là **Bảng vẽ tương tác thời gian thực** cho mọi thành viên trong cuộc gọi cùng vẽ song song.

### 📅 Ngày 3: Xuất Bảng vẽ ra File Ảnh PNG & Tài liệu PDF
- [x] **Sáng:** Nâng cấp `frontend/src/utils/whiteboard.ts`:
  - [x] Hàm `exportCanvasToPng(canvas, filename)`: Vẽ nền trắng/lưới sạch sẽ rồi xuất ảnh sắc nét chuẩn `image/png` tải về máy.
  - [x] Hàm `exportCanvasToPdf(canvas, filename)`: Chuyển dữ liệu ảnh Canvas sang tài liệu PDF kích thước chuẩn (sử dụng `jspdf`) kèm tiêu đề cuộc họp và timestamp.
- [x] **Chiều:** Gắn nút **"Xuất PNG"** và **"Xuất PDF"** lên thanh công cụ của cả `WhiteboardPage` và `EmbeddedWhiteboard` trong phòng họp.

### 📅 Ngày 4-5: Backend AI Tóm tắt Cuộc trò chuyện (`Chat Summarizer`)
- [x] **Sáng (Ngày 4):** Tạo DTOs cho Chat Summarizer:
  - [x] `ChatSummaryRequest.java` (`messageLimit` mặc định 50 tin nhắn gần nhất, `language`; conversation ID lấy từ URL).
  - [x] `ChatSummaryResponse.java` (`summary`: Tóm tắt tổng quan, `keyTopics`: Các chủ đề chính, `actionItems`: Danh sách đầu việc cần làm gồm người phụ trách & mô tả, `messageCount`, `generatedAt`).
- [x] **Chiều (Ngày 4) & Ngày 5:** Xây dựng `ChatSummarizerService.java` (tái sử dụng `ChatService`/`MessageRepository` và `AiClientService`):
  - [x] Kiểm tra quyền thành viên trong cuộc hội thoại qua `ChatService` trước khi gọi AI.
  - [x] Gom các tin nhắn văn bản gần nhất, định dạng thành hội thoại `[Tên người gửi - Giờ]: Nội dung`.
  - [x] Thiết kế prompt yêu cầu Gemini trả JSON hợp lệ để phân tích và trích xuất **Tóm tắt nội dung chính** + **Action Items**.
  - [x] Mở endpoint `POST /api/ai/conversations/{conversationId}/summarize` trong `AiController.java`.

### 📅 Ngày 6: Giao diện Modal "Tóm tắt Cuộc trò chuyện" trong Khung Chat
- [x] **Sáng:** Cập nhật `frontend/src/types/ai.ts` và `frontend/src/services/aiService.ts` (thêm hàm `summarizeConversation(conversationId, messageLimit)`).
- [x] **Chiều:** Xây dựng Component `ChatSummaryModal.tsx` & tích hợp vào Header `ChatWindow.tsx`:
  - [x] Nút **"✨ Tóm tắt AI"** trên Header khung chat (cạnh nút Tìm kiếm).
  - [x] Hiển thị giao diện loading, sau đó render rõ ràng 3 phần: **Tóm tắt chung**, **Các điểm thảo luận chính**, và **Danh sách việc cần làm (Action Items)** dạng checklist kèm nút sao chép nhanh (Copy Markdown).

### 📅 Ngày 7: Unit Tests & Kiểm thử Kết hợp E2E
- [x] **Sáng:** Viết Unit Test cho `ChatSummarizerService` (mock nguồn tin nhắn và Gemini client, kiểm tra `summary` + `actionItems`) và test bảo vệ quyền truy cập hội thoại.
- [x] **Chiều:** Chạy `./mvnw test` và `npm run build` PASS; luồng tóm tắt được xác nhận bằng unit tests.
- [ ] **Nghiệm thu E2E:** Chưa chạy thủ công kịch bản họp nhóm + bảng vẽ + Gemini tóm tắt trên ứng dụng đang hoạt động.

---

## 5. BẢNG CHECKLIST WBS TUẦN 5 (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [ ] | **W5-TV1-01** | **TV1** | Mở rộng `Message` & DTOs cho Pin / Important / Media | 4h | Bảng `messages` có cột `is_pinned`, `pinned_by`, `pinned_at`, `is_important`. |
| [ ] | **W5-TV1-02** | **TV1** | Service & REST API Ghim tin nhắn + Broadcast WebSocket | 6h | API Pin/Unpin hoạt động 200 OK; mọi thành viên thấy ghim cập nhật tức thì. |
| [ ] | **W5-TV1-03** | **TV1** | API Thư viện Media/Files (`GET /api/conversations/{id}/media`) | 4h | Trả về chính xác danh sách ảnh (`IMAGE`) và tài liệu (`FILE`) theo phòng chat. |
| [ ] | **W5-TV1-04** | **TV1** | Banner Ghim Đầu Khung Chat & Nhãn Tin nhắn Quan trọng | 6h | Rê chuột vào tin nhắn để ghim; gắn cờ `QUAN TRỌNG` nổi bật khi gửi. |
| [ ] | **W5-TV1-05** | **TV1** | Drawer `"Tệp đã chia sẻ"` & `"Tin nhắn đã ghim"` + Preview Ảnh/PDF | 8h | Chuyển tab mượt mà, xem trước trực tiếp ảnh & file PDF ngay trong ứng dụng. |
| [ ] | **W5-TV1-06** | **TV1** | Unit Tests cho Pin Message, Important & Media Library | 4h | `ChatServiceTest` xanh 100%, không lỗi build Frontend/Backend. |
| [x] | **W5-TV2-01** | **TV2** | Bổ sung `SCREEN_SHARE_START/STOP` vào Signaling Server | 5h | Truyền tải chính xác trạng thái chia sẻ màn hình 1-1 & phòng họp nhóm. |
| [x] | **W5-TV2-02** | **TV2** | Tích hợp `getDisplayMedia()` & `replaceTrack` trên WebRTC Client | 8h | Tráo track Camera <-> Màn hình mượt mà không rớt kết nối, xử lý Stop Sharing. |
| [x] | **W5-TV2-03** | **TV2** | Presentation Layout (Phóng to Màn hình Chia sẻ, Thu nhỏ Camera) | 8h | Tự động chuyển giao diện ưu tiên màn hình chia sẻ cho 1-1 & Mesh nhóm. |
| [x] | **W5-TV2-04** | **TV2** | Unit Tests Screen Share Signaling & Test E2E Đa trình duyệt | 5h | `SignalingControllerTest` pass 100%, chia sẻ màn hình sắc nét giữa 2-3 tab. |
| [x] | **W5-TV3-01** | **TV3** | Đồng bộ nốt `@AI-Assistant` & Nhúng Whiteboard Split-screen vào Họp | 8h | Mở bảng vẽ ngay trong `ActiveCallModal` chia đôi màn hình Video + Canvas đồng bộ. |
| [x] | **W5-TV3-02** | **TV3** | Tính năng Xuất Bảng vẽ ra File Ảnh PNG & Tài liệu PDF | 5h | Xuất file PNG và PDF sắc nét từ dữ liệu nét vẽ Canvas hiện tại. |
| [x] | **W5-TV3-03** | **TV3** | Backend `ChatSummarizerService` & API Tóm tắt Hội thoại AI | 8h | Gom tin nhắn từ DB, gọi Gemini API trả về Summary + Key Topics + Action Items. |
| [x] | **W5-TV3-04** | **TV3** | Modal `"✨ Tóm tắt AI"` trong `ChatWindow` & Unit Tests | 6h | Hiển thị đẹp các đầu việc cần làm (Action Items), sao chép nhanh & Pass Unit Tests. |

---

## 6. CHECKLIST NGHIỆM THU CUỐI TUẦN 5 (SPRINT REVIEW GO / NO-GO)

- [ ] **Tiêu chí 1 (TV1):** Rê chuột vào bất kỳ tin nhắn nào bấm **Ghim** -> Banner ghim hiện lên đầu khung chat cho tất cả thành viên đang mở phòng; mở tab **"Tin nhắn đã ghim"** bấm vào sẽ cuộn tới đúng tin nhắn gốc.
- [ ] **Tiêu chí 2 (TV1):** Mở tab **"Tệp đã chia sẻ"** thấy đầy đủ ảnh và file đã gửi; bấm vào **ảnh** hoặc **file PDF** xem trước được trực tiếp ngay trên modal trong ứng dụng.
- [ ] **Tiêu chí 3 (TV2):** Trong cuộc gọi 1-1 hoặc cuộc họp nhóm, bấm **"Chia sẻ màn hình"** -> các thành viên khác thấy màn hình chia sẻ phóng to rõ nét kèm dải camera thu nhỏ; bấm dừng chia sẻ tự động quay lại Webcam bình thường.
- [ ] **Tiêu chí 4 (TV3):** Nghiệm thu thủ công trong cuộc họp nhóm: mở **Bảng vẽ Split-screen**, vẽ đồng thời và xuất bảng vẽ thành file PNG / PDF.
- [ ] **Tiêu chí 5 (TV3):** Nghiệm thu thủ công nút **"Tóm tắt AI"** với Gemini đang được cấu hình, xác nhận nội dung chính và danh sách Action Items.
- [ ] **Tiêu chí 6 (Toàn đội):** Toàn bộ `./mvnw test` và `npm run build` đều PASS 100% trước khi merge vào nhánh `main` / `develop`.
