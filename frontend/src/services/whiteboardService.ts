import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { WhiteboardSession, WhiteboardShape } from '../types/whiteboard'

interface WhiteboardSnapshot {
  sessionId: string
  shapes: WhiteboardShape[]
  version: number
  createdAt: string | null
}

export const whiteboardService = {
  async openSession(conversationId: string, title?: string): Promise<WhiteboardSession> {
    const response = await apiClient.post<ApiResponse<WhiteboardSession>>('/whiteboard', {
      conversationId,
      title,
    })
    return response.data.data
  },

  async saveSnapshot(sessionId: string, shapes: WhiteboardShape[]): Promise<WhiteboardSnapshot> {
    const response = await apiClient.post<ApiResponse<WhiteboardSnapshot>>(
      `/whiteboard/${sessionId}/snapshot`,
      { shapes }
    )
    return response.data.data
  },

  async getLatestSnapshot(sessionId: string): Promise<WhiteboardSnapshot> {
    const response = await apiClient.get<ApiResponse<WhiteboardSnapshot>>(
      `/whiteboard/${sessionId}/snapshot`
    )
    return response.data.data
  },
}
