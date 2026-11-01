import React from 'react'
import { Phone, PhoneOff } from 'lucide-react'
import { useCall } from '../../context/CallContext'

export const IncomingCallModal: React.FC = () => {
  const { callStatus, caller, acceptCall, rejectCall } = useCall()

  if (callStatus !== 'INCOMING_RINGING' || !caller) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#201f1f] p-8 text-center text-white shadow-2xl border border-[#383838]">
        {/* Vòng tròn sóng rung động (Pulse Ring Animation) */}
        <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
          <div className="absolute h-full w-full rounded-full bg-[#5B5FC7]/20 animate-ping" />
          <div className="absolute h-24 w-24 rounded-full bg-[#5B5FC7]/30" />
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#5B5FC7] bg-[#292929] shadow-lg">
            {caller.avatarUrl ? (
              <img src={caller.avatarUrl} alt={caller.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                {(caller.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Thông tin người gọi */}
        <h3 className="text-xl font-bold text-white tracking-wide">{caller.displayName}</h3>
        <p className="mt-1 text-sm text-[#7f85f5] font-medium flex items-center justify-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Cuộc gọi thoại Teams đến...
        </p>

        {/* Nút thao tác Nhận / Từ chối */}
        <div className="mt-8 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={rejectCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all active:scale-90"
              title="Từ chối cuộc gọi"
            >
              <PhoneOff size={24} />
            </button>
            <span className="text-xs text-gray-400">Từ chối</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={acceptCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all active:scale-90 animate-bounce"
              title="Chấp nhận cuộc gọi"
            >
              <Phone size={24} />
            </button>
            <span className="text-xs text-gray-400">Trả lời</span>
          </div>
        </div>
      </div>
    </div>
  )
}

