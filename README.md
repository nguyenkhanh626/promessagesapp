# ProMessages - Nền Tảng Trò Chuyện & Gọi Thoại WebRTC Trực Tuyến

ProMessages là ứng dụng trò chuyện (Chat 1-1) và gọi thoại thời gian thực (WebRTC Audio Calling) được thiết kế theo phong cách giao diện hiện đại của **Microsoft Teams**.

---

## 📌 Các tính năng chính

1. **Xác thực & Bảo mật (Authentication):**
   - Đăng ký, đăng nhập bảo mật với JWT (JSON Web Token) và mã hóa mật khẩu BCrypt.
   - Tự động duy trì phiên đăng nhập và bảo vệ các tuyến đường (`ProtectedRoute`).

2. **Nhắn tin thời gian thực 1-1 (Real-time Chat):**
   - Tìm kiếm người dùng, tạo cuộc trò chuyện trực tiếp 1-1.
   - Nhắn tin tức thời với giao thức WebSocket STOMP (`/topic/chat/{conversationId}`).
   - Lưu trữ và tải lịch sử tin nhắn từ cơ sở dữ liệu PostgreSQL.

3. **Gọi thoại WebRTC 1-1 (Audio Calling):**
   - Bắt tay Signaling Server qua WebSocket STOMP (`/app/call/signal` & `/user/queue/signals`).
   - Kết nối đàm thoại âm thanh trực tiếp P2P qua WebRTC PeerConnection (sử dụng Google STUN servers).
   - Âm thanh chuông gọi đến và âm chờ nhấc máy tự sinh bằng Web Audio API (chuẩn âm thanh Teams).
   - Hộp thoại nhận cuộc gọi (`IncomingCallModal`), hộp thoại đàm thoại (`ActiveCallModal`) và thanh điều khiển thu nhỏ (`FloatingCallBar` - vừa gọi vừa chat).
   - Lịch sử cuộc gọi (`/calls`) phân loại rõ ràng: Cuộc gọi đến, Cuộc gọi đi, Cuộc gọi nhỡ, tính thời lượng đàm thoại chính xác.

4. **Trợ lý AI Gemini:**
   - Backend kết nối Google Gemini bằng API key lấy từ biến môi trường, không lưu khóa trong mã nguồn.
   - Trang `/ai-assistant` kiểm tra trạng thái Gemini và gửi prompt thử nghiệm.
5. **Bảng vẽ cộng tác:**
   - Trang `/whiteboard` và schema nét vẽ vector trên Frontend/Backend làm nền tảng cho chức năng cộng tác tuần 2.

---

## 🛠 Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

- **Git**
- **Docker Desktop** (hoặc Docker Engine & Docker Compose)
- **Java Development Kit (JDK):** JDK 17, 21 hoặc 25
- **Node.js:** Phiên bản 18.x trở lên & **npm**

---

## 🚀 Hướng dẫn khởi chạy ứng dụng (Quick Start)

### Bước 1: Khởi động Cơ sở dữ liệu & Dịch vụ phụ trợ (Docker)

Mở terminal tại thư mục gốc của dự án (`promessagesapp`) và chạy lệnh:

```bash
docker compose up -d
```

> **Lưu ý:** Đảm bảo Docker Desktop đang mở và đang chạy. Lệnh trên sẽ khởi chạy 3 container:
> - **PostgreSQL 16:** Cổng `5432` (Database: `chatapp_db`, User: `postgres`, Password: `password123`)
> - **Redis 7:** Cổng `6379`
> - **PgAdmin 4:** Cổng `5050` (Email: `admin@chatapp.com`, Password: `admin`)

Kiểm tra trạng thái container:
```bash
docker compose ps
```

---

### Bước 2: Khởi động Backend (Spring Boot)

Gemini API key là tùy chọn để ứng dụng khởi động, nhưng cần thiết để kiểm tra kết nối và gửi prompt. Tạo key trong Google AI Studio rồi đặt biến môi trường trong terminal chạy Backend; không đưa key vào `application.yml` hoặc Git:

- **Trên Windows PowerShell:**
  ```powershell
  $env:GEMINI_API_KEY = "your-google-ai-studio-api-key"
  ```
- **Trên Linux / macOS:**
  ```bash
  export GEMINI_API_KEY="your-google-ai-studio-api-key"
  ```

Tại thư mục gốc dự án, sử dụng Maven Wrapper để chạy Backend:

- **Trên Windows (PowerShell / Command Prompt):**
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```

- **Trên Linux / macOS:**
  ```bash
  ./mvnw spring-boot:run
  ```

Server Backend sẽ khởi động tại:  
👉 **API Server:** `http://localhost:8080`  
👉 **WebSocket Endpoint:** `ws://localhost:8080/ws`  
👉 **Kiểm tra trạng thái máy chủ:** `http://localhost:8080/api/call/status`
👉 **Kiểm tra Gemini (cần JWT):** `GET http://localhost:8080/api/ai/health`

---

### Bước 3: Khởi động Frontend (React + Vite)

Mở một cửa sổ Terminal mới, chuyển vào thư mục `frontend`:

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng Frontend sẽ chạy tại:  
👉 **Trang web:** `http://localhost:5173`

---

## 👥 Tài khoản thử nghiệm có sẵn

Bạn có thể đăng ký tài khoản mới trực tiếp trên giao diện, hoặc sử dụng 2 tài khoản mẫu đã được cấu hình sẵn trong cơ sở dữ liệu:

| Tài khoản | Email | Mật khẩu | Tên hiển thị |
| :--- | :--- | :--- | :--- |
| **Người dùng A** | `user1@gmail.com` | `Password123!` | Hoàng Phúc Hưng |
| **Người dùng B** | `user2@gmail.com` | `Password123!` | Nguyễn Thị B |

---

## 🧪 Kịch bản kiểm thử tính năng (Testing Guide)

Để trải nghiệm trọn vẹn tính năng nhắn tin và gọi thoại WebRTC 2 chiều:

1. **Mở 2 phiên trình duyệt song song:**
   - Cửa sổ thường: Truy cập `http://localhost:5173`, đăng nhập với tài khoản **User A** (`user1@gmail.com`).
   - Cửa sổ ẩn danh (Incognito): Truy cập `http://localhost:5173`, đăng nhập với tài khoản **User B** (`user2@gmail.com`).

2. **Kiểm tra Nhắn tin Real-time:**
   - Chọn cuộc trò chuyện giữa 2 người dùng.
   - Nhập tin nhắn và bấm **Gửi** (hoặc ấn `Enter`). Tin nhắn sẽ lập tức xuất hiện đồng thời ở cả 2 màn hình.

3. **Kiểm tra Gọi thoại WebRTC Audio:**
   - Tại màn hình chat của User A, nhấn biểu tượng **Điện thoại** (Phone icon) ở góc trên bên phải thanh tiêu đề cuộc trò chuyện.
   - Phía User A sẽ phát âm thanh chờ máy *"Đang đổ chuông..."*.
   - Phía User B sẽ lập tức nghe chuông reo và xuất hiện Modal xanh lá: **"Hoàng Phúc Hưng - Cuộc gọi thoại Teams đến..."**.
   - Phía User B nhấn **"Trả lời"**:
     - Cả 2 bên sẽ tự động kết nối qua luồng âm thanh WebRTC.
     - Thời gian đàm thoại đếm giây theo thời gian thực.
     - Bạn có thể nhấn biểu tượng **Mic** để bật/tắt micro, nhấn biểu tượng **Thu nhỏ** để vừa gọi thoại vừa tiếp tục nhắn tin.
   - Nhấn nút màu đỏ **"Kết thúc"** để ngắt cuộc gọi.

4. **Kiểm tra Lịch sử cuộc gọi:**
   - Nhấp vào mục **"Cuộc gọi"** trên thanh Activity Bar bên trái (`http://localhost:5173/calls`).
   - Toàn bộ danh sách cuộc gọi sẽ hiển thị đầy đủ:
     - Tên và avatar đối phương.
     - Phân loại rõ ràng: **Cuộc gọi đi** (tím), **Cuộc gọi đến** (xanh lá), **Cuộc gọi nhỡ** (đỏ).
     - Thời lượng đàm thoại và mốc thời gian cuộc gọi.
     - Bộ lọc theo tab và ô tìm kiếm theo tên người dùng.

---

## 📂 Cấu trúc thư mục chính

```text
promessagesapp/
├── docker-compose.yml          # Cấu hình container PostgreSQL, Redis, pgAdmin
├── pom.xml                     # Cấu hình dự án Maven & Spring Boot
├── src/                        # Mã nguồn Backend
│   ├── main/
│   │   ├── java/com/team17/chatapp/
│   │   │   ├── auth/           # Phân hệ Xác thực & Quản lý User (JWT, DTO, Repo, Service)
│   │   │   ├── calling/        # Phân hệ Cuộc gọi & Lịch sử WebRTC (CallSession, CallService, DTO)
│   │   │   ├── chat/           # Phân hệ Nhắn tin 1-1 (Conversation, Message, ChatService)
│   │   │   ├── config/         # Cấu hình Security, CORS, WebSocket STOMP
│   │   │   ├── controller/     # SignalingController điều phối WebRTC STOMP & REST API
│   │   │   └── websocket/      # Interceptor xác thực STOMP, Session Registry, Event Listener
│   │   └── resources/
│   │       └── application.yml # Cấu hình database, JPA, JWT, server port
│   └── test/                   # Toàn bộ 27 Unit & Integration Tests (100% PASS)
│
└── frontend/                   # Mã nguồn Frontend (React + Vite + TypeScript)
    ├── src/
    │   ├── components/         # TopHeader, ActivityBar, ChatWindow, ErrorBoundary...
    │   │   └── calling/        # IncomingCallModal, ActiveCallModal, FloatingCallBar
    │   ├── context/            # AuthContext (quản lý login), CallContext (State Machine WebRTC)
    │   ├── hooks/              # useMediaStream, useAudioCall, useChatWebSocket
    │   ├── pages/              # LoginPage, RegisterPage, ChatPage, CallsPage, WhiteboardPage, AiAssistantPage
    │   ├── services/           # apiClient, authService, chatService, callService, aiServiceice, signalingService, webrtcManager
    │   └── types/              # Type definitions (auth, chat, calling)
    ├── package.json
    └── vite.config.ts
```

---

## ❓ Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `Port 8080 was already in use`:**
   - Tiến trình Spring Boot cũ đang chạy ngầm. Hãy dừng tiến trình bằng lệnh:
     - Windows (PowerShell):
       ```powershell
       Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process -Force
       ```
     - Linux/macOS:
       ```bash
       fuser -k 8080/tcp
       ```

2. **Lỗi không kết nối được Docker daemon:**
   - Đảm bảo rằng ứng dụng **Docker Desktop** đã được mở và biểu tượng trạng thái hiển thị màu xanh lá (*Engine running*).

3. **Trình duyệt yêu cầu quyền Microphone:**
   - Khi thực hiện cuộc gọi WebRTC lần đầu, trình duyệt sẽ hiển thị popup yêu cầu cấp quyền Microphone. Hãy nhấn **"Allow" (Cho phép)** để truyền âm thanh đàm thoại.
