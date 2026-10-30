import type { User } from './auth'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string
  content: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  fileUrl?: string
  createdAt: string
}

export interface Conversation {
  id: string
  name: string
  type: 'DIRECT' | 'GROUP'
  avatarUrl?: string
  lastMessageContent?: string
  lastMessageAt?: string
  otherUser?: User
  memberCount: number
}

export interface SendMessagePayload {
  content: string
  messageType?: 'TEXT' | 'IMAGE' | 'FILE'
  fileUrl?: string
}

