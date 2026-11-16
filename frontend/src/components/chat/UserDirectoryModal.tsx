import React, { useEffect, useState } from 'react'
import { BookUser, MessageSquare, Search, X } from 'lucide-react'
import type { User } from '../../types/auth'
import type { UserPresenceStatus } from '../../types/chat'
import { chatService } from '../../services/chatService'

interface UserDirectoryModalProps {
  isOpen: boolean
  onClose: () => void
  onStartDirectChat: (targetUser: User) => void
}

export const STATUS_CONFIG: Record<
  UserPresenceStatus,
  { label: string; dotColor: string; badgeClass: string }
> = {
  ONLINE: {
    label: 'Đang hoạt động',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  BUSY: {
    label: 'Đang bận',
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  AWAY: {
    label: 'Tạm vắng',
    dotColor: 'bg-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  OFFLINE: {
    label: 'Ngoại tuyến',
    dotColor: 'bg-gray-500',
    badgeClass: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  },
}

export const UserDirectoryModal: React.FC<UserDirectoryModalProps> = ({
  isOpen,
  onClose,
  onStartDirectChat,
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserPresenceStatus>('ALL')
  const [isLoading, setIsLoading] = useState(false)

  const fetchDirectory = async (q: string, st: 'ALL' | UserPresenceStatus) => {
    setIsLoading(true)
    try {
      const data = await chatService.getUserDirectory(q, st === 'ALL' ? undefined : st)
      setUsers(data)
    } catch (err) {
      console.error('Không thể tải danh bạ người dùng:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setStatusFilter('ALL')
      fetchDirectory('', 'ALL')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    fetchDirectory(val, statusFilter)
  }

  const handleStatusChange = (st: 'ALL' | UserPresenceStatus) => {
    setStatusFilter(st)
    fetchDirectory(query, st)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#201f1f] border border-[#383838] shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#383838] bg-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#5B5FC7]/20 border border-[#5B5FC7]/40 flex items-center justify-center text-[#7f85f5]">
              <BookUser size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Danh bạ người dùng</h3>
              <p className="text-xs text-gray-400">
                Tra cứu đồng nghiệp & trạng thái hoạt động trực tuyến
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#383838] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="p-4 border-b border-[#323232] space-y-3 bg-[#1c1c1c]">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Tìm đồng nghiệp theo tên hiển thị hoặc email..."
              autoFocus
              className="w-full bg-[#262626] border border-[#383838] focus:border-[#5B5FC7] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ONLINE', label: 'Đang hoạt động' },
                { key: 'BUSY', label: 'Đang bận' },
                { key: 'AWAY', label: 'Tạm vắng' },
                { key: 'OFFLINE', label: 'Ngoại tuyến' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleStatusChange(item.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                  statusFilter === item.key
                    ? 'bg-[#5B5FC7] border-[#5B5FC7] text-white'
                    : 'bg-[#262626] border-[#383838] text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#2a2a2a] p-2">
          {isLoading ? (
            <p className="text-xs text-gray-400 py-10 text-center">Đang tải danh bạ...</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-gray-500 py-10 text-center">
              Không tìm thấy người dùng nào phù hợp
            </p>
          ) : (
            users.map((user) => {
              const st = (user.status as UserPresenceStatus) || 'OFFLINE'
              const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.OFFLINE

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-bold text-sm text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#201f1f] ${cfg.dotColor}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">
                          {user.displayName}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onStartDirectChat(user)
                      onClose()
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#5B5FC7] hover:bg-[#4f52b2] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0 ml-2"
                  >
                    <MessageSquare size={13} />
                    <span>Nhắn tin</span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
