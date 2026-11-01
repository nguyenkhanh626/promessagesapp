import React from 'react'
import { Mic, MicOff, PhoneOff, Maximize2 } from 'lucide-react'
import { useCall } from '../../context/CallContext'

export const FloatingCallBar: React.FC = () => {
  const {
    callStatus,
    targetUser,
    caller,
    duration,
    isMuted,
    isMinimized,
    endCall,
    toggleMute,
    toggleMinimize,
  } = useCall()

  if (callStatus === 'IDLE' || callStatus === 'INCOMING_RINGING' || !isMinimized) {
    return null
  }

  const activeUser = targetUser || caller

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#201f1f]/95 backdrop-blur-md px-4 py-3 shadow-2xl border border-[#383838] animate-slide-up text-white">
      {/* Avatar thu nhỏ */}
      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#5B5FC7] bg-[#292929] shrink-0">
        {activeUser?.avatarUrl ? (
          <img src={activeUser.avatarUrl} alt={activeUser.displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
            {(activeUser?.displayName || 'U').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Thông tin cuộc gọi thu nhỏ */}
      <div className="flex flex-col pr-2">
        <p className="text-sm font-bold text-white leading-tight max-w-[120px] truncate">
          {activeUser?.displayName || 'Cuộc gọi'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400 font-semibold">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Nút thao tác nhanh */}
      <div className="flex items-center gap-1.5 border-l border-[#383838] pl-2">
        <button
          type="button"
          onClick={toggleMute}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            isMuted ? 'bg-rose-600 text-white' : 'bg-[#292929] hover:bg-[#383838] text-gray-200'
          }`}
          title={isMuted ? 'Bật mic' : 'Tắt mic'}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        <button
          type="button"
          onClick={toggleMinimize}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#292929] hover:bg-[#383838] text-gray-200 transition-colors"
          title="Mở rộng cửa sổ cuộc gọi"
        >
          <Maximize2 size={15} />
        </button>

        <button
          type="button"
          onClick={endCall}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          title="Kết thúc cuộc gọi"
        >
          <PhoneOff size={15} />
        </button>
      </div>
    </div>
  )
}

