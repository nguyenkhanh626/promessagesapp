import React, { useEffect, useState } from 'react'
import { Check, Search, Users, X } from 'lucide-react'
import type { User } from '../../types/auth'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string, memberIds: string[]) => Promise<void>
  searchResults: User[]
  onSearchUsers: (query: string) => void
  isSearching: boolean
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  searchResults,
  onSearchUsers,
  isSearching,
}) => {
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setGroupName('')
      setSearchQuery('')
      setSelectedUsers([])
      setError(null)
      onSearchUsers('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const toggleSelectUser = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id)
      if (exists) {
        return prev.filter((u) => u.id !== user.id)
      }
      return [...prev, user]
    })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    onSearchUsers(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('Vui lòng nhập tên nhóm trò chuyện')
      return
    }
    if (selectedUsers.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thành viên tham gia nhóm')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await onCreateGroup(
        groupName.trim(),
        selectedUsers.map((u) => u.id)
      )
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tạo nhóm. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#201f1f] border border-[#383838] shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#383838] bg-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#5B5FC7]/20 border border-[#5B5FC7]/40 flex items-center justify-center text-[#7f85f5]">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Tạo nhóm trò chuyện mới</h3>
              <p className="text-xs text-gray-400">Mời các thành viên tham gia phòng họp & nhắn tin</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-3.5 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Tên nhóm */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Tên nhóm <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Nhóm Đồ Án Tuần 3, Team Backend..."
              maxLength={150}
              autoFocus
              className="w-full bg-[#181818] border border-[#383838] focus:border-[#5B5FC7] rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Thành viên đã chọn */}
          {selectedUsers.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-gray-300 mb-1.5">
                Đã chọn ({selectedUsers.length} thành viên)
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-[#181818] border border-[#323232]">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 bg-[#5B5FC7]/25 border border-[#5B5FC7]/50 text-indigo-200 text-xs px-2.5 py-1 rounded-full"
                  >
                    <span className="truncate max-w-[120px] font-medium">{u.displayName}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectUser(u)}
                      className="hover:text-white text-indigo-300"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tìm kiếm thành viên */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Thêm thành viên vào nhóm <span className="text-rose-400">*</span>
            </label>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Tìm theo tên hiển thị hoặc email..."
                className="w-full bg-[#181818] border border-[#383838] focus:border-[#5B5FC7] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>

            <div className="max-h-52 overflow-y-auto rounded-lg bg-[#181818] border border-[#323232] divide-y divide-[#262626]">
              {isSearching ? (
                <p className="text-xs text-gray-400 py-6 text-center">Đang tìm kiếm người dùng...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">Không tìm thấy người dùng phù hợp</p>
              ) : (
                searchResults.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-2.5 text-left transition-colors ${
                        isSelected ? 'bg-[#5B5FC7]/15' : 'hover:bg-[#262626]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-[#5B5FC7] shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[#5B5FC7] border-[#5B5FC7] text-white'
                            : 'border-[#484848] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check size={13} />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#323232]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#323232] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selectedUsers.length === 0}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#5B5FC7] hover:bg-[#4f52b2] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md"
            >
              {isSubmitting ? 'Đang tạo nhóm...' : `Tạo nhóm (${selectedUsers.length + 1})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
