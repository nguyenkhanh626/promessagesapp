import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { CallHistoryItem } from '../types/calling'

export const callService = {
  /**
   * Lấy danh sách lịch sử cuộc gọi của người dùng
   */
  async getCallHistory(userId: string): Promise<CallHistoryItem[]> {
    try {
      const response = await apiClient.get<ApiResponse<CallHistoryItem[]>>(`/call/history/${userId}`)
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
