# KẾ HOẠCH CHI TIẾT TUẦN 6 (SPRINT 6) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 6 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Mục tiêu tuần:** Thả cảm xúc Emoji Reaction, Trả lời trích dẫn (Reply/Quote) & phân trang tải lịch sử tin nhắn (TV1); Nâng cấp độ ổn định cuộc gọi WebRTC với Coturn STUN/TURN, ICE Restart & tự động giảm băng thông mạng yếu (TV2); Gợi ý trả lời nhanh thông minh (AI Smart Replies), Biên bản cuộc họp tự động & Rate Limiting bảo vệ AI API (TV3).  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 6

- [ ] **Tiến độ chung toàn đội:** `0%`
- [ ] **Mục tiêu 1 (TV1):** Tính năng Thả cảm xúc (`MessageReaction`), Trả lời trích dẫn tin nhắn cũ (`replyToId` / Quote), Phân trang tải tin nhắn cũ (Infinite Scroll / Load More) và đồng bộ realtime qua WebSocket STOMP.
- [ ] **Mục tiêu 2 (TV2):** Cấu hình Coturn Server (STUN/TURN vượt NAT), cơ chế tự động phục hồi kết nối khi rớt mạng (ICE Restart / Auto-reconnect), tự động điều chỉnh bitrate video khi mạng yếu và nâng cấp thống kê `CallLogs`.
- [ ] **Mục tiêu 3 (TV3):** Xây dựng API & UI AI Smart Replies (3 gợi ý trả lời nhanh dạng pill phía trên ô nhập tin nhắn), Modal Biên bản cuộc họp tự động (Meeting Minutes) và Rate Limiting bảo vệ API Key Gemini.

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w6-tv1-reactions-reply-pagination`  
> **Trọng tâm:** Hoàn thiện trải nghiệm nhắn tin tương tác chuyên sâu chuẩn Microsoft Teams gồm: Thả cảm xúc Emoji (`👍 ❤️ 😂 😮 😢 🙏`), Trả lời trích dẫn tin nhắn cũ kèm cuộn tới tin nhắn gốc, và phân trang tải lịch sử tin nhắn mượt mà.

### 📅 Ngày 1: Thiết kế Entity `MessageReaction` & Mở rộng `Message` cho Reply/Quote
- [ ] **Sáng:** Họp Sprint Planning Tuần 6, thống nhất kênh WebSocket `/topic/chat/{conversationId}/reaction` và cấu trúc trích dẫn tin nhắn (`replyToMessage`).
- [ ] **Chiều:** Tạo Entity mới `MessageReaction.java` (`src/main/java/com/team17/chatapp/chat/entity/`):
  - [ ] Trường: `messageId` (`UUID`), `userId` (`UUID`), `emoji` (`String`, độ dài tối đa 16 ký tự).
  - [ ] Ràng buộc duy nhất (`@UniqueConstraint(columnNames = {"message_id", "user_id", "emoji"})`) tránh trùng lặp cùng một emoji của cùng một người dùng.
- [ ] **Chiều:** Mở rộng `Message.java` bổ sung cột `reply_to_id` (`UUID replyToId`, nullable) để liên kết tới tin nhắn được trích dẫn.

### 📅 Ngày 2: Xây dựng `MessageReactionRepository` & DTOs Phản ứng / Trích dẫn
- [ ] **Sáng:** Tạo `MessageReactionRepository.java`:
  - [ ] `findByMessageIdIn(Collection<UUID> messageIds)`: Gom toàn bộ reaction cho danh sách tin nhắn trong 1 truy vấn (tránh lỗi N+1 query).
  - [ ] `findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji)`: Hỗ trợ bật/tắt (toggle) reaction.
  - [ ] `findByMessageId(UUID messageId)`.
- [ ] **Chiều:** Tạo và cập nhật các DTOs:
  - [ ] `ReactionRequest.java` (`@NotBlank String emoji`).
  - [ ] `MessageReactionDto.java` (`emoji`, `count`, `userIds`, `userNames`, `reactedByMe`).
  - [ ] `ReactionEventDto.java` (`conversationId`, `messageId`, `reactions`: danh sách reaction đã gom nhóm mới nhất).
  - [ ] `ReplyPreviewDto.java` (`id`, `senderId`, `senderName`, `content`, `messageType`, `fileName`).
  - [ ] Cập nhật `MessageDto.java`, `SendMessageRequest.java`, `ChatMessagePayload.java` bổ sung `replyToId`, `replyTo` (`ReplyPreviewDto`), `reactions` (`List<MessageReactionDto>`).

### 📅 Ngày 3: Nghiệp vụ Backend & REST APIs (Reaction, Reply & Message Pagination)
- [ ] **Sáng:** Nâng cấp `ChatService.java` và `ChatServiceImpl.java`:
  - [ ] `toggleMessageReaction(UUID conversationId, UUID messageId, UUID userId, String emoji)`: Kiểm tra quyền thành viên; nếu đã thả emoji đó thì xóa (unreact), ngược lại thêm mới; trả về `ReactionEventDto` kèm danh sách reaction đã gom nhóm.
  - [ ] Cập nhật `saveMessage()`: Kiểm tra hợp lệ `replyToId` (phải thuộc cùng `conversationId`), lưu liên kết và đính kèm `ReplyPreviewDto` trong `MessageDto` trả về.
  - [ ] Nâng cấp `mapMessagesToDtos()`: Nạp hàng loạt `reactions` và `replyTo` theo batch (`findAllById`, `findByMessageIdIn`) tối ưu hiệu năng.
  - [ ] Chuẩn hóa `getConversationMessages(conversationId, currentUserId, page, size)` trả về kết quả phân trang (`Page<MessageDto>`).
- [ ] **Chiều:** Mở các REST API mới trong `ConversationController.java`:
  - [ ] `POST /api/conversations/{id}/messages/{messageId}/reactions`: Toggle thả cảm xúc và broadcast tới `/topic/chat/{id}/reaction`.
  - [ ] `GET /api/conversations/{id}/messages/paged?page=0&size=30`: API phân trang tải thêm lịch sử tin nhắn cũ (`hasMore`, `totalElements`, `content`).

### 📅 Ngày 4: Cập nhật Frontend Types, Service & WebSocket Reaction Sync
- [ ] **Sáng:** Cập nhật `frontend/src/types/chat.ts`:
  - [ ] Định nghĩa `MessageReactionSummary`, `ReactionEvent`, `ReplyPreview`, `PagedMessagesResponse`.
  - [ ] Mở rộng `Message` và `SendMessagePayload` với `replyToId`, `replyTo`, `reactions`.
- [ ] **Sáng:** Cập nhật `frontend/src/services/chatService.ts`:
  - [ ] Thêm `toggleReaction(conversationId, messageId, emoji)` và `getMessagesPaged(conversationId, page, size)`.
- [ ] **Chiều:** Nâng cấp `frontend/src/hooks/useChatWebSocket.ts` và `ChatPage.tsx`:
  - [ ] Subscribe thêm kênh `/topic/chat/{conversationId}/reaction` để cập nhật tức thì số lượng Emoji trên màn hình mọi thành viên.

### 📅 Ngày 5: Giao diện Emoji Reaction Picker & Nhãn Cảm xúc dưới Bong bóng Chat
- [ ] **Sáng:** Xây dựng thanh chọn Emoji nhanh (`QuickReactionBar`) xuất hiện khi rê chuột vào mỗi tin nhắn (cạnh nút Ghim):
  - [ ] Bộ 6 biểu cảm nhanh chuẩn Teams: `👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`.
  - [ ] Hỗ trợ bấm chọn để bật/tắt cảm xúc ngay lập tức.
- [ ] **Chiều:** Hiển thị các huy hiệu Emoji Reaction pills bên dưới bong bóng tin nhắn:
  - [ ] Hiển thị `[Emoji] [Số lượng]` (nổi bật viền tím `#5B5FC7` nếu chính mình đã thả).
  - [ ] Rê chuột vào pill hiển thị tooltip danh sách tên những người đã thả cảm xúc đó.

### 📅 Ngày 6: Giao diện Trả lời Trích dẫn (Reply/Quote) & Tải thêm Tin nhắn Cũ (Pagination)
- [ ] **Sáng:** Tích hợp chức năng Trả lời trích dẫn (Reply/Quote) trong `ChatWindow.tsx`:
  - [ ] Nút **Trả lời (`Reply`)** trên thanh hover mỗi tin nhắn.
  - [ ] Thanh **Reply Preview Banner** phía trên ô nhập tin nhắn hiển thị *"Đang trả lời [Tên]: [Nội dung trích dẫn]"* kèm nút `X` hủy trả lời.
  - [ ] Trong bong bóng tin nhắn có trích dẫn: Hiển thị khối Quote nhỏ có thanh dọc tím bên trái; khi bấm vào khối Quote sẽ **tự động cuộn mượt và highlight tin nhắn gốc**.
- [ ] **Chiều:** Nâng cấp tải lịch sử tin nhắn phân trang:
  - [ ] Nút **"Tải tin nhắn cũ hơn"** (hoặc tự động load khi cuộn lên đầu danh sách) giữ nguyên vị trí cuộn không bị giật màn hình.

### 📅 Ngày 7: Unit Tests, Tinh chỉnh & Nghiệm thu Sprint 6
- [ ] **Sáng:** Bổ sung Unit Test trong `ChatServiceTest.java`:
  - [ ] Test thả cảm xúc (`toggleMessageReaction`) thêm mới & gỡ bỏ khi bấm lần 2.
  - [ ] Test gửi tin nhắn có `replyToId` hợp lệ và báo lỗi `400` khi trích dẫn tin nhắn của cuộc hội thoại khác.
  - [ ] Test phân trang lịch sử tin nhắn (`getConversationMessages`).
- [ ] **Chiều:** Chạy `./mvnw test` đạt 100% PASS và `npm run build` sạch sẽ không lỗi TypeScript.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w6-tv2-coturn-reconnect-call-logs`  
> **Trọng tâm:** Nâng cấp độ ổn định cuộc gọi WebRTC cho môi trường mạng thực tế: tích hợp Coturn STUN/TURN Server, cơ chế tự động kết nối lại khi mất mạng (ICE Restart), thích ứng băng thông khi mạng yếu và hoàn thiện `CallLogs` chi tiết.

### 📅 Ngày 1-2: Cấu hình Coturn Server (STUN/TURN) & API Cấp Phát ICE Config
- [ ] **Ngày 1:** Tạo file cấu hình `docker/coturn/turnserver.conf` và bổ sung service `coturn` vào `docker-compose.yml` (cổng `3478/udp`, `3478/tcp`, dải relay ports).
- [ ] **Ngày 2:** Tạo Backend endpoint `GET /api/call/ice-servers` (trong `CallController` / `SignalingController`) trả về cấu hình STUN + TURN credentials từ `application.yml` để WebRTC Client sử dụng động thay vì hardcode.

### 📅 Ngày 3-4: Cơ chế Tự động Kết nối lại (ICE Restart) & Giảm Băng thông Mạng Yếu
- [ ] **Ngày 3:** Nâng cấp `webrtcManager.ts` và `meshWebrtcManager.ts`:
  - [ ] Theo dõi `oniceconnectionstatechange` (`disconnected` / `failed`): Tự động kích hoạt `pc.createOffer({ iceRestart: true })` và gửi tín hiệu `ICE_RESTART` qua Signaling Server để khôi phục cuộc gọi không cần gọi lại.
  - [ ] Hiển thị banner cảnh báo *"Đang kết nối lại cuộc gọi..."* trên `ActiveCallModal.tsx`.
- [ ] **Ngày 4:** Xây dựng bộ giám sát chất lượng mạng (`useNetworkQuality.ts` dùng `pc.getStats()`):
  - [ ] Đo tỷ lệ mất gói (`packetsLost`) và độ trễ (`roundTripTime`).
  - [ ] Khi mạng yếu: Tự động hạ bitrate video qua `RTCRtpSender.setParameters()` (`maxBitrate`) hoặc tự động chuyển sang chế độ ưu tiên thoại để tiếng nói luôn mượt mà; hiển thị cột sóng chất lượng mạng (Tốt / Trung bình / Yếu).

### 📅 Ngày 5-6: Hoàn thiện Bảng & Trang Thống kê Lịch sử Cuộc gọi (`CallLogs`)
- [ ] **Ngày 5:** Mở rộng `CallSession` / `CallHistoryDto` và `CallService`:
  - [ ] Bổ sung thống kê tổng hợp: tổng số cuộc gọi, cuộc gọi nhỡ, tổng thời lượng gọi, hỗ trợ lọc theo loại (`AUDIO | VIDEO | GROUP`) và trạng thái (`COMPLETED | MISSED | REJECTED`).
- [ ] **Ngày 6:** Nâng cấp `CallsPage.tsx`:
  - [ ] Hiển thị thẻ thống kê nhanh (Total / Missed / Duration), phân tách rõ cuộc gọi 1-1 và cuộc họp nhóm, nút gọi lại Audio/Video nhanh.

### 📅 Ngày 7: Unit Tests & Kiểm thử Mô phỏng Mạng Yếu
- [ ] Viết Unit Test cho endpoint `/api/call/ice-servers`, `CallService` thống kê lịch sử gọi.
- [ ] Thử nghiệm bật/tắt mạng tạm thời (Chrome DevTools Network Throttling / Offline 3s -> Online) xác nhận ICE Restart khôi phục cuộc gọi thành công; chạy `./mvnw test` và `npm run build` PASS 100%.

---

## 4. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 3 (WHITEBOARD & AI ASSISTANT LEAD)
> **Nhánh Git:** `feature/w6-tv3-ai-smart-replies-and-rate-limit`  
> **Trọng tâm:** Xây dựng tính năng AI Smart Replies (3 gợi ý trả lời nhanh thông minh), nâng cấp Modal Biên bản cuộc họp tự động (Meeting Minutes) và triển khai cơ chế Rate Limiting bảo vệ Gemini API Key.

### 📅 Ngày 1-2: Thiết lập Rate Limiting & Bảo vệ API Key AI Backend
- [ ] **Ngày 1:** Xây dựng `AiRateLimiterService.java` (Token Bucket / Sliding Window theo `userId`, ví dụ tối đa 15 request/phút và 100 request/ngày mỗi user).
- [ ] **Ngày 2:** Tích hợp kiểm tra giới hạn vào `AiController.java`: Trả mã chuẩn `429 Too Many Requests` kèm thông báo thân thiện và header `Retry-After` khi vượt hạn mức; đảm bảo API Key chỉ tồn tại ở biến môi trường Backend, không bao giờ rò rỉ ra log hay response.

### 📅 Ngày 3-4: Xây dựng API AI Smart Replies (`POST /api/ai/conversations/{id}/smart-replies`)
- [ ] **Ngày 3:** Tạo DTO `SmartReplyResponse.java` (`List<String> suggestions` — đúng 3 gợi ý ngắn gọn, tự nhiên bằng tiếng Việt, `generatedAt`).
- [ ] **Ngày 4:** Xây dựng `SmartReplyService.java`:
  - [ ] Lấy 5–10 tin nhắn gần nhất trong cuộc hội thoại từ `MessageRepository` (có kiểm tra quyền thành viên).
  - [ ] Viết System Prompt yêu cầu Gemini trả về đúng 3 câu trả lời ngắn gọn theo 3 sắc thái phù hợp ngữ cảnh (Ví dụ: Đồng ý nhanh / Đặt câu hỏi làm rõ / Hẹn xử lý), có cơ chế fallback an toàn nếu Gemini không khả dụng.

### 📅 Ngày 5: Giao diện 3 Nút Gợi ý Trả lời Nhanh (Smart Reply Pills) trong `ChatWindow`
- [ ] Cập nhật `frontend/src/services/aiService.ts` bổ sung `getSmartReplies(conversationId)`.
- [ ] Tạo Component `SmartReplyBar.tsx` hiển thị gọn phía trên ô nhập tin nhắn trong `ChatWindow.tsx`:
  - [ ] Nút **"✨ Gợi ý trả lời"** (hoặc tự động gợi ý khi có tin nhắn mới từ đối phương).
  - [ ] Hiển thị 3 nút dạng pill bo tròn; bấm vào 1 pill sẽ tự động điền vào ô chat hoặc gửi đi ngay lập tức.

### 📅 Ngày 6: Nâng cấp Modal Biên bản Cuộc họp Tự động (Meeting Minutes)
- [ ] Mở rộng `ChatSummaryModal.tsx` bổ sung chế độ **"Biên bản cuộc họp (Meeting Minutes)"**:
  - [ ] Tự động tổng hợp: Tiêu đề cuộc họp, Thời gian, Thành phần tham dự, Nội dung chính, Quyết định đã thống nhất và Bảng đầu việc cần làm (Action Items).
  - [ ] Hỗ trợ xuất biên bản ra file Markdown (`.md`) hoặc PDF tải về máy.

### 📅 Ngày 7: Unit Tests & Nghiệm thu Sprint 6
- [ ] Viết Unit Test cho `AiRateLimiterServiceTest` (test vượt ngưỡng trả 429) và `SmartReplyServiceTest` (test phân tích đúng 3 gợi ý).
- [ ] Chạy `./mvnw test` và `npm run build` PASS 100%.

---

## 5. BẢNG CHECKLIST WBS TUẦN 6 (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [ ] | **W6-TV1-01** | **TV1** | Entity `MessageReaction`, cột `reply_to_id` & Repository | 5h | Bảng `message_reactions` có unique constraint; không lỗi N+1 query. |
| [ ] | **W6-TV1-02** | **TV1** | Service & REST API Reaction, Reply & Phân trang Tin nhắn | 7h | Toggle reaction broadcast `/topic/chat/{id}/reaction`; API paged hoạt động mượt. |
| [ ] | **W6-TV1-03** | **TV1** | Giao diện Emoji Reaction Picker & Tooltip danh sách người thả | 6h | Rê chuột chọn 6 emoji nhanh; số đếm cập nhật realtime giữa 2 tab. |
| [ ] | **W6-TV1-04** | **TV1** | Giao diện Trả lời trích dẫn (Reply/Quote) & Tải thêm tin cũ | 8h | Bấm khối trích dẫn cuộn tới tin gốc; tải thêm tin cũ không giật vị trí cuộn. |
| [ ] | **W6-TV1-05** | **TV1** | Unit Tests Reaction, Reply & Pagination (`ChatServiceTest`) | 4h | Toàn bộ test suite Backend & Frontend build PASS 100%. |
| [ ] | **W6-TV2-01** | **TV2** | Cấu hình Coturn STUN/TURN Server & API `/api/call/ice-servers` | 6h | Service Coturn chạy ổn định trên Docker; Client nhận ICE config động. |
| [ ] | **W6-TV2-02** | **TV2** | Cơ chế ICE Restart (Auto-reconnect) & Adaptive Video Bitrate | 10h | Tự động kết nối lại sau khi rớt mạng ngắn; ưu tiên âm thanh khi mạng yếu. |
| [ ] | **W6-TV2-03** | **TV2** | Nâng cấp `CallLogs` thống kê chi tiết & UI `CallsPage` | 6h | Hiển thị bộ lọc loại cuộc gọi, thống kê thời lượng & gọi lại 1 click. |
| [ ] | **W6-TV2-04** | **TV2** | Unit Tests & Kiểm thử mô phỏng mạng yếu | 4h | Pass toàn bộ test backend và mô phỏng rớt mạng thành công. |
| [ ] | **W6-TV3-01** | **TV3** | Cơ chế Rate Limiting AI (`429 Too Many Requests`) & Bảo mật Key | 5h | Giới hạn request/phút theo user, bảo vệ API Key an toàn tuyệt đối. |
| [ ] | **W6-TV3-02** | **TV3** | Backend & API AI Smart Replies (`/smart-replies`) | 6h | Sinh đúng 3 gợi ý trả lời sát ngữ cảnh cuộc hội thoại. |
| [ ] | **W6-TV3-03** | **TV3** | UI 3 nút Smart Reply Pills & Modal Biên bản cuộc họp (Export MD/PDF) | 8h | Click pill gửi nhanh trong khung chat; xuất biên bản họp sắc nét. |
| [ ] | **W6-TV3-04** | **TV3** | Unit Tests `AiRateLimiterServiceTest` & `SmartReplyServiceTest` | 4h | `./mvnw test` & `npm run build` PASS 100%. |

---

## 6. CHECKLIST NGHIỆM THU CUỐI TUẦN 6 (SPRINT REVIEW GO / NO-GO)

- [ ] **Tiêu chí 1 (TV1):** Rê chuột vào tin nhắn thả Emoji (`👍 ❤️ 😂...`) -> đối phương thấy phản ứng xuất hiện tức thì không cần F5; bấm lại lần 2 sẽ gỡ cảm xúc.
- [ ] **Tiêu chí 2 (TV1):** Bấm Trả lời (Reply) một tin nhắn cũ -> gửi tin nhắn có kèm khối trích dẫn; bấm vào khối trích dẫn tự cuộn tới và làm sáng tin nhắn gốc; tải thêm tin cũ hoạt động trơn tru.
- [ ] **Tiêu chí 3 (TV2):** Cuộc gọi WebRTC sử dụng cấu hình STUN/TURN từ `/api/call/ice-servers`; khi ngắt mạng vài giây rồi bật lại, cuộc gọi tự động phục hồi (ICE Restart) không bị văng phòng.
- [ ] **Tiêu chí 4 (TV3):** Phía trên ô nhập tin nhắn hiển thị 3 nút gợi ý trả lời nhanh từ AI Smart Replies; gọi quá giới hạn request AI sẽ trả về thông báo giới hạn `429` thân thiện.
- [ ] **Tiêu chí 5 (Toàn đội):** Toàn bộ `./mvnw test` và `npm run build` đều PASS 100%.
