import { Navigate, Route, Routes } from 'react-router-dom'
import { ActivityBar } from './components/ActivityBar'
import { TopHeader } from './components/TopHeader'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { CallProvider } from './context/CallContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ChatPage } from './pages/ChatPage'
import { CallsPage } from './pages/CallsPage'
import { IncomingCallModal } from './components/calling/IncomingCallModal'
import { ActiveCallModal } from './components/calling/ActiveCallModal'
import { FloatingCallBar } from './components/calling/FloatingCallBar'
import './App.css'

const placeholderPages = [
  { path: 'activity', title: 'Hoạt động', description: 'Thông báo và cập nhật của bạn sẽ xuất hiện tại đây.' },
  { path: 'teams', title: 'Nhóm', description: 'Không gian nhóm và các kênh làm việc của bạn.' },
  { path: 'whiteboard', title: 'Bảng vẽ', description: 'Không gian cộng tác bảng vẽ trực tuyến.' },
  { path: 'ai-assistant', title: 'Trợ lý AI', description: 'Trò chuyện với trợ lý AI của nhóm.' },
  { path: 'settings', title: 'Cài đặt', description: 'Tùy chỉnh trải nghiệm ứng dụng.' },
  { path: 'profile', title: 'Thông tin cá nhân', description: 'Thông tin tài khoản của bạn.' },
]

function TeamsLayout() {
  return (
    <div className="teams-app relative">
      <TopHeader />
      <div className="teams-workspace">
        <ActivityBar />
        <main className="page-content overflow-hidden">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="calls" element={<CallsPage />} />
              {placeholderPages.map(({ path, title, description }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <section className="page-placeholder">
                      <p className="eyebrow">PROMESSAGES</p>
                      <h1>{title}</h1>
                      <p>{description}</p>
                    </section>
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Các Modal và Thanh điều khiển cuộc gọi WebRTC toàn cục */}
      <ErrorBoundary>
        <IncomingCallModal />
        <ActiveCallModal />
        <FloatingCallBar />
      </ErrorBoundary>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CallProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <TeamsLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </CallProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
