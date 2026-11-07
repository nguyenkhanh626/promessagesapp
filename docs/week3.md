# KẾ HOẠCH CHI TIẾT TUẦN 3 (SPRINT 3) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 3 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 3

- [ ] **Tiến độ chung toàn đội:** `40%` (Phân hệ Chat Nhóm, Quản lý Thành viên & Đính kèm Ảnh/File của TV1 đã hoàn thành 100%)
- [x] **Mục tiêu 1:** Hệ thống Chat Nhóm (`GROUP`), Quản lý thành viên nhóm (Thêm/Xóa/Rời nhóm) và Upload/Hiển thị Hình ảnh & Tệp đính kèm (TV1) - **ĐÃ HOÀN THÀNH 100%**
- [ ] **Mục tiêu 2:** Cuộc gọi Video 1-1 WebRTC P2P, giao diện Picture-in-Picture (PiP) và điều khiển Camera/Microphone (TV2)
- [ ] **Mục tiêu 3:** Công cụ vẽ hình học/văn bản, đồng bộ nét vẽ đa người dùng có Throttling & hiển thị con trỏ chuột (TV3)

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w3-tv1-group-chat-and-media`  
> **Trọng tâm:** Xây dựng hoàn chỉnh tính năng Chat Nhóm (`ConversationType.GROUP`), Quản lý danh sách thành viên nhóm (`ADMIN` / `MEMBER`), dịch vụ lưu trữ & tải lên hình ảnh/tệp đính kèm (`/api/files/upload`) và giao diện đa phương tiện chuẩn Microsoft Teams.

### 📅 Ngày 1: Mở rộng Mô hình Dữ liệu & DTOs cho Chat Nhóm và Tệp đính kèm
- [x] **Sáng:** Họp Sprint Planning Tuần 3, thống nhất quy tắc phân quyền nhóm (`ADMIN` tạo nhóm/xóa thành viên, `MEMBER` tham gia/rời nhóm) và cấu trúc lưu trữ tệp.
- [x] **Chiều:** Mở rộng `Message.java` bổ sung trường `fileName` (tên tệp gốc) và `fileSize` (dung lượng byte).
- [x] **Chiều:** Bổ sung phương thức truy vấn trong `ConversationMemberRepository.java` (`deleteByConversationIdAndUserId`, `countByConversationId`).
- [x] **Chiều:** Tạo bộ DTOs phục vụ nghiệp vụ nhóm và tải tệp:
  - [x] `ConversationMemberDto.java` (Thông tin thành viên kèm trạng thái Online/Offline và Role `ADMIN | MEMBER`).
  - [x] `CreateGroupConversationRequest.java` (Tên nhóm, avatar, danh sách `memberIds`).
  - [x] `AddGroupMembersRequest.java` (Danh sách `userIds` thêm mới vào nhóm).
  - [x] `UpdateGroupConversationRequest.java` (Đổi tên nhóm, cập nhật avatar nhóm).
  - [x] `FileUploadResponse.java` (Thông tin tệp sau khi tải lên, tự động phân loại `IMAGE` hoặc `FILE`).

### 📅 Ngày 2: Dịch vụ Lưu trữ Tệp & REST API Upload (`/api/files/upload`)
- [x] **Sáng:** Xây dựng `FileStorageService.java` và `FileStorageServiceImpl.java`:
  - [x] Tự động khởi tạo thư mục lưu trữ `uploads/` và cấu hình giới hạn dung lượng 25MB trong `application.yml`.
  - [x] Kiểm tra tính hợp lệ của tệp, chống lỗi Path Traversal (`..`), chuẩn hóa tên file gắn UUID duy nhất.
  - [x] Tự động nhận diện phần mở rộng và MIME type để phân loại `MessageType.IMAGE` (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`) hoặc `MessageType.FILE` (`pdf`, `docx`, `zip`, `txt`...).
- [x] **Chiều:** Tạo `FileController.java`:
  - [x] `POST /api/files/upload`: Nhận `MultipartFile`, lưu đĩa và trả về URL truy cập tệp.
  - [x] `GET /api/files/{fileName:.+}`: Phục vụ hiển thị ảnh trực tiếp (`inline`) hoặc tải tệp về máy (`attachment`).
  - [x] Cập nhật `SecurityConfig.java` cho phép trình duyệt tải tài nguyên tĩnh `GET /api/files/**` để thẻ `<img>` hiển thị mượt mà.

### 📅 Ngày 3: Nghiệp vụ Quản lý Nhóm & Thành viên (`ChatService` & `ConversationController`)
- [x] **Sáng:** Nâng cấp `ChatServiceImpl.java`:
  - [x] `createGroupConversation()`: Tạo nhóm mới, gán người tạo làm `ADMIN`, thêm các thành viên được mời làm `MEMBER`, tự động phát sinh tin nhắn hệ thống (`MessageType.SYSTEM`).
  - [x] `getConversationMembers()`: Lấy danh sách thành viên sắp xếp ưu tiên Quản trị viên (`ADMIN`) lên đầu.
  - [x] `addMembersToGroup()`: Thêm thành viên mới vào nhóm và phát thông báo hệ thống vào luồng chat.
  - [x] `removeMemberFromGroup()`: Kiểm tra quyền `ADMIN` khi mời thành viên ra khỏi nhóm hoặc cho phép thành viên tự rời nhóm.
  - [x] `updateGroupConversation()`: Cập nhật tên và ảnh đại diện nhóm.
- [x] **Chiều:** Mở rộng `ConversationController.java`:
  - [x] `POST /api/conversations/group`: Tạo nhóm chat mới.
  - [x] `PUT /api/conversations/{id}/group`: Cập nhật thông tin nhóm.
  - [x] `GET /api/conversations/{id}/members`: Lấy danh sách thành viên nhóm.
  - [x] `POST /api/conversations/{id}/members`: Thêm thành viên vào nhóm.
  - [x] `DELETE /api/conversations/{id}/members/{userId}`: Xóa thành viên hoặc rời nhóm.

### 📅 Ngày 4: Giao diện Modal Tạo Nhóm Mới (`CreateGroupModal`) & Bộ lọc Sidebar
- [x] **Sáng:** Cập nhật `frontend/src/types/chat.ts`, `apiClient.ts` (hỗ trợ `FormData` upload) và `chatService.ts`.
- [x] **Chiều:** Xây dựng Component `CreateGroupModal.tsx`:
  - [x] Ô nhập tên nhóm kèm kiểm tra hợp lệ.
  - [x] Tìm kiếm người dùng theo thời gian thực và chọn nhiều thành viên (Multi-select với checkbox).
  - [x] Hiển thị danh sách thành viên đã chọn dưới dạng thẻ Chip/Badge kèm nút xóa nhanh.
- [x] **Chiều:** Nâng cấp `ChatSidebar.tsx`:
  - [x] Bổ sung nút **"Tạo nhóm"** nổi bật trên thanh tiêu đề Sidebar.
  - [x] Bổ sung thanh lọc 3 tab: **Tất cả** | **Cá nhân** | **Nhóm**.
  - [x] Hiển thị biểu tượng nhóm và số lượng thành viên trên mỗi dòng hội thoại nhóm.

### 📅 Ngày 5: Giao diện Quản lý Thành viên Nhóm (`GroupMembersPanel`)
- [x] **Sáng:** Xây dựng Component `GroupMembersPanel.tsx` (Drawer bên phải khung chat):
  - [x] Hiển thị thông tin tổng quan của nhóm (Avatar nhóm, tên nhóm, tổng số thành viên).
  - [x] Danh sách thành viên kèm chấm trạng thái Online/Offline và huy hiệu **Admin** (biểu tượng vương miện vàng).
- [x] **Chiều:** Tích hợp thao tác quản trị ngay trên Panel:
  - [x] Khung tìm kiếm và nút **"Thêm thành viên mới"** trực tiếp vào nhóm đang mở.
  - [x] Nút **"Mời ra khỏi nhóm"** (chỉ hiển thị cho Quản trị viên nhóm).
  - [x] Nút **"Rời khỏi nhóm trò chuyện"** ở cuối bảng điều khiển.

### 📅 Ngày 6: Đính kèm & Hiển thị Hình ảnh / Tệp Tài liệu trong `ChatWindow`
- [x] **Sáng:** Nâng cấp thanh soạn thảo tin nhắn trong `ChatWindow.tsx`:
  - [x] Nút chọn Hình ảnh (`ImageIcon`) và nút đính kèm Tệp bất kỳ (`Paperclip`).
  - [x] Thanh xem trước (Attachment Preview Bar) hiển thị ảnh thu nhỏ (Thumbnail), tên tệp, dung lượng (KB/MB) và nút hủy trước khi gửi.
- [x] **Chiều:** Render đa phương tiện trong luồng tin nhắn:
  - [x] Tin nhắn `SYSTEM`: Hiển thị dạng nhãn thông báo căn giữa cho các sự kiện tạo nhóm, thêm/rời thành viên.
  - [x] Tin nhắn `IMAGE`: Hiển thị ảnh bo góc sắc nét, hỗ trợ click mở **Lightbox phóng to toàn màn hình** và tải ảnh gốc.
  - [x] Tin nhắn `FILE`: Hiển thị thẻ tài liệu (File Card) chuẩn Teams kèm dung lượng và nút **Tải xuống trực tiếp (`Download`)**.

### 📅 Ngày 7: Kiểm thử Tự động (Unit Tests) & Nghiệm thu Sprint 3
- [x] **Sáng:** Mở rộng `ChatServiceTest.java` (kiểm thử tạo nhóm, thêm thành viên, chặn thành viên thường xóa người khác, gửi tin nhắn ảnh).
- [x] **Sáng:** Viết mới `FileStorageServiceTest.java` (kiểm thử lưu ảnh `IMAGE`, lưu tài liệu `FILE`, bắt lỗi file rỗng).
- [x] **Chiều:** Chạy `./mvnw test` đạt 100% PASS (22/22 test cases) và `npm run build` thành công không lỗi TypeScript.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w3-tv2-video-call-1-1`  
> **Trọng tâm:** Nâng cấp WebRTC từ Audio-only lên Video Call 1-1 P2P, giao diện Picture-in-Picture (PiP), điều khiển bật/tắt Camera & chọn thiết bị đầu vào.

- [ ] Mở rộng Signaling Server hỗ trợ đàm phán Video SDP tracks và trạng thái bật/tắt camera.
- [ ] Nâng cấp `useMediaStream` hỗ trợ `{ audio: true, video: true }` và hàm `toggleVideo()`.
- [ ] Xây dựng giao diện Video Call 1-1 với video đối phương toàn màn hình và video bản thân ở góc nhỏ (PiP).
- [ ] Bổ sung bộ chọn thiết bị đầu vào (Microphone / Camera selector).

---

## 4. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 3 (WHITEBOARD & AI LEAD)
> **Nhánh Git:** `feature/w3-tv3-whiteboard-sync`  
> **Trọng tâm:** Bổ sung công cụ vẽ hình học, hộp văn bản Text box, đồng bộ con trỏ chuột nhiều người dùng và cơ chế Throttling/Debouncing.

- [ ] Xây dựng công cụ vẽ Hình chữ nhật, Hình tròn, Đường thẳng, Mũi tên và Hộp văn bản (Text box).
- [ ] Hiển thị con trỏ chuột thời gian thực kèm tên của các thành viên khác đang vẽ trên bảng.
- [ ] Cài đặt cơ chế gom cụm tọa độ nét vẽ (Throttling) trước khi gửi qua WebSocket STOMP.
- [ ] Xây dựng API lưu trữ và khôi phục Snapshot bảng vẽ định dạng JSON trong Database.

---

## 5. BẢNG CHECKLIST WBS TUẦN 3 (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [x] | **W3-TV1-01** | **TV1** | Mở rộng Entity & DTOs cho Group Chat & File | 4h | Đầy đủ thông tin vai trò thành viên, tên tệp và kích thước tệp. |
| [x] | **W3-TV1-02** | **TV1** | Dịch vụ Lưu trữ & API Upload File (`/api/files/upload`) | 6h | Upload ảnh/tài liệu thành công, phân loại đúng `IMAGE` / `FILE`, tải/xem trực tiếp. |
| [x] | **W3-TV1-03** | **TV1** | Nghiệp vụ & REST API Tạo nhóm, Thêm/Xóa thành viên | 8h | Tạo nhóm gán Admin, thêm/xóa/rời nhóm phát sinh tin nhắn hệ thống chuẩn xác. |
| [x] | **W3-TV1-04** | **TV1** | Giao diện `CreateGroupModal` & Bộ lọc Nhóm trên Sidebar | 6h | Chọn nhiều thành viên, tạo nhóm tức thì, lọc danh sách Cá nhân / Nhóm mượt mà. |
| [x] | **W3-TV1-05** | **TV1** | Giao diện `GroupMembersPanel` quản lý thành viên | 6h | Xem danh sách thành viên, thêm người mới, Admin xóa thành viên, rời nhóm. |
| [x] | **W3-TV1-06** | **TV1** | Đính kèm Ảnh/File & Lightbox xem ảnh trong `ChatWindow` | 8h | Preview tệp trước khi gửi, hiển thị ảnh inline + Lightbox, thẻ tải file trực tiếp. |
| [x] | **W3-TV1-07** | **TV1** | Unit Tests `ChatServiceTest` & `FileStorageServiceTest` | 4h | Toàn bộ test suite Backend & Frontend build PASS 100%. |
