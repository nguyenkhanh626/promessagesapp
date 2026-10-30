import React, { useState } from 'react'
import { Edit, Search, User as UserIcon, X } from 'lucide-react'
import type { Conversation } from '../../types/chat'
import type { User } from '../../types/auth'

interface ChatSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (conversation: Conversation) => void
  onStartDirectChat: (targetUser: User) => void
  searchResults: User[]
  onSearchUsers: (query: string) => void
  isSearching: boolean
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartDirectChat,
  searchResults,
  onSearchUsers,
  isSearching,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearchUsers(query)
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    try {
      const date = new Date(timeStr)
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <aside className="w-80 h-full flex flex-col bg-[#201f1f] border-r border-[#383838] select-none">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-[#383838] flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-wide">Trò chuyện</h2>
        <button
          type="button"
          onClick={() => {
            setShowNewChatModal(true)
            onSearchUsers('')
          }}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
          title="Bắt đầu cuộc trò chuyện mới"
        >
          <Edit size={18} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Lọc theo tên hoặc tin nhắn..."
            className="w-full bg-[#181818] border border-[#383838] rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B5FC7]"
          />
        </div>
      </div>

      {/* Modal / Danh sách tìm kiếm bạn bè để chat 1-1 */}
      {showNewChatModal && (
        <div className="p-3 bg-[#262626] border-b border-[#383838] animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-[#7f85f5]">Bắt đầu chat 1-1</span>
            <button
              onClick={() => setShowNewChatModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <input
            type="text"
            autoFocus
            placeholder="Tìm người dùng theo tên hoặc email..."
            onChange={(e) => onSearchUsers(e.target.value)}
            className="w-full bg-[#181818] border border-[#404040] rounded px-3 py-1.5 text-xs text-white mb-2 focus:border-[#5B5FC7] focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {isSearching ? (
              <p className="text-xs text-gray-400 py-2 text-center">Đang tìm kiếm...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">Không tìm thấy ai</p>
            ) : (
              searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onStartDirectChat(user)
                    setShowNewChatModal(false)
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded hover:bg-[#383838] text-left transition-colors"
                >
                  <div className="relative h-7 w-7 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Danh sách cuộc trò chuyện */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a]">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            <UserIcon size={32} className="mx-auto mb-2 opacity-40" />
            <p>Chưa có cuộc trò chuyện nào.</p>
            <p className="mt-1">Nhấn biểu tượng cây bút ở trên để bắt đầu nhắn tin 1-1!</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const isOnline = conv.otherUser?.status === 'ONLINE'

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                  isActive ? 'bg-[#292929] border-l-4 border-[#5B5FC7]' : 'hover:bg-[#252525]'
                }`}
              >
                {/* Avatar */}
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                  {conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt={conv.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-bold text-sm text-white">
                      {(conv.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  {/* Chấm trạng thái online */}
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#201f1f] ${
                      isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                    }`}
                  />
                </div>

                {/* Thông tin cuộc hội thoại */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white truncate">{conv.name || 'Cuộc trò chuyện'}</p>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {conv.lastMessageContent || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}

