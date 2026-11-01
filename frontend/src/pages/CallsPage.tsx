import React, { useEffect, useState, useCallback } from 'react'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCall } from '../context/CallContext'
import { callService } from '../services/callService'
import type { CallHistoryItem } from '../types/calling'

type FilterType = 'ALL' | 'MISSED' | 'INCOMING' | 'OUTGOING'

export const CallsPage: React.FC = () => {
  const { user } = useAuth()
  const { startCall, callStatus } = useCall()
  const [history, setHistory] = useState<CallHistoryItem[]>([])
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const data = await callService.getCallHistory(user.id)
      setHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Lỗi khi tải lịch sử cuộc gọi:', err)
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs.toString().padStart(2, '0')}s`
  }

  const formatCallTime = (dateStr?: any) => {
    if (!dateStr) return ''
    try {
      if (Array.isArray(dateStr)) {
        const [year, month, day, hour = 0, minute = 0] = dateStr
        const date = new Date(year, month - 1, day, hour, minute)
        return date.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      }
      const date = new Date(dateStr)
      return isNaN(date.getTime())
        ? String(dateStr)
        : date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
    } catch {
      return String(dateStr)
    }
  }

  const safeHistory = Array.isArray(history) ? history : []

  const getCallMeta = (item: CallHistoryItem) => {
    const isCaller =
      item.initiatorId === user?.id ||
      item.initiatorId === user?.email ||
      item.initiatorName === user?.displayName

    const displayName =
      item.otherUserName ||
      (isCaller ? item.receiverName : item.initiatorName) ||
      (isCaller ? item.receiverId : item.initiatorId) ||
      'Người dùng'

    const avatarUrl =
      item.otherUserAvatar ||
      (isCaller ? item.receiverAvatar : item.initiatorAvatar)

    const targetId =
      item.otherUserId ||
      (isCaller ? item.receiverId : item.initiatorId)

    const isMissed =
      item.status === 'MISSED' ||
      item.status === 'REJECTED' ||
      item.status === 'CANCELLED'

    return {
      isCaller,
      displayName,
      avatarUrl,
      targetId,
      isMissed,
    }
  }

  const filteredHistory = safeHistory.filter((item) => {
    if (!item) return false
    const { isCaller, displayName, targetId, isMissed } = getCallMeta(item)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const matchName = displayName.toLowerCase().includes(q)
      const matchId = targetId ? targetId.toLowerCase().includes(q) : false
      if (!matchName && !matchId) return false
    }

    if (filter === 'MISSED') {
      return isMissed
    }
    if (filter === 'INCOMING') {
      return !isCaller
    }
    if (filter === 'OUTGOING') {
      return isCaller
    }
    return true
  })

  const handleQuickCall = (item: CallHistoryItem) => {
    const { targetId, displayName, avatarUrl } = getCallMeta(item)
    if (!targetId) return

    startCall({
      id: targetId,
      displayName,
      avatarUrl,
    })
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#181818] text-white">
      {/* Header trang Cuộc gọi */}
      <header className="flex h-16 items-center justify-between border-b border-[#383838] bg-[#201f1f] px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B5FC7]/20 text-[#7f85f5]">
            <Phone size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Lịch sử Cuộc gọi</h1>
            <p className="text-xs text-gray-400">Xem các cuộc gọi thoại WebRTC 1-1 gần đây</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadHistory}
          disabled={isLoading}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#292929] px-3 text-xs font-semibold text-gray-300 hover:bg-[#383838] hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </header>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex items-center justify-between gap-4 border-b border-[#383838] bg-[#201f1f]/50 px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'MISSED', label: 'Cuộc gọi nhỡ' },
              { key: 'INCOMING', label: 'Cuộc gọi đến' },
              { key: 'OUTGOING', label: 'Cuộc gọi đi' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#5B5FC7] text-white'
                  : 'bg-[#262626] text-gray-400 hover:text-white hover:bg-[#333]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên người dùng..."
            className="h-9 w-full rounded-lg border border-[#383838] bg-[#181818] pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-[#5B5FC7] focus:outline-none"
          />
        </div>
      </div>

      {/* Danh sách các cuộc gọi */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredHistory.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#383838] bg-[#222] text-gray-400">
              <Phone size={28} />
            </div>
            <p className="text-sm font-semibold text-gray-300">Không có lịch sử cuộc gọi nào</p>
            <p className="text-xs text-gray-500 max-w-xs mt-1">
              Các cuộc gọi thoại được thực hiện qua WebRTC 1-1 sẽ xuất hiện tự động tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto">
            {filteredHistory.map((item) => {
              const { isCaller, displayName, avatarUrl, isMissed } = getCallMeta(item)

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#2e2e2e] bg-[#201f1f] p-4 transition-all hover:border-[#3d3d3d] hover:bg-[#252525]"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar người tham gia */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#383838] bg-[#2a2b36] flex items-center justify-center font-bold text-sm text-white shadow-md">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[#a5b4fc]">{getInitials(displayName)}</span>
                      )}
                    </div>

                    {/* Chi tiết người gọi & Phân loại cuộc gọi */}
                    <div>
                      <h4 className="text-sm font-bold text-white hover:text-indigo-300 transition-colors">
                        {displayName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        {/* Nhãn phân loại Cuộc gọi đến / đi / nhỡ */}
                        {isMissed ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded">
                            <PhoneMissed size={12} />
                            Cuộc gọi nhỡ
                          </span>
                        ) : isCaller ? (
                          <span className="inline-flex items-center gap-1 text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded">
                            <PhoneOutgoing size={12} />
                            Cuộc gọi đi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
                            <PhoneIncoming size={12} />
                            Cuộc gọi đến
                          </span>
                        )}

                        <span>•</span>

                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock size={11} />
                          {formatCallTime(item.createdAt)}
                        </span>

                        <span>•</span>

                        <span
                          className={
                            isMissed
                              ? 'text-gray-500'
                              : 'text-gray-300 font-medium font-mono'
                          }
                        >
                          {isMissed ? 'Bị hủy' : formatDuration(item.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút gọi lại */}
                  <button
                    type="button"
                    onClick={() => handleQuickCall(item)}
                    disabled={callStatus !== 'IDLE'}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#292929] hover:bg-[#5B5FC7] text-gray-300 hover:text-white transition-all disabled:opacity-40 shadow-sm active:scale-95"
                    title={`Gọi thoại lại cho ${displayName}`}
                  >
                    <Phone size={17} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
