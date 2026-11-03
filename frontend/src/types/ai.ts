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
