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
  fileName?: string
  fileSize?: number
  createdAt: string
}

export interface ConversationMember {
  id: string
  userId: string
  displayName: string
  email: string
  avatarUrl?: string
  status?: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
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
  currentUserRole?: 'ADMIN' | 'MEMBER'
  members?: ConversationMember[]
}

export interface SendMessagePayload {
  content: string
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

export interface CreateGroupPayload {
  name: string
  avatarUrl?: string
  memberIds: string[]
}

export interface FileUploadResponse {
  fileName: string
  originalFileName: string
  fileUrl: string
  contentType: string
  fileSize: number
  messageType: 'IMAGE' | 'FILE'
}
