export interface AiHealth {
  healthy: boolean
  status: 'ACTIVE' | 'NOT_CONFIGURED' | 'UNAVAILABLE'
  model: string
  message: string
}

export interface AiPromptRequest {
  prompt: string
  context?: string
}

export interface AiPromptResponse {
  reply: string
  status: 'OK' | 'UNAVAILABLE'
  tokensUsed: number | null
}

export interface AiChatRequest {
  conversationId: string
  prompt: string
}

export interface ChatSummaryRequest {
  messageLimit?: number
  language?: string
}

export interface ChatSummaryActionItem {
  assignee: string
  description: string
}

export interface ChatSummary {
  summary: string
  keyTopics: string[]
  actionItems: ChatSummaryActionItem[]
  messageCount: number
  generatedAt: string
}
