# KẾ HOẠCH CHI TIẾT TUẦN 1 (SPRINT 1) - TASK CHECKLIST
> **Dự án:** Ứng dụng Họp & Nhắn tin Trực tuyến (`promessagesapp` - Teams Clone)  
> **Thời gian thực hiện:** Tuần 1 (7 ngày)  
> **Quy mô đội ngũ:** 3 Thành viên (Fullstack theo phân hệ chức năng)  
> **Cách sử dụng tài liệu:** Các thành viên tích chọn `[x]` vào ô checkbox ngay sau khi hoàn thành công việc để báo cáo tiến độ hàng ngày (Daily Standup).

---

## 1. TỔNG QUAN TIẾN ĐỘ SPRINT 1

- [ ] **Tiến độ chung toàn đội:** `0%` (Chưa bắt đầu)
- [ ] **Mục tiêu 1:** Phân hệ Xác thực (Auth JWT) hoàn chỉnh từ Backend đến Frontend (TV1)
- [ ] **Mục tiêu 2:** WebSocket STOMP Broker hoạt động ổn định + Module xin quyền Mic/Cam (TV2)
- [ ] **Mục tiêu 3:** Khung App Shell Microsoft Teams hoàn chỉnh + Kết nối AI API thành công (TV3)

---

## 2. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 1 (AUTH, USER & CHAT CORE LEAD)
> **Nhánh Git:** `feature/w1-tv1-auth-jwt`  
> **Trọng tâm:** Xây dựng luồng đăng ký, đăng nhập, bảo mật JWT Spring Security và giao diện Auth phong cách Microsoft Teams.

### 📅 Ngày 1: Setup Cơ sở dữ liệu & Entity User
- [ ] **Sáng:** Tham gia họp Kick-off Sprint 1, chốt API Contract Auth cùng nhóm.
- [ ] **Sáng:** Chạy Docker PostgreSQL 16 & Redis 7 từ `docker-compose.yml`, kiểm tra kết nối qua PgAdmin (Port 5050).
- [ ] **Chiều:** Cấu hình DataSource PostgreSQL trong `src/main/resources/application.yml`.
- [ ] **Chiều:** Tạo Entity `User.java` (id: UUID, email: unique, passwordHash, displayName, avatarUrl, status: enum, createdAt, updatedAt).
- [ ] **Chiều:** Tạo enum `UserStatus.java` (`ONLINE`, `OFFLINE`, `BUSY`, `AWAY`).
- [ ] **Chiều:** Tạo interface `UserRepository.java` kế thừa `JpaRepository` với các method `findByEmail(String email)`, `existsByEmail(String email)`.

### 📅 Ngày 2: Triển khai Spring Security & JWT Token Provider
- [ ] **Sáng:** Cài đặt class `JwtTokenProvider.java`: hàm sinh token `generateToken(UserDetails)`, giải mã `getUsernameFromJwt(String token)` và kiểm tra `validateToken(String token)`.
- [ ] **Sáng:** Xây dựng `JwtAuthenticationFilter.java` kế thừa `OncePerRequestFilter`, trích xuất header `Authorization: Bearer <token>`.
- [ ] **Chiều:** Cấu hình `SecurityConfig.java`: vô hiệu hóa CSRF, thiết lập Session Stateless (`SessionCreationPolicy.STATELESS`).
- [ ] **Chiều:** Cấu hình CORS cho phép `http://localhost:5173` với đầy đủ HTTP Methods (GET, POST, PUT, DELETE, OPTIONS).
- [ ] **Chiều:** Khởi tạo bean `PasswordEncoder` sử dụng `BCryptPasswordEncoder`.
- [ ] **Chiều:** Viết class `CustomUserDetailsService.java` cài đặt `UserDetailsService` để nạp người dùng từ database.

### 📅 Ngày 3: Xây dựng REST API Auth & Request Validation
- [ ] **Sáng:** Tạo các DTO trong package `com.team17.chatapp.dto.auth`:
  - [ ] `RegisterRequest.java` (`@NotBlank email`, `@NotBlank password`, `@NotBlank displayName`).
  - [ ] `LoginRequest.java` (`@NotBlank email`, `@NotBlank password`).
  - [ ] `AuthResponse.java` (`token`, `tokenType`, `user: UserDto`).
  - [ ] `UserDto.java` (`id`, `email`, `displayName`, `avatarUrl`, `status`).
- [ ] **Chiều:** Xây dựng `AuthService.java` xử lý logic kiểm tra trùng email, băm mật khẩu, xác thực người dùng và sinh JWT.
- [ ] **Chiều:** Tạo `AuthController.java` với 3 endpoints:
  - [ ] `POST /api/auth/register` (Tạo tài khoản mới).
  - [ ] `POST /api/auth/login` (Xác thực và trả về JWT Token).
  - [ ] `GET /api/auth/me` (Lấy thông tin người dùng đang đăng nhập dựa trên token).
- [ ] **Chiều:** Xây dựng `GlobalExceptionHandler.java` bắt lỗi `@Valid` (`MethodArgumentNotValidException`) và `BadCredentialsException`.

### 📅 Ngày 4: Thiết lập Frontend Auth & Trang Đăng nhập
- [ ] **Sáng:** Nhận source base Frontend từ TV3, cài đặt thư viện `axios`.
- [ ] **Sáng:** Tạo file `src/services/apiClient.ts` cấu hình baseURL `http://localhost:8080/api` và Interceptor tự động gắn JWT Token vào Header.
- [ ] **Sáng:** Tạo file `src/services/authService.ts` bao gồm các hàm `login()`, `register()`, `getCurrentUser()`.
- [ ] **Chiều:** Xây dựng Component `LoginPage.tsx`:
  - [ ] Form nhập Email và Mật khẩu chuẩn thiết kế Microsoft Teams.
  - [ ] Kiểm tra tính hợp lệ dữ liệu ngay trên form (Client-side validation).
  - [ ] Nút "Đăng nhập" có hiệu ứng Loading spinner khi đang gửi request.
  - [ ] Hiển thị thông báo lỗi trực quan nếu sai tài khoản/mật khẩu.

### 📅 Ngày 5: Trang Đăng ký, Quản lý Auth State & Protected Routes
- [ ] **Sáng:** Xây dựng Component `RegisterPage.tsx`:
  - [ ] Form nhập Họ và tên (Display Name), Email, Mật khẩu và Xác nhận mật khẩu.
  - [ ] Bổ sung thanh chọn avatar mặc định ban đầu.
  - [ ] Chuyển hướng sang trang Login hoặc tự động đăng nhập sau khi tạo tài khoản thành công.
- [ ] **Chiều:** Xây dựng `AuthContext.tsx` hoặc Zustand store quản lý:
  - [ ] State: `currentUser`, `token`, `isAuthenticated`, `isLoading`.
  - [ ] Action: `login(token, user)`, `logout()`.
  - [ ] Lưu và đồng bộ Token trong `localStorage`.
- [ ] **Chiều:** Tạo Component `ProtectedRoute.tsx` bảo vệ các URL nội bộ (chuyển hướng về `/login` nếu chưa có token).

### 📅 Ngày 6: Viết Test Tầng Auth & Tinh chỉnh bảo mật
- [ ] **Sáng:** Viết Unit Test cho `AuthServiceTest.java` sử dụng Mockito (test đăng ký thành công, lỗi trùng email).
- [ ] **Chiều:** Viết Integration Test `AuthControllerIntegrationTest.java` với `MockMvc` (test luồng gọi API thực tế).
- [ ] **Chiều:** Kiểm thử thủ công các trường hợp ngoại lệ: token hết hạn, token sửa đổi trái phép, request thiếu Header.

### 📅 Ngày 7: Tích hợp chéo & Hoàn tất Pull Request
- [ ] **Sáng:** Gửi Token JWT mẫu và hướng dẫn giải mã cho TV2 (dùng cho WebSocket) và TV3 (dùng cho AI).
- [ ] **Sáng:** Kiểm tra toàn bộ mã nguồn, chạy `./mvnw clean test`.
- [ ] **Chiều:** Tạo Pull Request `feature/w1-tv1-auth-jwt` vào nhánh `develop`, xử lý phản hồi review code.
- [ ] **Chiều:** Tham gia Sprint Review: Trình diễn luồng Đăng ký -> Đăng nhập -> Lưu token -> Vào Dashboard.

---

## 3. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 2 (CALLING & WEBRTC LEAD)
> **Nhánh Git:** `feature/w1-tv2-webrtc-signaling`  
> **Trọng tâm:** Xây dựng hạ tầng WebSocket STOMP Server, xử lý sự kiện kết nối/ngắt kết nối và module xin quyền Media (Camera/Microphone) từ trình duyệt.

### 📅 Ngày 1: Cấu hình Spring WebSocket STOMP Server
- [x] **Sáng:** Tham gia họp Kick-off Sprint 1, thống nhất giao thức WebSocket Signaling.
- [x] **Sáng:** Vẽ sơ đồ tuần tự (Sequence Diagram) trao đổi bản tin Signaling giữa Frontend và Backend.
- [x] **Chiều:** Tạo class `WebSocketConfig.java` triển khai interface `WebSocketMessageBrokerConfigurer`.
- [x] **Chiều:** Đăng ký Stomp Endpoint: `registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS()`.
- [x] **Chiều:** Cấu hình Message Broker:
  - [x] Application Destination Prefix: `/app`
  - [x] Simple Broker Destination Prefixes: `/topic`, `/queue`
  - [x] User Destination Prefix: `/user`

### 📅 Ngày 2: Lắng nghe Sự kiện Kết nối & In-memory Session
- [x] **Sáng:** Xây dựng class `WebSocketEventListener.java`:
  - [x] Lắng nghe `@EventListener SessionConnectedEvent`: Ghi log session id kết nối mới.
  - [x] Lắng nghe `@EventListener SessionDisconnectEvent`: Ghi log session id ngắt kết nối.
- [x] **Chiều:** Tạo service `UserSessionRegistry.java` quản lý danh sách kết nối đang hoạt động trong bộ nhớ RAM.
- [x] **Chiều:** Định nghĩa lớp dữ liệu `SignalMessage.java` (gồm: `type`, `senderId`, `receiverId`, `payload`, `timestamp`).
- [x] **Chiều:** Định nghĩa enum `SignalType.java` (`PING`, `PONG`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`).

### 📅 Ngày 3: Tích hợp Xác thực JWT vào WebSocket Handshake
- [x] **Sáng:** Phối hợp cùng TV1 để lấy cấu trúc JWT Token.
- [x] **Sáng:** Tạo class `AuthChannelInterceptor.java` kế thừa `ChannelInterceptor`.
- [x] **Chiều:** Cài đặt phương thức `preSend()`:
  - [x] Kiểm tra frame STOMP lệnh `StompCommand.CONNECT`.
  - [x] Trích xuất token từ Native Header `Authorization`.
  - [x] Gọi `JwtTokenProvider` để xác thực token và trích xuất username.
  - [x] Khởi tạo `UsernamePasswordAuthenticationToken` và gán vào `accessor.setUser(user)`.
- [x] **Chiều:** Đăng ký `AuthChannelInterceptor` vào `configureClientInboundChannel()` trong `WebSocketConfig`.

### 📅 Ngày 4: Frontend Media Permissions (Camera & Microphone)
- [ ] **Sáng:** Tạo custom hook `src/hooks/useMediaStream.ts`:
  - [ ] Gọi hàm `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
  - [ ] Quản lý các trạng thái: `stream`, `isAudioMuted`, `isVideoDisabled`, `permissionStatus`, `errorMessage`.
- [ ] **Chiều:** Xử lý đầy đủ các kịch bản ngoại lệ phần cứng:
  - [ ] Người dùng nhấn "Block" quyền truy cập (`NotAllowedError`).
  - [ ] Máy tính không có Webcam hoặc Micro (`NotFoundError`).
  - [ ] Thiết bị đang bị ứng dụng khác chiếm quyền (`NotReadableError`).
- [ ] **Chiều:** Viết hàm dọn dẹp (cleanup) dừng tất cả media tracks khi unmount component (`track.stop()`).

### 📅 Ngày 5: STOMP Client & Giao diện Đo âm lượng Micro
- [ ] **Sáng:** Cài đặt thư viện `@stomp/stompjs` và `sockjs-client` trên Frontend.
- [ ] **Sáng:** Xây dựng `src/services/websocketService.ts`:
  - [ ] Khởi tạo đối tượng `Client` từ `@stomp/stompjs`.
  - [ ] Hàm `connect(token)` truyền token vào `connectHeaders`.
  - [ ] Tự động kết nối lại khi mất mạng (`reconnectDelay: 5000`).
  - [ ] Hàm `subscribe(topic, callback)` và `send(destination, body)`.
- [ ] **Chiều:** Tạo Component `AudioMeter.tsx`:
  - [ ] Sử dụng `AudioContext` và `AnalyserNode` của Web Audio API để phân tích âm lượng micro thời gian thực.
  - [ ] Hiển thị thanh đo âm lượng (VU meter) nhảy theo nhịp nói của người dùng.

### 📅 Ngày 6: Component Pre-Call Lobby & PoC Kết nối Hai chiều
- [ ] **Sáng:** Xây dựng Component `PreCallLobby.tsx` (Phòng chờ trước khi vào họp):
  - [ ] Khung Preview hình ảnh từ Webcam.
  - [ ] Nút Bật/Tắt Micro (`Mute / Unmute`) kèm icon trạng thái.
  - [ ] Nút Bật/Tắt Camera (`Video On / Off`) kèm hiệu ứng tắt đen màn hình xem trước.
  - [ ] Dropdown chọn danh sách thiết bị đầu vào (Microphone, Camera).
- [ ] **Chiều:** Viết Controller kiểm tra trên Backend: `@MessageMapping("/ping")` gửi lại thông điệp PONG qua `/user/queue/signals`.
- [ ] **Chiều:** Kiểm thử luồng gửi PING từ Frontend và nhận PONG trên console trình duyệt.

### 📅 Ngày 7: Tích hợp Token thật & Hoàn tất Pull Request
- [ ] **Sáng:** Thử nghiệm kết nối WebSocket bằng Token thật sinh ra từ tài khoản vừa đăng nhập của TV1.
- [ ] **Sáng:** Đảm bảo khi gửi token sai hoặc không gửi token thì server từ chối kết nối STOMP.
- [ ] **Chiều:** Tạo Pull Request `feature/w1-tv2-webrtc-signaling` vào nhánh `develop`, xử lý review code.
- [ ] **Chiều:** Tham gia Sprint Review: Trình diễn Pre-call Lobby (Webcam/Mic) và kết nối WebSocket hiển thị log session.

---

## 4. CHECKLIST CHI TIẾT CHO THÀNH VIÊN 3 (WHITEBOARD & AI LEAD)
> **Nhánh Git:** `feature/w1-tv3-teams-layout-ai`  
> **Trọng tâm:** Xây dựng bộ khung ứng dụng chuẩn Microsoft Teams (App Shell), cấu hình tích hợp Google Gemini API từ Backend và thiết kế cấu trúc dữ liệu Whiteboard.

### 📅 Ngày 1: Khởi tạo Dự án Frontend React Vite & Thiết lập Tailwind
- [x] **Sáng:** Tham gia họp Kick-off Sprint 1, thống nhất quy chuẩn kiến trúc Frontend.
- [x] **Sáng:** Tạo dự án Frontend bằng Vite: `npm create vite@latest frontend -- --template react-ts`.
- [x] **Chiều:** Cài đặt các package cần thiết:
  - [x] `lucide-react` (Bộ icon chuẩn phong cách Teams).
  - [x] `react-router-dom` (Định tuyến trang).
  - [x] `clsx` & `tailwind-merge` (Xử lý class CSS linh hoạt).
- [x] **Chiều:** Cấu hình file `tailwind.config.js` với bảng màu chuẩn Microsoft Teams:
  - [x] Màu thương hiệu (Teams Purple: `#464775`, `#6264A7`, `#5B5FC7`).
  - [x] Nền tối (Dark Background: `#201f1f`, Sub-dark: `#292929`, Border: `#383838`).
  - [x] Nền sáng (Light Background: `#f5f5f5`, White: `#ffffff`).

### 📅 Ngày 2: Xây dựng ActivityBar & TopHeader chuẩn Teams
- [ ] **Sáng:** Thiết kế Component `ActivityBar.tsx` (Thanh điều hướng biểu tượng dọc bên trái):
  - [ ] Các icon: Thông báo (Bell), Trò chuyện (MessageSquare), Nhóm/Kênh (Users), Cuộc gọi (PhoneCall), Bảng vẽ (Edit3), Trợ lý AI (Sparkles), Cài đặt (Settings).
  - [ ] Hiệu ứng Active: Vạch sáng màu tím ở mép trái icon đang chọn.
  - [ ] Tooltip hiển thị tên chức năng khi rê chuột qua icon.
- [ ] **Chiều:** Thiết kế Component `TopHeader.tsx` (Thanh tiêu đề trên cùng):
  - [ ] Ô tìm kiếm toàn cục (Search bar) có phím tắt `Ctrl + E`.
  - [ ] Avatar người dùng ở góc phải kèm chấm tròn trạng thái (Xanh lá - Online, Đỏ - Busy).
  - [ ] Dropdown Menu tài khoản: Xem thông tin cá nhân, Đổi trạng thái, Đăng xuất.

### 📅 Ngày 3: Ghép nối App Shell Layout & Bàn giao Khung Frontend
- [ ] **Sáng:** Xây dựng Component `AppShell.tsx`:
  - [ ] Ghép nối: TopHeader (trên cùng) + ActivityBar (trái ngoài cùng) + Sidebar động (cột danh sách) + Main Content (khung nội dung chính).
  - [ ] Khả năng thu gọn / mở rộng Sidebar bằng nút toggle.
- [ ] **Sáng:** Thiết lập hệ thống Route trong `src/routes/AppRoutes.tsx`:
  - [ ] `/chat` -> ChatPage (chờ TV1 ghép khung chat vào tuần 2).
  - [ ] `/calls` -> CallsPage (nhúng PreCallLobby của TV2).
  - [ ] `/whiteboard` -> WhiteboardPage.
  - [ ] `/ai-assistant` -> AiAssistantPage.
  - [ ] `/login` & `/register` -> Giao diện Auth của TV1.
- [ ] **Chiều:** Bàn giao khung source Frontend chuẩn cho TV1 và TV2, hướng dẫn cách clone và checkout nhánh.

### 📅 Ngày 4: Khảo sát & Cấu hình Google Gemini AI Backend
- [ ] **Sáng:** Đăng ký tài khoản Google AI Studio, lấy API Key Gemini (model `gemini-1.5-flash`).
- [ ] **Sáng:** Cấu hình biến môi trường an toàn trong `src/main/resources/application.yml`:
  ```yaml
  gemini:
    api-key: ${GEMINI_API_KEY}
    model: gemini-1.5-flash
    base-url: https://generativelanguage.googleapis.com/v1beta
  ```
- [ ] **Chiều:** Viết class cấu hình `AiConfig.java` khởi tạo `RestClient` hoặc `WebClient` với cấu hình connection timeout (5s) và read timeout (15s).

### 📅 Ngày 5: Xây dựng API AI Health Check & Test Prompt
- [ ] **Sáng:** Tạo các DTO cho phân hệ AI:
  - [ ] `AiPromptRequest.java` (`prompt`, `context`).
  - [ ] `AiPromptResponse.java` (`reply`, `status`, `tokensUsed`).
- [ ] **Sáng:** Xây dựng `AiClientService.java`:
  - [ ] Hàm `testConnection()` kiểm tra trạng thái hoạt động của Gemini API.
  - [ ] Hàm `sendPrompt(String prompt)` gửi câu hỏi và trích xuất câu trả lời văn bản.
  - [ ] Cơ chế Fallback: Trả về thông báo thân thiện nếu mất kết nối hoặc hết quota.
- [ ] **Chiều:** Tạo REST Controller `AiController.java`:
  - [ ] `GET /api/ai/health`: Kiểm tra sức khỏe kết nối AI.
  - [ ] `POST /api/ai/test-prompt`: Gửi câu hỏi thử nghiệm và nhận câu trả lời.
- [ ] **Chiều:** Kiểm thử bằng Postman, xác nhận Backend gọi sang Google Gemini thành công.

### 📅 Ngày 6: Thiết kế Schema Nét vẽ Whiteboard & Mockup Pages
- [ ] **Sáng:** Thiết kế cấu trúc dữ liệu lưu trữ nét vẽ Canvas (Vector Model):
  - [ ] Định nghĩa `WhiteboardShape.ts` trên Frontend:
    - `id`: chuỗi UUID duy nhất cho từng nét vẽ/vật thể.
    - `type`: `FREEHAND` | `RECTANGLE` | `CIRCLE` | `LINE` | `TEXT`.
    - `points`: mảng các tọa độ `[{x: number, y: number}]`.
    - `strokeColor`: mã màu hex.
    - `strokeWidth`: độ dày nét vẽ (1px - 20px).
    - `authorId`: ID người vẽ để phân biệt màu sắc con trỏ.
  - [ ] Tạo Entity/POJO tương ứng `WhiteboardData.java` bên Backend.
- [ ] **Chiều:** Xây dựng trang Mockup `WhiteboardPage.tsx` và `AiAssistantPage.tsx`:
  - [ ] Trang AI Assistant: Khung hội thoại mẫu, hiển thị badge xanh `● AI Engine Ready (Gemini Connected)`.
  - [ ] Nút bấm gọi API `/api/ai/health` trực tiếp từ Frontend để kiểm tra trạng thái liên thông.

### 📅 Ngày 7: Tích hợp Toàn hệ thống & Hoàn tất Pull Request
- [ ] **Sáng:** Hỗ trợ TV1 nhúng trang Login/Register vào router và TV2 nhúng PreCallLobby vào trang Calls.
- [ ] **Sáng:** Kiểm tra build production của Frontend: `npm run build` không phát sinh lỗi TypeScript.
- [ ] **Chiều:** Tạo Pull Request `feature/w1-tv3-teams-layout-ai` vào nhánh `develop`, review code chéo.
- [ ] **Chiều:** Tham gia Sprint Review: Trình diễn App Shell Teams, chuyển tab mượt mà và kết quả phản hồi của AI Health Check.

---

## 5. BẢNG CHECKLIST WBS THEO ĐẦU VIỆC (DEFINITION OF DONE)

| Trạng thái | Mã Task | Người phụ trách | Tên công việc chi tiết | Ước lượng | Tiêu chuẩn Hoàn thành (DoD) |
| :---: | :--- | :---: | :--- | :---: | :--- |
| [ ] | **W1-TV1-01** | **TV1** | Entity User, Role & Repository | 6h | Entity sinh đúng bảng `users` trong PostgreSQL, khóa chính UUID, email unique. |
| [ ] | **W1-TV1-02** | **TV1** | Spring Security & JwtTokenProvider | 8h | Sinh và validate JWT chuẩn; Filter chặn request trái phép, mở public API auth. |
| [ ] | **W1-TV1-03** | **TV1** | API Đăng ký, Đăng nhập, /me | 8h | Mã hóa BCrypt mật khẩu; 3 API trả về đúng format JSON; Postman test 200 OK. |
| [ ] | **W1-TV1-04** | **TV1** | Trang Login & Register chuẩn Teams | 8h | Giao diện đẹp, validate form ngay trên client, responsive tốt, thông báo lỗi rõ ràng. |
| [ ] | **W1-TV1-05** | **TV1** | Auth State, Axios Interceptor & Protected Routes | 6h | Lưu JWT vào localStorage; tự động gắn Bearer Token; chặn truy cập khi chưa login. |
| [ ] | **W1-TV1-06** | **TV1** | Unit Test Auth & Cấu hình CORS | 6h | `./mvnw test` xanh 100%; trình duyệt không gặp lỗi CORS khi gọi API. |
| [x] | **W1-TV2-01** | **TV2** | Cấu hình WebSocket STOMP Broker (`/ws`) | 6h | Endpoint `/ws` chạy SockJS; định tuyến đúng prefix `/app`, `/topic`, `/queue`. |
| [x] | **W1-TV2-02** | **TV2** | WebSocket Event Listener & In-memory Session | 6h | Bắt chính xác sự kiện Connect và Disconnect; in log `sessionId` người dùng rõ ràng. |
| [x] | **W1-TV2-03** | **TV2** | Channel Interceptor xác thực JWT qua STOMP | 8h | Chặn kết nối STOMP nếu token sai; gán đúng Principal user khi xác thực thành công. |
| [ ] | **W1-TV2-04** | **TV2** | Hook `useMediaStream` xin quyền Mic/Cam | 6h | Hiển thị popup xin quyền; xử lý đầy đủ các lỗi từ chối quyền hoặc thiếu thiết bị. |
| [ ] | **W1-TV2-05** | **TV2** | Component Media Device Checker (Preview Video/Audio) | 6h | Khung xem trước camera mượt mà; thanh âm lượng mic nhảy theo giọng nói; toggle mic/cam tốt. |
| [ ] | **W1-TV2-06** | **TV2** | PoC STOMP Client kết nối hai chiều | 8h | Frontend gửi PING, Backend nhận và phản hồi PONG thành công, hiển thị log trên console. |
| [ ] | **W1-TV3-01** | **TV3** | Khởi tạo Vite React TS & Tailwind Theme Tokens | 6h | Lệnh `npm run dev` chạy mượt mà; Tailwind nhận diện đúng bảng màu Teams (Dark/Light). |
| [ ] | **W1-TV3-02** | **TV3** | Xây dựng ActivityBar & TopHeader Teams | 8h | Thanh Activity Bar dọc và Top Header chuẩn pixel; tooltip và trạng thái avatar hoạt động tốt. |
| [ ] | **W1-TV3-03** | **TV3** | Dựng App Shell Layout & Cấu hình Router | 8h | MainLayout linh hoạt, Sidebar chuyển đổi đúng theo tab; route hoạt động không lỗi giật màn hình. |
| [ ] | **W1-TV3-04** | **TV3** | Cấu hình kết nối Gemini REST Client Backend | 6h | Ẩn an toàn API Key trong biến môi trường; khởi tạo RestClient gọi sang Google AI Studio. |
| [ ] | **W1-TV3-05** | **TV3** | Viết Service & API `GET /api/ai/health` | 6h | Endpoint trả về JSON trạng thái kết nối AI trong < 2 giây; có cơ chế try-catch fallback. |
| [ ] | **W1-TV3-06** | **TV3** | Thiết kế Schema dữ liệu nét vẽ Canvas & Mockup Page | 6h | Định nghĩa TypeScript & Model Java nét vẽ vector; trang Whiteboard và AI sẵn sàng cho Tuần 2. |

---

## 6. CHECKLIST NGHIỆM THU CUỐI TUẦN 1 (SPRINT REVIEW GO / NO-GO)
> **Thời gian đánh giá:** Chiều Thứ 7 (Ngày 7)  
> **Điều kiện Release Sprint 1:** Tất cả 8 tiêu chí bên dưới phải đạt dấu `[x]`.

- [ ] **Tiêu chí 1:** Hạ tầng Docker (PostgreSQL 16, Redis 7, PgAdmin) khởi động ổn định bằng lệnh `docker compose up -d`.
- [ ] **Tiêu chí 2:** Backend Spring Boot build thành công không lỗi cú pháp: `./mvnw clean compile`.
- [ ] **Tiêu chí 3:** Frontend React build production thành công không lỗi TypeScript: `npm run build`.
- [ ] **Tiêu chí 4:** Đăng ký tài khoản mới và Đăng nhập thành công, nhận JWT Token và lưu vào LocalStorage của trình duyệt.
- [ ] **Tiêu chí 5:** Chặn truy cập vào ứng dụng khi chưa đăng nhập (Protected Routes hoạt động đúng).
- [ ] **Tiêu chí 6:** Kết nối WebSocket STOMP handshake thành công và xác thực hợp lệ qua JWT Token.
- [ ] **Tiêu chí 7:** Trình duyệt xin quyền Camera/Micro thành công; hiển thị luồng video preview và thanh đo âm lượng nhảy theo giọng nói.
- [ ] **Tiêu chí 8:** App Shell Teams chuyển đổi mượt mà giữa các tab và API `GET /api/ai/health` trả về trạng thái Active của Google Gemini.
