import type { User } from './auth'

export type UserPresenceStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY'

export interface MessageReactionSummary {
  emoji: string
  count: number
  userIds: string[]
  userNames: string[]
}

export interface ReactionEvent {
  conversationId: string
  messageId: string
  reactions: MessageReactionSummary[]
}

export interface ReplyPreview {
  id: string
  senderId: string
  senderName: string
  content: string
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM'
  fileName?: string
}

export interface PagedMessagesResponse {
  content: Message[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasMore: boolean
}

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
  pinned?: boolean
  pinnedBy?: string
  pinnedByName?: string
  pinnedAt?: string
  important?: boolean
  replyToId?: string
  replyTo?: ReplyPreview
  reactions?: MessageReactionSummary[]
  createdAt: string
}

export interface ConversationMember {
  id: string
  userId: string
  displayName: string
  email: string
  avatarUrl?: string
  status?: UserPresenceStatus
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
  important?: boolean
  replyToId?: string
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

export interface ConversationMediaItem {
  messageId: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string
  messageType: 'IMAGE' | 'FILE'
  fileUrl: string
  fileName: string
  fileSize?: number
  createdAt: string
}

export interface PinMessageEvent {
  conversationId: string
  messageId: string
  pinned: boolean
  pinnedById?: string
  pinnedByName?: string
  pinnedAt?: string
  message: Message
}

export interface PresenceEvent {
  userId: string
  email: string
  displayName: string
  avatarUrl?: string
  status: UserPresenceStatus
  updatedAt: string
}

export interface TypingEvent {
  conversationId: string
  userId: string
  displayName: string
  avatarUrl?: string
  typing: boolean
}
