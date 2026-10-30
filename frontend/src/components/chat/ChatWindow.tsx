import React, { useEffect, useRef, useState } from 'react'
import { Phone, Video, Send, Smile, Paperclip, MoreVertical, MessageSquare } from 'lucide-react'
import type { Conversation, Message } from '../../types/chat'
import type { User } from '../../types/auth'

interface ChatWindowProps {
  conversation: Conversation | null
  messages: Message[]
  currentUser: User | null
  onSendMessage: (content: string) => void
  isSending: boolean
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  isSending,
}) => {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isSending) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#181818] text-gray-400 p-8 select-none">
        <div className="h-16 w-16 rounded-2xl bg-[#262626] flex items-center justify-center text-[#5B5FC7] mb-4 shadow-lg border border-[#383838]">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Chào mừng bạn đến với Trò chuyện</h3>
        <p className="text-sm text-gray-500 max-w-sm text-center">
          Chọn một cuộc trò chuyện từ danh sách bên trái hoặc nhấn nút tạo tin nhắn mới để bắt đầu.
        </p>
      </div>
    )
  }

  const isOnline = conversation.otherUser?.status === 'ONLINE'

  return (
    <div className="flex-1 h-full flex flex-col bg-[#181818] text-white">
      {/* Header cuộc trò chuyện */}
      <header className="h-16 px-6 border-b border-[#383838] bg-[#201f1f] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
            {conversation.avatarUrl ? (
              <img src={conversation.avatarUrl} alt={conversation.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-bold text-sm text-white">
                {(conversation.name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#201f1f] ${
                isOnline ? 'bg-emerald-500' : 'bg-gray-500'
              }`}
            />
          </div>
          <div>
            <h3 className="font-bold text-base text-white leading-tight">{conversation.name || 'Cuộc trò chuyện'}</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </p>
          </div>
        </div>

        {/* Nút thao tác nhanh cuộc gọi */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
            title="Bắt đầu cuộc gọi thoại (WebRTC Audio)"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
            title="Bắt đầu cuộc gọi video (WebRTC Video)"
          >
            <Video size={18} />
          </button>
          <div className="h-5 w-[1px] bg-[#383838] mx-1" />
          <button
            type="button"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Danh sách tin nhắn */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
            <p className="mb-1 text-sm font-semibold text-gray-400">Chưa có tin nhắn nào</p>
            <p>Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0 mb-1">
                    {msg.senderAvatarUrl ? (
                      <img src={msg.senderAvatarUrl} alt={msg.senderName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                        {(msg.senderName || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                    isMe
                      ? 'bg-[#5B5FC7] text-white rounded-br-sm'
                      : 'bg-[#262626] text-gray-100 rounded-bl-sm border border-[#383838]'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[11px] font-bold text-[#7f85f5] mb-1">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 text-right select-none ${
                      isMe ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Thanh soạn thảo tin nhắn */}
      <div className="p-4 bg-[#201f1f] border-t border-[#383838]">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#181818] border border-[#383838] focus-within:border-[#5B5FC7] rounded-xl px-4 py-2 transition-colors">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              disabled={isSending}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 ml-2">
              <button
                type="button"
                className="hover:text-white p-1 rounded transition-colors"
                title="Đính kèm tệp"
              >
                <Paperclip size={18} />
              </button>
              <button
                type="button"
                className="hover:text-white p-1 rounded transition-colors"
                title="Biểu cảm"
              >
                <Smile size={18} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="h-10 w-10 rounded-xl bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md active:scale-95 shrink-0"
            title="Gửi tin nhắn (Enter)"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}

