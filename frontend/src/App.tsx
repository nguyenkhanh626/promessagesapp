import { Navigate, Route, Routes } from 'react-router-dom'
import { ActivityBar } from './components/ActivityBar'
import { TopHeader } from './components/TopHeader'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ChatPage } from './pages/ChatPage'
import './App.css'

const placeholderPages = [
  { path: 'activity', title: 'Hoạt động', description: 'Thông báo và cập nhật của bạn sẽ xuất hiện tại đây.' },
  { path: 'teams', title: 'Nhóm', description: 'Không gian nhóm và các kênh làm việc của bạn.' },
  { path: 'calls', title: 'Cuộc gọi', description: 'Lịch sử và các cuộc gọi của bạn.' },
  { path: 'whiteboard', title: 'Bảng vẽ', description: 'Không gian cộng tác bảng vẽ trực tuyến.' },
  { path: 'ai-assistant', title: 'Trợ lý AI', description: 'Trò chuyện với trợ lý AI của nhóm.' },
  { path: 'settings', title: 'Cài đặt', description: 'Tùy chỉnh trải nghiệm ứng dụng.' },
  { path: 'profile', title: 'Thông tin cá nhân', description: 'Thông tin tài khoản của bạn.' },
]

function TeamsLayout() {
  return (
    <div className="teams-app">
      <TopHeader />
      <div className="teams-workspace">
        <ActivityBar />
        <main className="page-content overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
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
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}

export default App
