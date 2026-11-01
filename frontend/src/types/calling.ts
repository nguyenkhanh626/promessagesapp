/**
 * Các loại tín hiệu trao đổi qua WebSocket Signaling Server
 */
export type SignalType =
  | 'PING'
  | 'PONG'
  | 'CALL_INVITE'
  | 'CALL_ACCEPT'
  | 'CALL_REJECT'
  | 'CALL_CANCEL'
  | 'CALL_BUSY'
  | 'CALL_TIMEOUT'
  | 'CALL_END'
  | 'CALL_OFFER'
  | 'CALL_ANSWER'
  | 'ICE_CANDIDATE'
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'USER_JOINED'
  | 'USER_LEFT'

/**
 * Trạng thái máy trạng thái cuộc gọi phía Client
 */
export type CallStatus =
  | 'IDLE'
  | 'OUTGOING_RINGING'
  | 'INCOMING_RINGING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDED'

/**
 * Gói tin Signaling trao đổi giữa các client
 */
export interface SignalMessage {
  type: SignalType
  senderId: string
  senderName?: string
  receiverId?: string
  roomId?: string
  payload?: any
  timestamp?: string
}

/**
 * Thông tin người tham gia cuộc gọi
 */
export interface CallUserInfo {
  id: string
  displayName: string
  avatarUrl?: string
  email?: string
}

/**
 * Phiên cuộc gọi trong lịch sử (Call Log)
 */
export interface CallHistoryItem {
  id: string
  conversationId?: string
  initiatorId: string
  initiatorName?: string
  initiatorAvatar?: string
  receiverId: string
  receiverName?: string
  receiverAvatar?: string
  otherUserId?: string
  otherUserName?: string
  otherUserAvatar?: string
  roomId: string
  callType: 'AUDIO' | 'VIDEO'
  status: 'RINGING' | 'CONNECTED' | 'REJECTED' | 'CANCELLED' | 'BUSY' | 'MISSED' | 'ENDED'
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  createdAt: string
}

