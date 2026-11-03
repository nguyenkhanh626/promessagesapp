import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Bot, CircleAlert, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { aiService } from '../services/aiService'
import type { AiHealth } from '../types/ai'

interface ConversationMessage {
  id: number
  role: 'assistant' | 'user'
  text: string
  tokensUsed?: number | null
}

const welcomeMessage: ConversationMessage = {
  id: 0,
  role: 'assistant',
  text: 'Xin chào! Mình có thể hỗ trợ bạn tóm tắt nội dung hoặc gợi ý ý tưởng cho nhóm.',
}

export function AiAssistantPage() {
  const [health, setHealth] = useState<AiHealth | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(true)
  const [messages, setMessages] = useState<ConversationMessage[]>([welcomeMessage])
  const [prompt, setPrompt] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nextMessageId = useRef(1)

  useEffect(() => {
    let isMounted = true

    aiService.getHealth()
      .then((result) => {
        if (isMounted) setHealth(result)
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setHealth(null)
          setError(requestError instanceof Error ? requestError.message : 'Không thể kiểm tra kết nối AI.')
        }
      })
      .finally(() => {
        if (isMounted) setIsCheckingHealth(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const checkHealth = useCallback(async () => {
    setIsCheckingHealth(true)
    setError(null)
    try {
      setHealth(await aiService.getHealth())
    } catch (requestError) {
      setHealth(null)
      setError(requestError instanceof Error ? requestError.message : 'Không thể kiểm tra kết nối AI.')
    } finally {
      setIsCheckingHealth(false)
    }
  }, [])

  const handleSendPrompt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = prompt.trim()
    if (!question || isSending) return

    setPrompt('')
    setError(null)
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, role: 'user', text: question },
    ])
    setIsSending(true)

    try {
      const context = messages
        .slice(-6)
        .map(({ role, text }) => `${role === 'assistant' ? 'AI' : 'Người dùng'}: ${text}`)
        .join('\n')
      const response = await aiService.sendPrompt({ prompt: question, context })
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: 'assistant',
          text: response.reply,
          tokensUsed: response.tokensUsed,
        },
      ])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi câu hỏi đến AI.')
    } finally {
      setIsSending(false)
    }
  }

  const isHealthy = health?.healthy === true

  return (
    <section className="mx-auto flex h-full min-h-[560px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#e1dfdd] bg-white text-[#242424] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1dfdd] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eeefff] text-[#5b5fc7]">
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6264a7]">ProMessages</p>
            <h1 className="mt-1 text-xl font-semibold">Trợ lý AI</h1>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            isHealthy ? 'bg-[#dff6dd] text-[#0b6a0b]' : 'bg-[#f5f5f5] text-[#616161]'
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-[#13a10e]' : 'bg-[#8a8886]'}`} />
          {isCheckingHealth
            ? 'Đang kiểm tra AI...'
            : isHealthy
              ? 'AI Engine Ready (Gemini Connected)'
              : health?.status === 'NOT_CONFIGURED'
                ? 'Gemini chưa được cấu hình'
                : 'AI Engine chưa kết nối'}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[#faf9f8] p-5" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                message.role === 'assistant' ? 'bg-[#eeefff] text-[#5b5fc7]' : 'bg-[#e8def8] text-[#4e3b72]'
              }`}
            >
              {message.role === 'assistant' ? <Bot size={18} aria-hidden="true" /> : <span className="text-sm font-semibold">B</span>}
            </div>
            <div
              className={`max-w-[min(85%,640px)] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === 'assistant'
                  ? 'rounded-tl-sm border border-[#e1dfdd] bg-white'
                  : 'rounded-tr-sm bg-[#eeefff]'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.tokensUsed != null && (
                <p className="mt-1 text-right text-[11px] text-[#8a8886]">{message.tokensUsed} tokens</p>
              )}
            </div>
          </article>
        ))}
        {isSending && (
          <div className="flex items-center gap-3 text-sm text-[#616161]" role="status">
            <LoaderCircle size={18} className="animate-spin text-[#5b5fc7]" aria-hidden="true" />
            AI đang soạn câu trả lời...
          </div>
        )}
      </div>

      {(error || (health && !health.healthy)) && (
        <div className="flex items-start gap-2 border-t border-[#e1dfdd] bg-[#fff4ce] px-5 py-3 text-sm text-[#614700]" role="status">
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error || health?.message}</span>
          <button type="button" onClick={() => void checkHealth()} className="ml-auto shrink-0 font-semibold underline">
            Thử lại
          </button>
        </div>
      )}

      <form onSubmit={handleSendPrompt} className="flex items-end gap-3 border-t border-[#e1dfdd] bg-white p-4">
        <label className="sr-only" htmlFor="ai-prompt">Câu hỏi cho trợ lý AI</label>
        <textarea
          id="ai-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
          maxLength={4000}
          rows={2}
          placeholder="Nhập câu hỏi cho trợ lý AI..."
          className="min-h-12 flex-1 resize-none rounded-lg border border-[#d1d1d1] px-4 py-3 text-sm outline-none transition focus:border-[#5b5fc7] focus:ring-2 focus:ring-[#5b5fc7]/20"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isSending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#5b5fc7] text-white transition hover:bg-[#464775] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Gửi câu hỏi"
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}
