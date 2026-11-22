# KẾ HOẠCH CHI TIẾT TUẦN 7 (SPRINT 7 - FINAL RELEASE) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 7 (7 ngày — Tuần hoàn thiện & bàn giao cuối cùng)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Mục tiêu tuần:** Hoàn thiện giao diện Dark/Light Mode & Responsive toàn hệ thống + Kiểm thử tải WebSocket (TV1); Docker hóa toàn bộ hệ thống (Backend + Frontend + PostgreSQL + Redis + Coturn) & Cấu hình bảo mật HTTPS/WSS (TV2); Kiểm thử E2E liên thông toàn bộ phân hệ, tài liệu vận hành `README.md`, Swagger API Docs, Slide & Video Demo báo cáo (TV3); UAT tổng duyệt chốt Release v1.0.0 (Cả 3 thành viên).  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để theo dõi sát tiến độ chốt bàn giao.

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 7 (RELEASE v1.0.0)

- [ ] **Tiến độ chung toàn đội:** `0%`
- [ ] **Mục tiêu 1 (TV1):** Hoàn thiện UI/UX Dark/Light Mode chuẩn Microsoft Teams, tối ưu Responsive trên Laptop nhỏ & Tablet, bổ sung Integration Tests cho Auth/User/Chat và kịch bản Load Test 50–100 kết nối WebSocket đồng thời.
- [ ] **Mục tiêu 2 (TV2):** Viết `Dockerfile` tối ưu (Multi-stage build) cho Backend Spring Boot & Frontend React/Nginx, hoàn thiện `docker-compose.yml` chạy trọn gói 1 lệnh, cấu hình SSL/TLS (HTTPS & WSS) để bật Camera/Mic trên mạng LAN/Internet.
- [ ] **Mục tiêu 3 (TV3):** Kiểm thử End-to-End (E2E) kịch bản kết hợp toàn hệ thống, tích hợp Swagger/OpenAPI Documentation, viết `README.md` chuẩn triển khai, hoàn thiện Slide thuyết trình & Video Demo sản phẩm.
- [ ] **Mục tiêu chung (Cả 3 thành viên):** Tổng duyệt UAT, rà soát lỗi chéo (Cross-testing), dọn dẹp cảnh báo build và gắn tag phát hành `v1.0.0`.

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w7-tv1-polish-theme-and-load-tests`  
> **Trọng tâm:** Nâng tầm trải nghiệm UI/UX toàn hệ thống với chuyển đổi **Dark / Light Mode** mượt mà, tối ưu Responsive cho mọi kích thước màn hình, hoàn thiện bộ Integration Tests cho phân hệ Auth/Chat và kiểm thử tải WebSocket.

### 📅 Ngày 1-2: Hệ thống Theme Switcher (Dark Mode / Light Mode chuẩn Microsoft Teams)
- [ ] **Ngày 1:** Xây dựng `ThemeContext.tsx` (`frontend/src/context/ThemeContext.tsx`) hỗ trợ chuyển đổi `dark` / `light`, tự động lưu vào `localStorage` và gắn class `dark` vào thẻ `<html>`.
- [ ] **Ngày 2:** Thêm nút chuyển đổi giao diện Sáng / Tối (`Sun` / `Moon`) trên `TopHeader.tsx` và tinh chỉnh bộ biến màu CSS (`index.css`) cho `TeamsLayout`, `ChatSidebar`, `ChatWindow`, `ConversationAssetsDrawer`, `LoginPage`, `RegisterPage` đảm bảo độ tương phản sắc nét ở cả 2 chế độ.

### 📅 Ngày 3: Tối ưu Responsive (Tablet & Laptop Màn hình Nhỏ) + Polish UI/UX
- [ ] Tối ưu bố cục `ChatPage`, `ChatSidebar`, `ChatWindow`, `GroupMembersPanel` và `ConversationAssetsDrawer` trên màn hình `768px – 1280px`:
  - [ ] Tự động chuyển các Drawer bên phải thành lớp phủ (overlay drawer) trên màn hình nhỏ để không làm bóp hẹp khung tin nhắn.
  - [ ] Bổ sung nút đóng/mở danh sách hội thoại (Sidebar toggle) trên màn hình hẹp.
  - [ ] Rà soát trạng thái Loading Skeleton, Empty State, thông báo Toast lỗi/thành công thân thiện xuyên suốt ứng dụng.

### 📅 Ngày 4-5: Integration Tests Toàn diện (Auth, User & Conversation Controllers)
- [ ] **Ngày 4:** Bổ sung `ConversationControllerTest.java` (`@WebMvcTest` / `MockMvc`):
  - [ ] Test toàn bộ luồng REST API: tạo chat 1-1, tạo nhóm, thêm/xóa thành viên, gửi tin nhắn, ghim tin nhắn, thả reaction, tải thư viện media, tìm kiếm tin nhắn.
  - [ ] Kiểm tra các trường hợp bảo mật: từ chối truy cập khi thiếu JWT (`401`), chặn thành viên ngoài phòng (`403`), validate đầu vào sai (`400`).
- [ ] **Ngày 5:** Bổ sung kiểm thử `FileControllerTest.java` (upload ảnh/PDF, chặn path traversal `..`, trả đúng header `inline` / `attachment`).

### 📅 Ngày 6: Kiểm thử Tải WebSocket Đồng thời (50–100 Kết nối Chat)
- [ ] Viết kịch bản kiểm thử tải nhẹ (`scripts/ws-load-test.mjs` hoặc JUnit stress test) mở đồng thời 50–100 phiên STOMP WebSocket cùng subscribe `/topic/chat/{id}` và gửi tin nhắn liên tục.
- [ ] Ghi nhận thông số: Độ trễ trung bình (p50/p95 latency), tỷ lệ tin nhắn đến đầy đủ (100%), mức tiêu thụ RAM/CPU của JVM — lưu kết quả vào báo cáo tuần 7.

### 📅 Ngày 7: Rà soát Chéo (Cross-Testing) & Tổng duyệt UAT
- [ ] Kiểm tra chéo luồng gọi video của TV2 và bảng vẽ/AI của TV3 trên cả Dark Mode & Light Mode.
- [ ] Xác nhận toàn bộ `./mvnw test` và `npm run build` PASS 100%, chuẩn bị phần trình bày demo phân hệ Auth & Realtime Chat.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w7-tv2-docker-https-and-deployment`  
> **Trọng tâm:** Đóng gói trọn bộ ứng dụng bằng Docker (Backend + Frontend + DB + Redis + Coturn), cấu hình SSL/TLS (HTTPS & WSS) để WebRTC hoạt động hoàn hảo trên mạng LAN/Internet và kiểm thử gọi nhóm thực tế 3–4 thiết bị.

### 📅 Ngày 1-2: Viết Multi-stage `Dockerfile` cho Backend & Frontend
- [ ] **Ngày 1:** Tạo `Dockerfile` ở thư mục gốc cho Backend Spring Boot:
  - [ ] Stage 1 (`build`): Dùng image JDK/Maven build ra file JAR production (`./mvnw package -DskipTests`).
  - [ ] Stage 2 (`runtime`): Dùng JRE gọn nhẹ chạy ứng dụng, mount volume `/app/uploads` để lưu bền vững ảnh/tệp người dùng gửi.
- [ ] **Ngày 2:** Tạo `frontend/Dockerfile` và `frontend/nginx.conf`:
  - [ ] Stage 1 (`build`): Build bundle tĩnh bằng `npm ci && npm run build`.
  - [ ] Stage 2 (`nginx:alpine`): Phục vụ SPA React (fallback `try_files $uri /index.html`), cấu hình Reverse Proxy cho `/api/**` -> Backend và nâng cấp giao thức WebSocket `/ws/**` (`Upgrade`, `Connection "upgrade"`).

### 📅 Ngày 3-4: Hoàn thiện `docker-compose.yml` Trọn gói & Cấu hình SSL/TLS (HTTPS / WSS)
- [ ] **Ngày 3:** Nâng cấp `docker-compose.yml` tích hợp đầy đủ 5–6 services chạy bằng **1 lệnh duy nhất (`docker compose up -d --build`)**:
  - [ ] `postgres` (PostgreSQL 16 + healthcheck)
  - [ ] `redis` (Redis 7)
  - [ ] `coturn` (STUN/TURN Server)
  - [ ] `backend` (Spring Boot API + WebSocket STOMP)
  - [ ] `frontend` (React + Nginx Reverse Proxy)
  - [ ] Tạo file `.env.example` mẫu chứa đầy đủ biến môi trường (`JWT_SECRET`, `GEMINI_API_KEY`, `TURN_USER`, `TURN_PASS`, `DB_PASSWORD`).
- [ ] **Ngày 4:** Cấu hình chứng chỉ SSL/TLS cho Nginx (tự ký qua `mkcert` / OpenSSL cho mạng LAN hoặc Let's Encrypt cho domain):
  - [ ] Bật HTTPS cổng `443` và tự động nâng cấp WebSocket sang `wss://` khi truy cập qua HTTPS (cập nhật động URL `ws://` / `wss://` theo `window.location.protocol` ở Frontend thay vì hardcode `localhost:8080`).

### 📅 Ngày 5-6: Kiểm thử Hội nghị Video Nhóm 3–4 Thiết bị trên Mạng LAN (HTTPS/WSS)
- [ ] Triển khai chạy thử qua Docker trên máy chủ nội bộ, truy cập từ 3–4 máy tính/điện thoại khác nhau trong mạng LAN qua địa chỉ `https://<LAN-IP>`.
- [ ] Kiểm chứng toàn diện: Cấp quyền Camera & Microphone thành công trên HTTPS, cuộc gọi nhóm 3–4 người hiển thị mượt, Chia sẻ màn hình rõ nét, âm thanh không vọng, ICE Restart hoạt động ổn định.

### 📅 Ngày 7: Hoàn thiện Tài liệu Triển khai & Tổng duyệt UAT
- [ ] Phối hợp với TV3 bổ sung mục hướng dẫn chạy Docker & HTTPS/WSS vào `README.md`.
- [ ] Kiểm thử chéo tính năng chat của TV1 và AI/Whiteboard của TV3 trên môi trường Docker production.

---

## 4. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 3 (WHITEBOARD & AI ASSISTANT LEAD)
> **Nhánh Git:** `feature/w7-tv3-e2e-docs-and-demo`  
> **Trọng tâm:** Kiểm thử End-to-End (E2E) kịch bản kết hợp toàn bộ tính năng, tích hợp Swagger/OpenAPI Documentation, soạn thảo `README.md` chuyên nghiệp và chuẩn bị Slide + Video Demo báo cáo tổng kết.

### 📅 Ngày 1-2: Tích hợp Swagger / OpenAPI Documentation & Chuẩn hóa Tài liệu API
- [ ] **Ngày 1:** Thêm `springdoc-openapi-starter-webmvc-ui` vào `pom.xml` (hoặc tài liệu OpenAPI chuẩn `docs/api-spec.yaml`), cấu hình Bearer JWT Authorize trên Swagger UI (`/swagger-ui/index.html`).
- [ ] **Ngày 2:** Gắn mô tả rõ ràng cho toàn bộ nhóm API: Auth (`/api/auth/**`), Chat & Group (`/api/conversations/**`), Files (`/api/files/**`), Calling (`/api/call/**`), Whiteboard (`/api/whiteboard/**`), AI Copilot (`/api/ai/**`).

### 📅 Ngày 3-4: Kiểm thử End-to-End (E2E) Kịch bản Kết hợp Toàn Hệ thống
- [ ] Viết tài liệu kịch bản kiểm thử UAT (`docs/uat-checklist.md`) và thực thi kiểm thử liên thông từ đầu đến cuối:
  1. Đăng ký/Đăng nhập 3 tài khoản -> kiểm tra trạng thái Online/Busy/Away.
  2. Tạo nhóm chat mới -> nhắn tin realtime, thả Emoji reaction, Reply trích dẫn, gắn cờ Quan trọng, Ghim tin nhắn, gửi ảnh & xem trước PDF trực tiếp.
  3. Bắt đầu cuộc họp Video nhóm 3 người -> Chia sẻ màn hình -> Bật Bảng vẽ Split-screen cùng vẽ hình học + con trỏ đa người dùng -> Xuất bảng vẽ ra PNG/PDF.
  4. Triệu hồi `@AI-Assistant` trong khung chat -> Dùng 3 gợi ý Smart Replies -> Mở Modal **"✨ Tóm tắt AI"** xuất Biên bản cuộc họp kèm Action Items.
- [ ] Ghi nhận mọi lỗi phát sinh (nếu có) thành danh sách bug để cả 3 thành viên fix dứt điểm trước Ngày 6.

### 📅 Ngày 5: Hoàn thiện `README.md` Chuẩn Chuyên nghiệp
- [ ] Viết lại `README.md` ở thư mục gốc đầy đủ, mạch lạc:
  - [ ] Giới thiệu dự án & Kiến trúc hệ thống (Sơ đồ Mermaid).
  - [ ] Danh sách tính năng nổi bật theo 3 trụ cột (Chat, WebRTC, Whiteboard & AI).
  - [ ] Hướng dẫn cài đặt chạy Local (Maven + Vite) và chạy Docker trọn gói (`docker compose up -d --build`).
  - [ ] Danh sách biến môi trường (`.env.example`), tài khoản demo mẫu và ảnh chụp màn hình ứng dụng.

### 📅 Ngày 6-7: Chuẩn bị Slide Thuyết trình & Quay Video Demo Sản phẩm
- [ ] **Ngày 6:** Thiết kế Slide thuyết trình báo cáo đồ án (15–20 slide): Bài toán, Kiến trúc kỹ thuật, Phân chia vai trò 3 thành viên, Demo tính năng nổi bật, Kết quả kiểm thử (Unit Test + Load Test + E2E) & Hướng phát triển.
- [ ] **Ngày 7:** Quay video demo hoàn chỉnh (3–5 phút, Full HD, có phụ đề/thuyết minh từng luồng chức năng chính) để dự phòng khi thuyết trình trực tiếp; cùng TV1 & TV2 chốt phiên bản Release `v1.0.0`.

---

## 5. BẢNG CHECKLIST WBS TUẦN 7 (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [ ] | **W7-TV1-01** | **TV1** | Dark / Light Mode Theme Switcher & Tinh chỉnh Responsive | 8h | Chuyển đổi Sáng/Tối mượt mà không vỡ màu; hiển thị đẹp trên Tablet/Laptop nhỏ. |
| [ ] | **W7-TV1-02** | **TV1** | Integration Tests `ConversationControllerTest` & `FileControllerTest` | 8h | Bao phủ đầy đủ mã HTTP `200/201/400/401/403`, `./mvnw test` PASS 100%. |
| [ ] | **W7-TV1-03** | **TV1** | Kịch bản Load Test 50–100 kết nối WebSocket Chat đồng thời | 6h | Tin nhắn phân phối đầy đủ 100%, đo và lưu số liệu latency p50/p95. |
| [ ] | **W7-TV2-01** | **TV2** | Multi-stage `Dockerfile` Backend & Frontend + Nginx Reverse Proxy | 8h | Build image thành công, dung lượng gọn, proxy REST + WebSocket ổn định. |
| [ ] | **W7-TV2-02** | **TV2** | `docker-compose.yml` Full-stack & Cấu hình SSL/TLS (HTTPS/WSS) | 8h | Chạy 1 lệnh lên đủ 5 service; trình duyệt cấp quyền Cam/Mic qua HTTPS. |
| [ ] | **W7-TV2-03** | **TV2** | Kiểm thử Video Call Nhóm 3–4 thiết bị trên mạng LAN thực tế | 6h | Gọi 3–4 thiết bị mượt mà, chia sẻ màn hình & âm thanh ổn định. |
| [ ] | **W7-TV3-01** | **TV3** | Swagger/OpenAPI Docs & Kịch bản Kiểm thử E2E (`docs/uat-checklist.md`) | 8h | Truy cập `/swagger-ui` test API được; vượt qua toàn bộ luồng E2E kết hợp. |
| [ ] | **W7-TV3-02** | **TV3** | Hoàn thiện `README.md`, Slide Thuyết trình & Video Demo | 10h | Tài liệu cài đặt rõ ràng; Slide đẹp và Video Demo Full HD sắc nét. |
| [ ] | **W7-ALL-01** | **Cả nhóm** | Tổng duyệt UAT, Fix lỗi chéo & Gắn tag Release `v1.0.0` | 6h | Không còn bug nghiêm trọng, nhánh `main` build & test xanh 100%. |

---

## 6. CHECKLIST NGHIỆM THU BÀN GIAO CUỐI DỰ ÁN (FINAL RELEASE v1.0.0)

- [ ] **Tiêu chí 1 (Tính đầy đủ):** Toàn bộ 3 phân hệ cốt lõi (Chat & Auth, Hội nghị WebRTC, Whiteboard & AI Copilot) hoạt động liên thông mượt mà không lỗi console.
- [ ] **Tiêu chí 2 (Chất lượng mã nguồn):** Toàn bộ Unit Test & Integration Test (`./mvnw test`) và Frontend Production Build (`npm run build`) đều đạt 100% PASS.
- [ ] **Tiêu chí 3 (Triển khai Docker & Bảo mật):** Chạy thành công toàn bộ hệ thống bằng `docker compose up -d --build`; hỗ trợ HTTPS/WSS và bảo vệ bí mật qua `.env`.
- [ ] **Tiêu chí 4 (Hiệu năng):** Vượt qua bài kiểm thử tải 50–100 kết nối WebSocket chat đồng thời và cuộc gọi video nhóm 3–4 người ổn định.
- [ ] **Tiêu chí 5 (Tài liệu & Báo cáo):** Đầy đủ `README.md`, tài liệu API Swagger, Slide thuyết trình, Video Demo và gắn tag `v1.0.0` trên GitHub.
