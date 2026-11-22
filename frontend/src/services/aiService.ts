import { apiClient } from './apiClient'
import type { ApiResponse } from '../types/auth'
import type {
  AiChatRequest,
  AiHealth,
  AiPromptRequest,
  AiPromptResponse,
  ChatSummary,
  ChatSummaryRequest,
} from '../types/ai'

export const aiService = {
  async getHealth(): Promise<AiHealth> {
    const response = await apiClient.get<ApiResponse<AiHealth>>('/ai/health')
    return response.data.data
  },

  async sendPrompt(request: AiPromptRequest): Promise<AiPromptResponse> {
    const response = await apiClient.post<ApiResponse<AiPromptResponse>>('/ai/test-prompt', request)
    return response.data.data
  },

  async streamChat(
    request: AiChatRequest,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    await apiClient.postSse('/ai/chat/stream', request, (event, data) => {
      if (event === 'error') throw new Error(data)
      if (event === 'message') onChunk(data)
    }, signal)
  },

  async summarizeConversation(
    conversationId: string,
    request: ChatSummaryRequest = {}
  ): Promise<ChatSummary> {
    const response = await apiClient.post<ApiResponse<ChatSummary>>(
      `/ai/conversations/${conversationId}/summarize`,
      request
    )
    return response.data.data
  },
}
