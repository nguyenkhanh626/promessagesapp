import { apiClient } from './apiClient'
import type { ApiResponse, User } from '../types/auth'
import type {
  Conversation,
  ConversationMember,
  CreateGroupPayload,
  FileUploadResponse,
  Message,
  PresenceEvent,
  SendMessagePayload,
  UserPresenceStatus,
} from '../types/chat'

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

  async createGroupConversation(payload: CreateGroupPayload): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/conversations/group', payload)
    return response.data.data
  },

  async updateGroupConversation(
    conversationId: string,
    payload: { name?: string; avatarUrl?: string }
  ): Promise<Conversation> {
    const response = await apiClient.put<ApiResponse<Conversation>>(
      `/conversations/${conversationId}/group`,
      payload
    )
    return response.data.data
  },

  async getConversationDetail(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(`/conversations/${conversationId}`)
    return response.data.data
  },

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    const response = await apiClient.get<ApiResponse<ConversationMember[]>>(
      `/conversations/${conversationId}/members`
    )
    return response.data.data
  },

  async addGroupMembers(conversationId: string, userIds: string[]): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>(
      `/conversations/${conversationId}/members`,
      { userIds }
    )
    return response.data.data
  },

  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    await apiClient.delete(`/conversations/${conversationId}/members/${userId}`)
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(`/conversations/${conversationId}/messages`)
    return response.data.data
  },

  async searchMessagesInConversation(conversationId: string, query: string): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      `/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}`
    )
    return response.data.data
  },

  async searchAllMessages(query: string): Promise<Message[]> {
    const response = await apiClient.get<ApiResponse<Message[]>>(
      `/messages/search?q=${encodeURIComponent(query)}`
    )
    return response.data.data
  },

  async sendMessage(conversationId: string, payload: SendMessagePayload): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { messageType: 'TEXT', ...payload }
    )
    return response.data.data
  },

  async sendTypingIndicator(conversationId: string, typing: boolean): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/typing`, {
      conversationId,
      typing,
    })
  },

  async updateMyStatus(status: UserPresenceStatus): Promise<PresenceEvent> {
    const response = await apiClient.put<ApiResponse<PresenceEvent>>('/users/me/status', { status })
    return response.data.data
  },

  async getUserDirectory(query: string = '', status?: UserPresenceStatus): Promise<User[]> {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (status) params.set('status', status)
    const response = await apiClient.get<ApiResponse<User[]>>(`/users/directory?${params.toString()}`)
    return response.data.data
  },

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ApiResponse<FileUploadResponse>>('/files/upload', formData)
    return response.data.data
  },

  async searchUsers(query: string = ''): Promise<User[]> {
    const response = await apiClient.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(query)}`)
    return response.data.data
  },
}
