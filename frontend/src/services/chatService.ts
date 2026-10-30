import { apiClient } from './apiClient'
import type { ApiResponse, User } from '../types/auth'
import type { Conversation, Message, SendMessagePayload } from '../types/chat'

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/conversations')
    return response.data.data
  },

  async getOrCreateDirectConversation(targetUserId: string): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/conversations/direct', {
      targetUserId,
    })
    return response.data.data
  },

  async getConversationDetail(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(`/conversations/${conversationId}`)
    return response.data.data
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(`/conversations/${conversationId}/messages`)
    return response.data.data
  },

  async sendMessage(conversationId: string, payload: SendMessagePayload): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      payload
    )
    return response.data.data
  },

  async searchUsers(query: string = ''): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(query)}`)
    return response.data.data
  },
}

