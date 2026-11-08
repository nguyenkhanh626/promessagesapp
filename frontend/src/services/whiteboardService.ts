import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { WhiteboardSession, WhiteboardShape } from '../types/whiteboard'

export const whiteboardService = {
  async openSession(conversationId: string, title?: string): Promise<WhiteboardSession> {
    const response = await apiClient.post<ApiResponse<WhiteboardSession>>('/whiteboard', {
      conversationId,
      title,
    })
    return response.data.data
  },

  async saveSnapshot(sessionId: string, shapes: WhiteboardShape[]): Promise<WhiteboardSession> {
    const response = await apiClient.post<ApiResponse<WhiteboardSession>>(
      `/whiteboard/${sessionId}/snapshot`,
      { shapes }
    )
    return response.data.data
  },
}
