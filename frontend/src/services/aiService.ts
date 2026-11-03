import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { AiHealth, AiPromptRequest, AiPromptResponse } from '../types/ai'

export const aiService = {
  async getHealth(): Promise<AiHealth> {
    const response = await apiClient.get<ApiResponse<AiHealth>>('/ai/health')
    return response.data.data
  },

  async sendPrompt(request: AiPromptRequest): Promise<AiPromptResponse> {
    const response = await apiClient.post<ApiResponse<AiPromptResponse>>('/ai/test-prompt', request)
    return response.data.data
  },
}
