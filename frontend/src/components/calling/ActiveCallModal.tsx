import React from 'react'
import { Mic, MicOff, PhoneOff, Minimize2 } from 'lucide-react'
import { useCall } from '../../context/CallContext'

export const ActiveCallModal: React.FC = () => {
  const {
    callStatus,
    targetUser,
    caller,
    duration,
    isMuted,
    isMinimized,
    cancelCall,
    endCall,
    toggleMute,
    toggleMinimize,
  } = useCall()

  // Không hiển thị modal đầy đủ nếu đang ở trạng thái rảnh, có chuông đến hoặc đang thu nhỏ
  if (
    callStatus === 'IDLE' ||
    callStatus === 'INCOMING_RINGING' ||
    isMinimized
  ) {
    return null
  }

  const activeUser = targetUser || caller

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#201f1f] p-8 text-center text-white shadow-2xl border border-[#383838]">
        {/* Nút thu nhỏ ở góc phải */}
        <button
          type="button"
          onClick={toggleMinimize}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#292929] transition-colors"
          title="Thu nhỏ cuộc gọi (vừa gọi vừa chat)"
        >
          <Minimize2 size={18} />
        </button>

        {/* Khung Avatar & Hiệu ứng sóng âm khi đang đàm thoại */}
        <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
          {callStatus === 'CONNECTED' && (
            <div className="absolute h-full w-full rounded-full border-2 border-emerald-500/40 animate-ping" />
          )}
          {callStatus === 'OUTGOING_RINGING' && (
            <div className="absolute h-full w-full rounded-full border-2 border-[#5B5FC7]/40 animate-pulse" />
          )}
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#5B5FC7] bg-[#292929] shadow-xl">
            {activeUser?.avatarUrl ? (
              <img src={activeUser.avatarUrl} alt={activeUser.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                {(activeUser?.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Tên và Trạng thái */}
        <h3 className="text-xl font-bold text-white">{activeUser?.displayName || 'Người dùng Teams'}</h3>

        <div className="mt-2 text-sm font-medium">
          {callStatus === 'OUTGOING_RINGING' && (
            <p className="text-gray-400 flex items-center justify-center gap-1.5 animate-pulse">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Đang đổ chuông...
            </p>
          )}

          {callStatus === 'CONNECTING' && (
            <p className="text-indigo-400 flex items-center justify-center gap-1.5 animate-pulse">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
              Đang thiết lập kết nối WebRTC...
            </p>
          )}

          {callStatus === 'CONNECTED' && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-3.5 py-1 text-xs border border-[#383838]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-sm text-emerald-300 font-semibold">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Thanh công cụ điều khiển cuộc gọi */}
        <div className="mt-10 flex items-center justify-center gap-6">
          {callStatus === 'OUTGOING_RINGING' ? (
            // Nút hủy cuộc gọi khi đang reo chuông
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={cancelCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all active:scale-90"
                title="Hủy cuộc gọi"
              >
                <PhoneOff size={24} />
              </button>
              <span className="text-xs text-gray-400">Hủy</span>
            </div>
          ) : (
            // Các nút khi đang đàm thoại (Mute Mic, Kết thúc cuộc gọi)
            <>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
                    isMuted
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#292929] hover:bg-[#383838] text-gray-200'
                  }`}
                  title={isMuted ? 'Bật Microphone' : 'Tắt Microphone'}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <span className="text-xs text-gray-400">{isMuted ? 'Đã tắt mic' : 'Micro'}</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl transition-all active:scale-90"
                  title="Kết thúc cuộc gọi"
                >
                  <PhoneOff size={24} />
                </button>
                <span className="text-xs text-gray-400">Kết thúc</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

