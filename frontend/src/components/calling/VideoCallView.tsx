import React, { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize,
  Minimize,
  Minimize2,
  Settings,
} from 'lucide-react'
import { useCall } from '../../context/CallContext'
import { DeviceSettingsModal } from './DeviceSettingsModal'

type PipPosition = 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'

export const VideoCallView: React.FC = () => {
  const {
    caller,
    targetUser,
    duration,
    isMuted,
    isVideoEnabled,
    isRemoteCameraOff,
    localVideoStream,
    remoteStream,
    iceConnectionState,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
  } = useCall()

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [pipPosition, setPipPosition] = useState<PipPosition>('bottom-right')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)

  const activeUser = targetUser || caller

  // Gắn luồng Remote Stream vào thẻ video đối phương
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Gắn luồng Local Video Stream vào thẻ video PiP bản thân
  useEffect(() => {
    if (localVideoRef.current && localVideoStream) {
      localVideoRef.current.srcObject = localVideoStream
    }
  }, [localVideoStream])

  // Chuyển đổi toàn màn hình (Fullscreen)
  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.warn('Lỗi khi chuyển đổi toàn màn hình:', err)
    }
  }

  // Lắng nghe phím ESC hoặc thay đổi fullscreen của trình duyệt
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  // Chuyển đổi vị trí PiP theo vòng lặp các góc
  const cyclePipPosition = () => {
    const positions: PipPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']
    const nextIndex = (positions.indexOf(pipPosition) + 1) % positions.length
    setPipPosition(positions[nextIndex])
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Phân loại nhãn và màu sắc chất lượng đường truyền mạng
  const getNetworkQualityInfo = () => {
    switch (iceConnectionState) {
      case 'connected':
      case 'completed':
        return { label: 'Đường truyền tốt (HD)', color: 'bg-emerald-500', text: 'text-emerald-400' }
      case 'checking':
      case 'new':
        return { label: 'Đang kết nối...', color: 'bg-amber-500 animate-pulse', text: 'text-amber-400' }
      case 'disconnected':
      case 'failed':
      default:
        return { label: 'Mạng chập chờn', color: 'bg-rose-500 animate-ping', text: 'text-rose-400' }
    }
  }

  const netInfo = getNetworkQualityInfo()

  // CSS class theo góc cho cửa sổ PiP
  const pipPositionClasses: Record<PipPosition, string> = {
    'bottom-right': 'bottom-20 right-6',
    'bottom-left': 'bottom-20 left-6',
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#111] text-white select-none"
    >
      {/* Khung Video Đối phương (Remote Video chiếm toàn bộ màn hình) */}
      <div className="relative flex-1 w-full h-full bg-[#181818] overflow-hidden flex items-center justify-center">
        {remoteStream && !isRemoteCameraOff ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          /* Fallback hiển thị Avatar lớn khi đối phương tắt camera */
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#5B5FC7]/40 bg-[#292929] shadow-2xl">
              {activeUser?.avatarUrl ? (
                <img
                  src={activeUser.avatarUrl}
                  alt={activeUser.displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-white tracking-wider">
                  {getInitials(activeUser?.displayName)}
                </span>
              )}
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">{activeUser?.displayName || 'Người dùng Teams'}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 bg-black/40 px-3 py-1 rounded-full">
              <VideoOff size={13} className="text-gray-400" />
              <span>Đối phương đã tắt camera</span>
            </p>
          </div>
        )}

        {/* Thanh Header phía trên: Tên & Thời lượng cuộc gọi & Badge Mạng */}
        <div className="absolute top-4 left-6 z-20 flex items-center gap-3 rounded-xl bg-black/50 backdrop-blur-md px-3.5 py-2 border border-white/10 shadow-lg">
          <div>
            <h4 className="text-sm font-bold text-white leading-tight">{activeUser?.displayName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-emerald-400 font-semibold">{formatDuration(duration)}</span>
              <span className="text-gray-500 text-xs">•</span>
              <div className="flex items-center gap-1.5" title={netInfo.label}>
                <span className={`h-2 w-2 rounded-full ${netInfo.color}`} />
                <span className={`text-[11px] font-medium ${netInfo.text}`}>{netInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cửa sổ Video Bản Thân dạng Picture-in-Picture (PiP) */}
        <div
          onClick={cyclePipPosition}
          className={`absolute z-30 h-44 w-32 sm:h-52 sm:w-40 overflow-hidden rounded-2xl border-2 border-[#5B5FC7]/70 bg-[#201f1f] shadow-2xl transition-all duration-300 cursor-pointer hover:border-[#5B5FC7] hover:scale-105 ${pipPositionClasses[pipPosition]}`}
          title="Bấm để chuyển đổi góc màn hình PiP"
        >
          {isVideoEnabled && localVideoStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#242424] p-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#383838] text-[#7f85f5]">
                <VideoOff size={20} />
              </div>
              <span className="mt-2 text-[11px] font-medium text-gray-400">Camera đã tắt</span>
            </div>
          )}

          {/* Nhãn nhỏ ở góc PiP */}
          <span className="absolute bottom-1.5 left-2 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white">
            Bạn
          </span>
        </div>
      </div>

      {/* Thanh Điều Khiển Cuộc Gọi Nổi Phía Dưới (Floating Control Bar) */}
      <div className="relative z-30 flex items-center justify-center border-t border-white/10 bg-[#1e1e1e]/90 backdrop-blur-md px-6 py-3.5">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Nút Bật/Tắt Micro */}
          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-all active:scale-95 ${
              isMuted
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-[#2d2d2d] text-white hover:bg-[#383838]'
            }`}
            title={isMuted ? 'Bật micro (M)' : 'Tắt micro (M)'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Nút Bật/Tắt Camera */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-all active:scale-95 ${
              !isVideoEnabled
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-[#5B5FC7] text-white hover:bg-[#4f52b2]'
            }`}
            title={isVideoEnabled ? 'Tắt camera (V)' : 'Bật camera (V)'}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Nút Cài đặt thiết bị (Mic/Cam/Loa) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2d2d2d] text-gray-200 hover:text-white hover:bg-[#383838] transition-all shadow-md active:scale-95"
            title="Cài đặt thiết bị Microphone, Webcam, Loa"
          >
            <Settings size={20} />
          </button>

          {/* Nút Thu nhỏ cửa sổ (vừa gọi vừa nhắn tin) */}
          <button
            type="button"
            onClick={toggleMinimize}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2d2d2d] text-gray-200 hover:text-white hover:bg-[#383838] transition-all shadow-md active:scale-95"
            title="Thu nhỏ cửa sổ cuộc gọi"
          >
            <Minimize2 size={20} />
          </button>

          {/* Nút Toàn màn hình */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2d2d2d] text-gray-200 hover:text-white hover:bg-[#383838] transition-all shadow-md active:scale-95"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          <div className="h-6 w-[1px] bg-white/20 mx-1" />

          {/* Nút Kết thúc cuộc gọi */}
          <button
            type="button"
            onClick={endCall}
            className="flex h-11 px-5 items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg transition-all active:scale-95"
            title="Kết thúc cuộc gọi"
          >
            <PhoneOff size={20} />
            <span className="hidden sm:inline">Rời cuộc gọi</span>
          </button>
        </div>
      </div>

      {/* Modal Cài đặt thiết bị Microphone, Camera, Loa */}
      <DeviceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
