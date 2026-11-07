import React, { useState } from 'react'
import { Edit, Search, User as UserIcon, Users, X } from 'lucide-react'
import type { Conversation } from '../../types/chat'
import type { User } from '../../types/auth'

interface ChatSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (conversation: Conversation) => void
  onStartDirectChat: (targetUser: User) => void
  onOpenCreateGroup: () => void
  searchResults: User[]
  onSearchUsers: (query: string) => void
  isSearching: boolean
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartDirectChat,
  onOpenCreateGroup,
  searchResults,
  onSearchUsers,
  isSearching,
}) => {
  const [filterQuery, setFilterQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'DIRECT' | 'GROUP'>('ALL')
  const [showNewChatModal, setShowNewChatModal] = useState(false)

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

  const filteredConversations = conversations.filter((conv) => {
    if (activeTab !== 'ALL' && conv.type !== activeTab) return false
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    const matchName = (conv.name || '').toLowerCase().includes(q)
    const matchLastMsg = (conv.lastMessageContent || '').toLowerCase().includes(q)
    return matchName || matchLastMsg
  })

  return (
    <aside className="w-80 h-full flex flex-col bg-[#201f1f] border-r border-[#383838] select-none shrink-0">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-[#383838] flex items-center justify-between">
        <h2 className="text-lg font-bold text-white tracking-wide">Trò chuyện</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-[#5B5FC7]/20 hover:bg-[#5B5FC7]/30 border border-[#5B5FC7]/40 transition-colors"
            title="Tạo nhóm chat mới"
          >
            <Users size={15} />
            <span>Tạo nhóm</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewChatModal((prev) => !prev)
              onSearchUsers('')
            }}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#383838] transition-colors"
            title="Bắt đầu cuộc trò chuyện 1-1 mới"
          >
            <Edit size={17} />
          </button>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="p-3 pb-2 space-y-2 border-b border-[#2e2e2e]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Lọc theo tên hoặc tin nhắn..."
            className="w-full bg-[#181818] border border-[#383838] rounded-md py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#5B5FC7]"
          />
        </div>

        {/* Bộ lọc Tất cả / Cá nhân / Nhóm */}
        <div className="grid grid-cols-3 gap-1 bg-[#181818] p-1 rounded-lg border border-[#303030]">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'DIRECT', label: 'Cá nhân' },
              { key: 'GROUP', label: 'Nhóm' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-[#5B5FC7] text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modal / Danh sách tìm kiếm bạn bè để chat 1-1 */}
      {showNewChatModal && (
        <div className="p-3 bg-[#262626] border-b border-[#383838]">
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
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            <UserIcon size={32} className="mx-auto mb-2 opacity-40" />
            <p>Chưa có cuộc trò chuyện nào.</p>
            <p className="mt-1">Nhấn "Tạo nhóm" hoặc biểu tượng cây bút để bắt đầu!</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const isGroup = conv.type === 'GROUP'
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

                  {isGroup ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#383838] border border-[#201f1f] flex items-center justify-center text-[#9ba0ff]"
                      title="Trò chuyện nhóm"
                    >
                      <Users size={9} />
                    </span>
                  ) : (
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#201f1f] ${
                        isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                      }`}
                    />
                  )}
                </div>

                {/* Thông tin cuộc hội thoại */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {conv.name || 'Cuộc trò chuyện'}
                      </p>
                      {isGroup && (
                        <span className="px-1.5 py-0.2 rounded bg-[#323232] text-[10px] text-gray-300 font-medium shrink-0">
                          {conv.memberCount}
                        </span>
                      )}
                    </div>
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
