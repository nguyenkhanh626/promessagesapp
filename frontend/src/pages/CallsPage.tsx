import React, { useEffect, useState, useCallback } from 'react'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  RefreshCw,
  Search,
  Video,
  Users,
  Timer,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCall } from '../context/CallContext'
import { callService } from '../services/callService'
import type { CallHistoryItem, CallStats } from '../types/calling'

type TypeFilter = 'ALL' | 'AUDIO' | 'VIDEO' | 'GROUP'
type StatusFilter = 'ALL' | 'COMPLETED' | 'MISSED' | 'REJECTED'

export const CallsPage: React.FC = () => {
  const { user } = useAuth()
  const { startCall, joinGroupCall, callStatus } = useCall()
  const [history, setHistory] = useState<CallHistoryItem[]>([])
  const [stats, setStats] = useState<CallStats | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const [historyData, statsData] = await Promise.all([
        callService.getCallHistory(user.id, typeFilter, statusFilter),
        callService.getCallStats(user.id),
      ])
      setHistory(Array.isArray(historyData) ? historyData : [])
      setStats(statsData)
    } catch (err) {
      console.error('Lỗi khi tải lịch sử cuộc gọi:', err)
      setHistory([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, typeFilter, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs.toString().padStart(2, '0')}s`
    }
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
    const isGroup = Boolean(item.isGroup)
    const isCaller =
      item.initiatorId === user?.id ||
      item.initiatorId === user?.email ||
      item.initiatorName === user?.displayName

    const displayName = isGroup
      ? item.groupName || item.otherUserName || 'Cuộc họp nhóm'
      : item.otherUserName ||
        (isCaller ? item.receiverName : item.initiatorName) ||
        (isCaller ? item.receiverId : item.initiatorId) ||
        'Người dùng'

    const avatarUrl = isGroup
      ? undefined
      : item.otherUserAvatar || (isCaller ? item.receiverAvatar : item.initiatorAvatar)

    const targetId = isGroup
      ? item.roomId
      : item.otherUserId || (isCaller ? item.receiverId : item.initiatorId)

    const isMissedOrFailed =
      item.status === 'MISSED' ||
      item.status === 'REJECTED' ||
      item.status === 'CANCELLED' ||
      item.status === 'BUSY'

    return {
      isGroup,
      isCaller,
      displayName,
      avatarUrl,
      targetId,
      isMissedOrFailed,
    }
  }

  const filteredHistory = safeHistory.filter((item) => {
    if (!item) return false
    const { displayName, targetId } = getCallMeta(item)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const matchName = displayName.toLowerCase().includes(q)
      const matchId = targetId ? targetId.toLowerCase().includes(q) : false
      if (!matchName && !matchId) return false
    }
    return true
  })

  const handleQuickCall = (item: CallHistoryItem, callType: 'AUDIO' | 'VIDEO') => {
    const { isGroup, targetId, displayName, avatarUrl } = getCallMeta(item)
    if (!targetId) return

    if (isGroup) {
      joinGroupCall(targetId, displayName, callType)
      return
    }

    startCall(
      {
        id: targetId,
        displayName,
        avatarUrl,
      },
      callType
    )
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getStatusLabel = (item: CallHistoryItem, isCaller: boolean) => {
    if (item.status === 'MISSED') {
      return {
        label: 'Cuộc gọi nhỡ',
        cls: 'text-rose-400 font-semibold bg-rose-500/10',
        icon: <PhoneMissed size={12} />,
      }
    }
    if (item.status === 'REJECTED' || item.status === 'CANCELLED' || item.status === 'BUSY') {
      return {
        label: item.status === 'REJECTED' ? 'Đã từ chối' : item.status === 'BUSY' ? 'Máy bận' : 'Đã hủy',
        cls: 'text-amber-400 font-medium bg-amber-500/10',
        icon: <PhoneMissed size={12} />,
      }
    }
    if (item.isGroup) {
      return {
        label: 'Hoàn tất',
        cls: 'text-emerald-400 font-medium bg-emerald-500/10',
        icon: <Users size={12} />,
      }
    }
    if (isCaller) {
      return {
        label: 'Cuộc gọi đi',
        cls: 'text-indigo-400 font-medium bg-indigo-500/10',
        icon: <PhoneOutgoing size={12} />,
      }
    }
    return {
      label: 'Cuộc gọi đến',
      cls: 'text-emerald-400 font-medium bg-emerald-500/10',
      icon: <PhoneIncoming size={12} />,
    }
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
            <h1 className="text-base font-bold text-white">Lịch sử & Thống kê Cuộc gọi</h1>
            <p className="text-xs text-gray-400">Quản lý cuộc gọi 1-1 và cuộc họp nhóm WebRTC</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#292929] px-3 text-xs font-semibold text-gray-300 hover:bg-[#383838] hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </header>

      {/* Thẻ thống kê nhanh (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 border-b border-[#383838] bg-[#1c1c1e] px-6 py-4 shrink-0">
        <div className="rounded-xl border border-[#2f2f35] bg-[#242428] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Tổng cuộc gọi</p>
            <p className="text-xl font-bold text-white mt-1">{stats?.totalCalls ?? safeHistory.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#5B5FC7]/20 text-[#8b90f8] flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-[#2f2f35] bg-[#242428] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Cuộc gọi nhỡ</p>
            <p className="text-xl font-bold text-rose-400 mt-1">{stats?.missedCalls ?? 0}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
            <PhoneMissed size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-[#2f2f35] bg-[#242428] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Cuộc họp nhóm</p>
            <p className="text-xl font-bold text-purple-300 mt-1">{stats?.groupCalls ?? 0}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-[#2f2f35] bg-[#242428] p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Tổng thời lượng</p>
            <p className="text-lg font-bold text-emerald-300 mt-1 font-mono">
              {formatDuration(stats?.totalDurationSeconds ?? 0)}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Timer size={20} />
          </div>
        </div>
      </div>

      {/* Bộ lọc Loại + Trạng thái & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#383838] bg-[#201f1f]/60 px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'AUDIO', label: 'Thoại' },
              { key: 'VIDEO', label: 'Video' },
              { key: 'GROUP', label: 'Cuộc họp nhóm' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === tab.key
                  ? 'bg-[#5B5FC7] text-white'
                  : 'bg-[#262626] text-gray-400 hover:text-white hover:bg-[#333]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="h-5 w-[1px] bg-[#383838] mx-1 hidden sm:block" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 rounded-lg border border-[#383838] bg-[#181818] px-2.5 text-xs text-gray-200 focus:border-[#5B5FC7] focus:outline-none"
            aria-label="Lọc theo trạng thái cuộc gọi"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="COMPLETED">Thành công</option>
            <option value="MISSED">Cuộc gọi nhỡ</option>
            <option value="REJECTED">Từ chối / Hủy</option>
          </select>
        </div>

        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc nhóm..."
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
              Các cuộc gọi 1-1 và cuộc họp nhóm WebRTC sẽ được tự động ghi nhận tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-5xl mx-auto">
            {filteredHistory.map((item) => {
              const { isGroup, isCaller, displayName, avatarUrl, isMissedOrFailed } = getCallMeta(item)
              const statusBadge = getStatusLabel(item, isCaller)

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#2e2e2e] bg-[#201f1f] p-4 transition-all hover:border-[#3d3d3d] hover:bg-[#252525]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar người tham gia / Nhóm */}
                    <div
                      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 flex items-center justify-center font-bold text-sm text-white shadow-md ${
                        isGroup
                          ? 'border-[#5B5FC7]/60 bg-[#5B5FC7]/25 text-[#9EA2F3]'
                          : 'border-[#383838] bg-[#2a2b36]'
                      }`}
                    >
                      {isGroup ? (
                        <Users size={20} />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[#a5b4fc]">{getInitials(displayName)}</span>
                      )}
                    </div>

                    {/* Chi tiết người gọi & Phân loại cuộc gọi */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
                        {isGroup && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#5B5FC7]/20 px-2 py-0.5 text-[10px] font-semibold text-[#9EA2F3] border border-[#5B5FC7]/30 shrink-0">
                            Nhóm {item.participantCount ? `• ${item.participantCount} người` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                        {/* Nhãn loại cuộc gọi (Video hoặc Thoại) */}
                        {item.callType === 'VIDEO' ? (
                          <span className="inline-flex items-center gap-1 text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded">
                            <Video size={12} />
                            Video
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sky-400 font-medium bg-sky-500/10 px-2 py-0.5 rounded">
                            <Phone size={12} />
                            Thoại
                          </span>
                        )}

                        {/* Nhãn phân loại trạng thái */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${statusBadge.cls}`}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock size={11} />
                          {formatCallTime(item.createdAt)}
                        </span>

                        <span>•</span>

                        <span
                          className={
                            isMissedOrFailed ? 'text-gray-500' : 'text-gray-300 font-medium font-mono'
                          }
                        >
                          {isMissedOrFailed ? '00:00' : formatDuration(item.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút gọi lại 1-click (Thoại & Video) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickCall(item, 'AUDIO')}
                      disabled={callStatus !== 'IDLE'}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#292929] hover:bg-[#5B5FC7] text-gray-300 hover:text-white transition-all disabled:opacity-40 shadow-sm active:scale-95"
                      title={isGroup ? `Gọi thoại nhóm ${displayName}` : `Gọi thoại lại cho ${displayName}`}
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCall(item, 'VIDEO')}
                      disabled={callStatus !== 'IDLE'}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#292929] hover:bg-emerald-600 text-gray-300 hover:text-white transition-all disabled:opacity-40 shadow-sm active:scale-95"
                      title={isGroup ? `Họp video nhóm ${displayName}` : `Gọi video lại cho ${displayName}`}
                    >
                      <Video size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
