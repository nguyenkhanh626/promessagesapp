export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  createdAt?: string
}

export interface AuthResponse {
  token: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  displayName: string
  avatarUrl?: string
}

