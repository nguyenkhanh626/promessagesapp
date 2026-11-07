import React, { useState } from 'react'
import { Crown, LogOut, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import type { Conversation, ConversationMember } from '../../types/chat'
import type { User } from '../../types/auth'

interface GroupMembersPanelProps {
  conversation: Conversation
  members: ConversationMember[]
  currentUserId: string | undefined
  onClose: () => void
  onAddMembers: (userIds: string[]) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  searchResults: User[]
  onSearchUsers: (query: string) => void
}

export const GroupMembersPanel: React.FC<GroupMembersPanelProps> = ({
  conversation,
  members,
  currentUserId,
  onClose,
  onAddMembers,
  onRemoveMember,
  searchResults,
  onSearchUsers,
}) => {
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const currentMember = members.find((m) => m.userId === currentUserId)
  const isAdmin = currentMember?.role === 'ADMIN' || conversation.currentUserRole === 'ADMIN'

  const memberIdSet = new Set(members.map((m) => m.userId))
  const availableUsersToAdd = searchResults.filter((u) => !memberIdSet.has(u.id))

  const handleAddSingleUser = async (userId: string) => {
    setIsProcessing(true)
    try {
      await onAddMembers([userId])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveUser = async (targetUserId: string) => {
    setIsProcessing(true)
    try {
      await onRemoveMember(targetUserId)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <aside className="w-80 h-full flex flex-col bg-[#201f1f] border-l border-[#383838] text-white select-none shrink-0">
      {/* Header */}
      <div className="h-16 px-4 border-b border-[#383838] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#7f85f5]" />
          <h3 className="font-bold text-sm text-white">Thành viên nhóm ({members.length})</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#383838] transition-colors"
          title="Đóng bảng thành viên"
        >
          <X size={16} />
        </button>
      </div>

      {/* Group Profile Info */}
      <div className="p-4 border-b border-[#323232] flex flex-col items-center text-center bg-[#252525]/50">
        <div className="h-16 w-16 rounded-2xl overflow-hidden bg-[#5B5FC7] mb-2.5 shadow-lg border border-[#383838] flex items-center justify-center">
          {conversation.avatarUrl ? (
            <img src={conversation.avatarUrl} alt={conversation.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-white">
              {(conversation.name || 'G').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h4 className="font-bold text-base text-white px-2 truncate w-full">{conversation.name}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{members.length} thành viên tham gia</p>

        {/* Nút thêm thành viên */}
        <button
          type="button"
          onClick={() => {
            setShowAddMember((prev) => !prev)
            if (!showAddMember) {
              setSearchQuery('')
              onSearchUsers('')
            }
          }}
          className="mt-3 w-full py-2 px-3 rounded-lg bg-[#5B5FC7]/20 hover:bg-[#5B5FC7]/30 border border-[#5B5FC7]/50 text-[#9ba0ff] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <UserPlus size={15} />
          <span>{showAddMember ? 'Đóng khung thêm' : 'Thêm thành viên mới'}</span>
        </button>
      </div>

      {/* Khu vực tìm và thêm thành viên */}
      {showAddMember && (
        <div className="p-3 bg-[#1b1b1b] border-b border-[#383838] space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onSearchUsers(e.target.value)
              }}
              placeholder="Tìm người dùng để thêm..."
              className="w-full bg-[#262626] border border-[#383838] focus:border-[#5B5FC7] rounded-md py-1.5 pl-8 pr-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {availableUsersToAdd.length === 0 ? (
              <p className="text-[11px] text-gray-500 text-center py-2">
                Không có người dùng mới để thêm
              </p>
            ) : (
              availableUsersToAdd.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAddSingleUser(user.id)}
                    className="px-2.5 py-1 rounded bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-40 text-[11px] font-semibold text-white shrink-0"
                  >
                    Thêm
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Danh sách thành viên hiện tại */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {members.map((member) => {
          const isMe = member.userId === currentUserId
          const isOnline = member.status === 'ONLINE'
          const isMemberAdmin = member.role === 'ADMIN'

          return (
            <div
              key={member.userId}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[#292929] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-9 w-9 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                      {(member.displayName || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#201f1f] ${
                      isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white truncate">
                      {member.displayName} {isMe && <span className="text-gray-400 font-normal">(Bạn)</span>}
                    </p>
                    {isMemberAdmin && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold shrink-0"
                        title="Quản trị viên nhóm"
                      >
                        <Crown size={10} />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
                </div>
              </div>

              {/* Nút xóa thành viên (dành cho Admin) */}
              {isAdmin && !isMe && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRemoveUser(member.userId)}
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all shrink-0"
                  title={`Mời ${member.displayName} ra khỏi nhóm`}
                >
                  <UserMinus size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer: Nút Rời nhóm */}
      {currentUserId && (
        <div className="p-3 border-t border-[#323232] bg-[#1a1a1a]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handleRemoveUser(currentUserId)}
            className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut size={14} />
            <span>Rời khỏi nhóm trò chuyện</span>
          </button>
        </div>
      )}
    </aside>
  )
}
