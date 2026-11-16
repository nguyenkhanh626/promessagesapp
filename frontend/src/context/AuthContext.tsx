import React, { createContext, useContext, useEffect, useState } from 'react'
import type { LoginPayload, RegisterPayload, User } from '../types/auth'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function verifyAuth() {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          const userData = await authService.getCurrentUser()
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    verifyAuth()
  }, [])

  // Đồng bộ phiên đăng nhập giữa nhiều tab trên cùng trình duyệt
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return

      // Trường hợp xóa toàn bộ localStorage hoặc xóa token (Logout ở tab khác)
      if (event.key === null || (event.key === 'token' && !event.newValue)) {
        setToken(null)
        setUser(null)
        return
      }

      // Trường hợp đổi sang token mới (Đăng nhập tài khoản khác ở tab khác)
      if (event.key === 'token' && event.newValue && event.newValue !== event.oldValue) {
        setToken(event.newValue)
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser))
          } catch {
            setUser(null)
          }
        }
        // Reload để đóng WebSocket/WebRTC cũ và nạp lại toàn bộ dữ liệu đúng theo tài khoản mới
        window.location.reload()
      }

      // Cập nhật thông tin user nếu thay đổi ở tab khác
      if (event.key === 'user') {
        if (!event.newValue) {
          setUser(null)
        } else {
          try {
            setUser(JSON.parse(event.newValue))
          } catch {
            setUser(null)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleLogin = async (payload: LoginPayload) => {
    const authData = await authService.login(payload)
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify(authData.user))
    setToken(authData.token)
    setUser(authData.user)
  }

  const handleRegister = async (payload: RegisterPayload) => {
    const authData = await authService.register(payload)
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify(authData.user))
    setToken(authData.token)
    setUser(authData.user)
  }

  const handleLogout = async () => {
    await authService.logout()
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
      } catch {
        handleLogout()
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

