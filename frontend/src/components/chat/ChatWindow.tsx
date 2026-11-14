import React, { useEffect, useRef, useState } from 'react'
import {
  Download,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Users,
  Video,
  X,
} from 'lucide-react'
import type { Conversation, Message, TypingEvent, UserPresenceStatus } from '../../types/chat'
import type { User } from '../../types/auth'
import { useCall } from '../../context/CallContext'
import { chatService } from '../../services/chatService'
import { STATUS_CONFIG } from './UserDirectoryModal'

interface ChatWindowProps {
  conversation: Conversation | null
  messages: Message[]
  currentUser: User | null
  onSendMessage: (content: string, attachmentFile?: File | null) => Promise<void>
  onTypingChange?: (typing: boolean) => void
  typingUsers?: TypingEvent[]
  isSending: boolean
  showMembersPanel: boolean
  onToggleMembersPanel: () => void
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  currentUser,
  onSendMessage,
  onTypingChange,
  typingUsers = [],
  isSending,
  showMembersPanel,
  onToggleMembersPanel,
}) => {
  const [inputText, setInputText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null)

  // Trạng thái tìm kiếm tin nhắn trong hội thoại
  const [showMessageSearch, setShowMessageSearch] = useState(false)
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [searchedMessages, setSearchedMessages] = useState<Message[]>([])
  const [isSearchingMessages, setIsSearchingMessages] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<any>(null)
  const isTypingSentRef = useRef<boolean>(false)
  const { startCall, callStatus } = useCall()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setInputText('')
    setShowMessageSearch(false)
    setMessageSearchQuery('')
    setSearchedMessages([])
    setHighlightedMessageId(null)
    isTypingSentRef.current = false
  }, [conversation?.id])

  const emitTyping = (typing: boolean) => {
    if (!onTypingChange) return
    if (typing && !isTypingSentRef.current) {
      isTypingSentRef.current = true
      onTypingChange(true)
    } else if (!typing && isTypingSentRef.current) {
      isTypingSentRef.current = false
      onTypingChange(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputText(val)

    if (val.trim().length > 0) {
      emitTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false)
      }, 2500)
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      emitTyping(false)
    }
  }

  const handleMessageSearch = async (query: string) => {
    setMessageSearchQuery(query)
    if (!conversation || !query.trim()) {
      setSearchedMessages([])
      return
    }

    setIsSearchingMessages(true)
    try {
      const results = await chatService.searchMessagesInConversation(conversation.id, query.trim())
      setSearchedMessages(results)
    } catch {
      // Fallback lọc trên danh sách tin nhắn đã tải
      const q = query.trim().toLowerCase()
      setSearchedMessages(
        messages.filter(
          (m) => m.messageType !== 'SYSTEM' && m.content.toLowerCase().includes(q)
        )
      )
    } finally {
      setIsSearchingMessages(false)
    }
  }

  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId)
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setTimeout(() => {
      setHighlightedMessageId((prev) => (prev === messageId ? null : prev))
    }, 3000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setFilePreviewUrl(url)
    } else {
      setFilePreviewUrl(null)
    }
    e.target.value = ''
  }

  const clearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl)
    }
    setSelectedFile(null)
    setFilePreviewUrl(null)
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if ((!inputText.trim() && !selectedFile) || isSending) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitTyping(false)

    const textToSend = inputText.trim()
    const fileToSend = selectedFile

    setInputText('')
    clearSelectedFile()

    await onSendMessage(textToSend, fileToSend)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStartVoiceCall = () => {
    if (!conversation) return
    const otherId = conversation.otherUser?.id
    if (!otherId) return

    startCall({
      id: otherId,
      displayName: conversation.otherUser?.displayName || conversation.name || 'Người dùng',
      avatarUrl: conversation.otherUser?.avatarUrl || conversation.avatarUrl,
    })
  }

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#181818] text-gray-400 p-8 select-none">
        <div className="h-16 w-16 rounded-2xl bg-[#262626] flex items-center justify-center text-[#5B5FC7] mb-4 shadow-lg border border-[#383838]">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Chào mừng bạn đến với Trò chuyện</h3>
        <p className="text-sm text-gray-500 max-w-sm text-center">
          Chọn một cuộc trò chuyện từ danh sách bên trái, tạo nhóm chat mới hoặc tra cứu danh bạ người dùng.
        </p>
      </div>
    )
  }

  const isGroup = conversation.type === 'GROUP'
  const otherStatus = (conversation.otherUser?.status as UserPresenceStatus) || 'OFFLINE'
  const otherStatusCfg = STATUS_CONFIG[otherStatus] || STATUS_CONFIG.OFFLINE

  const activeTypers = typingUsers.filter((t) => t.userId !== currentUser?.id && t.typing)

  return (
    <div className="flex-1 h-full flex flex-col bg-[#181818] text-white min-w-0">
      {/* Header cuộc trò chuyện */}
      <header className="h-16 px-6 border-b border-[#383838] bg-[#201f1f] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
            {conversation.avatarUrl ? (
              <img src={conversation.avatarUrl} alt={conversation.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-bold text-sm text-white">
                {(conversation.name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            {!isGroup && (
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#201f1f] ${otherStatusCfg.dotColor}`}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white leading-tight truncate">
                {conversation.name || 'Cuộc trò chuyện'}
              </h3>
              {isGroup && (
                <span className="px-2 py-0.5 rounded-full bg-[#5B5FC7]/20 border border-[#5B5FC7]/40 text-[10px] font-semibold text-indigo-300 shrink-0">
                  Nhóm
                </span>
              )}
            </div>
            {isGroup ? (
              <button
                type="button"
                onClick={onToggleMembersPanel}
                className="text-xs text-gray-400 hover:text-indigo-300 flex items-center gap-1.5 mt-0.5 transition-colors"
              >
                <Users size={12} />
                <span>{conversation.memberCount} thành viên • Nhấn để xem danh sách</span>
              </button>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${otherStatusCfg.dotColor}`} />
                {otherStatusCfg.label}
              </p>
            )}
          </div>
        </div>

        {/* Nút thao tác nhanh trên Header */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nút tìm kiếm tin nhắn trong hội thoại */}
          <button
            type="button"
            onClick={() => setShowMessageSearch((prev) => !prev)}
            className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
              showMessageSearch
                ? 'bg-[#5B5FC7] text-white'
                : 'text-gray-300 hover:text-white hover:bg-[#383838]'
            }`}
            title="Tìm kiếm tin nhắn trong cuộc trò chuyện"
          >
            <Search size={17} />
          </button>

          {isGroup && (
            <button
              type="button"
              onClick={onToggleMembersPanel}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                showMembersPanel
                  ? 'bg-[#5B5FC7] text-white'
                  : 'text-gray-300 hover:text-white hover:bg-[#383838] bg-[#2a2a2a]'
              }`}
              title="Quản lý thành viên nhóm"
            >
              <Users size={16} />
              <span className="hidden sm:inline">{conversation.memberCount}</span>
            </button>
          )}

          {!isGroup && (
            <>
              <button
                type="button"
                onClick={handleStartVoiceCall}
                disabled={callStatus !== 'IDLE' || !conversation.otherUser}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors disabled:opacity-40"
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
            </>
          )}

          <div className="h-5 w-[1px] bg-[#383838] mx-1" />
          <button
            type="button"
            onClick={isGroup ? onToggleMembersPanel : undefined}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Thanh tìm kiếm tin nhắn trong hội thoại */}
      {showMessageSearch && (
        <div className="px-6 py-3 bg-[#242424] border-b border-[#383838] space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={messageSearchQuery}
                onChange={(e) => handleMessageSearch(e.target.value)}
                placeholder="Nhập từ khóa để tìm tin nhắn trong cuộc trò chuyện này..."
                autoFocus
                className="w-full bg-[#181818] border border-[#383838] focus:border-[#5B5FC7] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMessageSearch(false)
                setMessageSearchQuery('')
                setSearchedMessages([])
              }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#383838]"
              title="Đóng tìm kiếm"
            >
              <X size={16} />
            </button>
          </div>

          {messageSearchQuery.trim() && (
            <div className="max-h-44 overflow-y-auto rounded-lg bg-[#181818] border border-[#323232] divide-y divide-[#262626]">
              {isSearchingMessages ? (
                <p className="text-xs text-gray-400 py-3 text-center">Đang tìm kiếm tin nhắn...</p>
              ) : searchedMessages.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">
                  Không tìm thấy tin nhắn nào khớp với "{messageSearchQuery}"
                </p>
              ) : (
                searchedMessages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => scrollToMessage(m.id)}
                    className="w-full text-left px-3 py-2 hover:bg-[#2a2a2a] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#9ba0ff]">{m.senderName}</p>
                      <p className="text-xs text-gray-200 truncate">{m.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatMessageTime(m.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Danh sách tin nhắn */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
            <p className="mb-1 text-sm font-semibold text-gray-400">Chưa có tin nhắn nào</p>
            <p>Hãy gửi lời chào đầu tiên hoặc chia sẻ hình ảnh, tài liệu vào cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.messageType === 'SYSTEM') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full bg-[#262626] border border-[#363636] text-[11px] text-gray-400">
                    {msg.content}
                  </span>
                </div>
              )
            }

            const isMe = msg.senderId === currentUser?.id
            const isImage = msg.messageType === 'IMAGE' && msg.fileUrl
            const isFile = msg.messageType === 'FILE' && msg.fileUrl
            const isHighlighted = highlightedMessageId === msg.id

            return (
              <div
                id={`msg-${msg.id}`}
                key={msg.id}
                className={`flex items-end gap-2.5 transition-all rounded-xl p-1 ${
                  isMe ? 'justify-end' : 'justify-start'
                } ${isHighlighted ? 'ring-2 ring-amber-400 bg-amber-500/10' : ''}`}
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
                    <p className="text-[11px] font-bold text-[#9ba0ff] mb-1">
                      {msg.senderName}
                    </p>
                  )}

                  {/* Render Hình ảnh đính kèm */}
                  {isImage && (
                    <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <img
                        src={msg.fileUrl}
                        alt={msg.fileName || msg.content}
                        onClick={() => setLightboxImageUrl(msg.fileUrl || null)}
                        className="max-h-72 w-auto object-contain cursor-pointer hover:opacity-95 transition-opacity"
                      />
                    </div>
                  )}

                  {/* Render Tệp tài liệu đính kèm */}
                  {isFile && (
                    <div
                      className={`mb-1.5 flex items-center justify-between gap-3 p-2.5 rounded-xl border ${
                        isMe
                          ? 'bg-black/20 border-white/15'
                          : 'bg-[#1b1b1b] border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-[#5B5FC7]/30 flex items-center justify-center text-white shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                            {msg.fileName || msg.content || 'Tệp đính kèm'}
                          </p>
                          {msg.fileSize && (
                            <p className="text-[10px] text-gray-300 opacity-80">
                              {formatFileSize(msg.fileSize)}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={`${msg.fileUrl}?download=true`}
                        download={msg.fileName || true}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
                        title="Tải tệp xuống"
                      >
                        <Download size={15} />
                      </a>
                    </div>
                  )}

                  {/* Nội dung chữ (nếu có) */}
                  {msg.content &&
                    (!isFile || (msg.fileName && msg.content !== msg.fileName)) &&
                    (!isImage || (msg.fileName && msg.content !== msg.fileName)) && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    )}

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

      {/* Dòng chữ động Typing Indicator: "[Tên người dùng] đang nhập tin nhắn..." */}
      {activeTypers.length > 0 && (
        <div className="px-6 py-1.5 bg-[#1b1b1b] border-t border-[#2a2a2a] flex items-center gap-2 text-xs text-indigo-300">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7f85f5] animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#7f85f5] animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#7f85f5] animate-bounce" />
          </div>
          <span className="italic">
            {activeTypers.map((t) => t.displayName).join(', ')} đang nhập tin nhắn...
          </span>
        </div>
      )}

      {/* Thanh xem trước File/Ảnh đã chọn trước khi gửi */}
      {selectedFile && (
        <div className="px-4 py-2.5 bg-[#252525] border-t border-[#383838] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="h-12 w-12 rounded-lg object-cover border border-[#484848] shrink-0"
              />
            ) : (
              <div className="h-11 w-11 rounded-lg bg-[#5B5FC7]/25 border border-[#5B5FC7]/50 flex items-center justify-center text-[#9ba0ff] shrink-0">
                <FileText size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-gray-400">
                {formatFileSize(selectedFile.size)} • Sẵn sàng gửi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="h-7 w-7 rounded-full bg-[#383838] hover:bg-[#4a4a4a] flex items-center justify-center text-gray-300 hover:text-white transition-colors shrink-0"
            title="Hủy đính kèm"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thanh soạn thảo tin nhắn */}
      <div className="p-4 bg-[#201f1f] border-t border-[#383838]">
        {/* Input file ẩn */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#181818] border border-[#383838] focus-within:border-[#5B5FC7] rounded-xl px-4 py-2 transition-colors">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFile
                  ? 'Thêm chú thích cho tệp đính kèm (Enter để gửi)...'
                  : 'Nhập tin nhắn...'
              }
              disabled={isSending}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="hover:text-white p-1 rounded transition-colors"
                title="Gửi hình ảnh"
              >
                <ImageIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hover:text-white p-1 rounded transition-colors"
                title="Đính kèm tệp tài liệu"
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
            disabled={(!inputText.trim() && !selectedFile) || isSending}
            className="h-10 w-10 rounded-xl bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md active:scale-95 shrink-0"
            title="Gửi tin nhắn (Enter)"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Modal phóng to xem ảnh (Lightbox) */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3 self-end">
              <a
                href={`${lightboxImageUrl}?download=true`}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#383838] text-xs font-semibold text-white flex items-center gap-1.5 border border-[#484848]"
              >
                <Download size={14} />
                <span>Tải ảnh gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImageUrl(null)}
                className="h-8 w-8 rounded-lg bg-[#262626] hover:bg-[#383838] flex items-center justify-center text-white border border-[#484848]"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={lightboxImageUrl}
              alt="Xem ảnh phóng to"
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  )
}
