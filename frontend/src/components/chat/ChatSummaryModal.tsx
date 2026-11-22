import { useEffect, useState } from 'react'
import { Check, Clipboard, LoaderCircle, Sparkles, X } from 'lucide-react'
import { aiService } from '../../services/aiService'
import type { ChatSummary } from '../../types/ai'

interface ChatSummaryModalProps {
  conversationId: string
  onClose: () => void
}

export function ChatSummaryModal({ conversationId, onClose }: ChatSummaryModalProps) {
  const [summary, setSummary] = useState<ChatSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    let active = true
    aiService.summarizeConversation(conversationId, { messageLimit: 50, language: 'Vietnamese' })
      .then((result) => {
        if (active) setSummary(result)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error
            ? requestError.message
            : 'Không thể tạo bản tóm tắt. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [conversationId])

  const copyMarkdown = async () => {
    if (!summary) return
    const markdown = [
      '## Tóm tắt cuộc trò chuyện',
      summary.summary,
      '',
      '## Các chủ đề chính',
      ...summary.keyTopics.map((topic) => `- ${topic}`),
      '',
      '## Việc cần làm',
      ...(summary.actionItems.length
        ? summary.actionItems.map((item) => `- [ ] ${item.description} — ${item.assignee}`)
        : ['- Không có việc cần làm được nêu.']),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(markdown)
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1800)
    } catch {
      setError('Không thể sao chép vào clipboard trên trình duyệt này.')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-summary-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#454545] bg-[#201f1f] text-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#383838] px-5 py-4">
          <h2 id="chat-summary-title" className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} className="text-[#b8baff]" />
            Tóm tắt cuộc trò chuyện
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-gray-300 hover:bg-[#383838]">
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[calc(85vh-72px)] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-300">
              <LoaderCircle size={20} className="animate-spin text-[#b8baff]" />
              Đang phân tích các tin nhắn gần đây...
            </div>
          ) : error ? (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>
          ) : summary && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#b8baff]">Tóm tắt chung</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-100">{summary.summary}</p>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#b8baff]">Các điểm thảo luận chính</h3>
                {summary.keyTopics.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-100">
                    {summary.keyTopics.map((topic, index) => <li key={`${topic}-${index}`}>{topic}</li>)}
                  </ul>
                ) : <p className="text-sm text-gray-400">Không có chủ đề chính.</p>}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[#b8baff]">Danh sách việc cần làm</h3>
                {summary.actionItems.length ? (
                  <ul className="space-y-2">
                    {summary.actionItems.map((item, index) => (
                      <li key={`${item.description}-${index}`} className="flex gap-2 rounded-lg bg-[#292929] p-3 text-sm">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[#898989]" />
                        <span>{item.description}<span className="ml-2 text-xs text-gray-400">— {item.assignee}</span></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-gray-400">Không có việc cần làm được nêu.</p>}
              </section>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#383838] pt-4">
                <span className="text-xs text-gray-400">
                  Dựa trên {summary.messageCount} tin nhắn • {new Date(summary.generatedAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#5b5fc7] px-3 py-2 text-sm font-medium hover:bg-[#4d51b8]"
                >
                  {isCopied ? <Check size={16} /> : <Clipboard size={16} />}
                  {isCopied ? 'Đã sao chép' : 'Sao chép Markdown'}
                </button>
              </footer>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
