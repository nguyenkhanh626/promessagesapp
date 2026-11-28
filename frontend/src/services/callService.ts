import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { CallHistoryItem, CallStats } from '../types/calling'

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

let cachedIceServers: RTCIceServer[] | null = null

export const callService = {
  /**
   * Lấy danh sách STUN/TURN ICE Servers động từ Backend (có cache)
   */
  async getIceServers(forceRefresh = false): Promise<RTCIceServer[]> {
    if (cachedIceServers && !forceRefresh) {
      return cachedIceServers
    }
    try {
      const response = await apiClient.get<ApiResponse<{ iceServers: RTCIceServer[] }>>('/call/ice-servers')
      const servers = response.data?.data?.iceServers
      if (Array.isArray(servers) && servers.length > 0) {
        cachedIceServers = servers
        return servers
      }
    } catch (err) {
      console.warn('⚠️ Không thể lấy ICE servers từ Backend, dùng STUN mặc định:', err)
    }
    return DEFAULT_ICE_SERVERS
  },

  /**
   * Lấy danh sách lịch sử cuộc gọi của người dùng (hỗ trợ lọc theo type & status)
   */
  async getCallHistory(userId: string, type = 'ALL', status = 'ALL'): Promise<CallHistoryItem[]> {
    try {
      const params: Record<string, string> = {}
      if (type && type !== 'ALL') params.type = type
      if (status && status !== 'ALL') params.status = status
      const response = await apiClient.get<ApiResponse<CallHistoryItem[]>>(`/call/history/${userId}`, {
        params,
      })
      const payload = response.data?.data
      if (Array.isArray(payload)) {
        return payload
      }
      return []
    } catch (err) {
      console.error('Lỗi khi tải lịch sử cuộc gọi:', err)
      return []
    }
  },

  /**
   * Lấy thống kê tổng hợp lịch sử cuộc gọi
   */
  async getCallStats(userId: string): Promise<CallStats | null> {
    try {
      const response = await apiClient.get<ApiResponse<CallStats>>(`/call/stats/${userId}`)
      return response.data?.data || null
    } catch (err) {
      console.error('Lỗi khi tải thống kê cuộc gọi:', err)
      return null
    }
  },

  /**
   * Kiểm tra trạng thái máy chủ cuộc gọi
   */
  async getCallServerStatus(): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/call/status')
      return response.data?.data
    } catch {
      return null
    }
  },

  /**
   * Kiểm tra xem người dùng có đang bận nghe máy không
   */
  async isUserBusy(userId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<ApiResponse<boolean>>(`/call/is-busy/${userId}`)
      return !!response.data?.data
    } catch {
      return false
    }
  },
}
