import React, { useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Settings,
  Users,
  PenTool,
  MonitorUp,
  MonitorOff,
  RefreshCw,
  Wifi,
} from 'lucide-react'
import { useCall } from '../../context/CallContext'
import { useAuth } from '../../context/AuthContext'
import { VideoCallView } from './VideoCallView'
import { GroupVideoGrid } from './GroupVideoGrid'
import { DeviceSettingsModal } from './DeviceSettingsModal'
import { EmbeddedWhiteboard } from '../../pages/WhiteboardPage'

export const ActiveCallModal: React.FC = () => {
  const { user } = useAuth()
  const {
    callStatus,
    callMode,
    callType,
    currentRoomId,
    targetUser,
    caller,
    participants,
    duration,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    activeScreenSharerId,
    localVideoStream,
    localScreenStream,
    isReconnecting,
    networkStats,
    isMinimized,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleMinimize,
  } = useCall()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [whiteboardTarget, setWhiteboardTarget] = useState<typeof targetUser>(null)
  const showWhiteboard = callMode === 'GROUP'
    && targetUser !== null
    && whiteboardTarget === targetUser

  // Không hiển thị modal đầy đủ nếu đang ở trạng thái rảnh, có chuông đến hoặc đang thu nhỏ
  if (
    callStatus === 'IDLE' ||
    callStatus === 'INCOMING_RINGING' ||
    isMinimized
  ) {
    return null
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Giao diện Hội nghị Video Nhóm (Mesh WebRTC 3-5 người)
  if (callMode === 'GROUP') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-2 sm:p-5">
        <div className="relative w-full h-full max-w-7xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl border border-[#383838] bg-[#141417] flex flex-col">
          {/* Header phòng họp nhóm */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-[#1b1b1f] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                {targetUser?.displayName || 'Cuộc họp nhóm'}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#5B5FC7]/20 text-[#9EA2F3] border border-[#5B5FC7]/30">
                <Users size={12} />
                {participants.length + 1} / 5
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                  networkStats.quality === 'GOOD'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : networkStats.quality === 'FAIR'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
                title={`RTT: ${networkStats.rttMs}ms • Mất gói: ${networkStats.packetLossPercent}%${
                  networkStats.maxVideoBitrateKbps ? ` • Video: ${networkStats.maxVideoBitrateKbps} kbps` : ''
                }`}
              >
                <Wifi size={12} />
                <span>
                  {networkStats.quality === 'GOOD'
                    ? 'Mạng tốt'
                    : networkStats.quality === 'FAIR'
                      ? 'Trung bình'
                      : 'Mạng yếu'}
                </span>
              </div>
              <span className="font-mono text-xs sm:text-sm text-emerald-300 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                {formatDuration(duration)}
              </span>
              <button
                type="button"
                onClick={toggleMinimize}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Thu nhỏ cuộc họp (vừa họp vừa chat)"
              >
                <Minimize2 size={17} />
              </button>
            </div>
          </div>

          {/* Banner cảnh báo mất mạng & tự động ICE Restart hoặc mạng yếu */}
          {isReconnecting && (
            <div className="px-5 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-center gap-2 text-xs font-semibold text-amber-200">
              <RefreshCw size={14} className="animate-spin" />
              <span>Đang kết nối lại cuộc gọi... (ICE Restart)</span>
            </div>
          )}
          {!isReconnecting && networkStats.quality === 'POOR' && (
            <div className="px-5 py-1.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-center gap-2 text-[11px] text-rose-200">
              <Wifi size={13} />
              <span>Mạng yếu — Đang tự động giảm bitrate video để ưu tiên âm thanh mượt mà.</span>
            </div>
          )}

          {/* Lưới Video Adaptive & VAD */}
          <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
            {showWhiteboard && currentRoomId ? (
              <>
                <div className="min-h-[180px] min-w-0 flex-1 border-b border-white/10 sm:min-h-0 sm:min-w-[250px] sm:border-b-0 sm:border-r">
                  <GroupVideoGrid
                    localUser={{
                      id: user?.id || 'me',
                      displayName: user?.displayName || 'Bạn',
                      avatarUrl: user?.avatarUrl,
                    }}
                    localStream={localVideoStream}
                    localScreenStream={localScreenStream}
                    activeScreenSharerId={activeScreenSharerId}
                    isLocalMuted={isMuted}
                    isLocalCameraOff={!isVideoEnabled}
                    participants={participants}
                  />
                </div>
                <div className="min-h-[360px] min-w-0 flex-[2]">
                  <EmbeddedWhiteboard sessionId={currentRoomId} />
                </div>
              </>
            ) : (
              <GroupVideoGrid
                localUser={{
                  id: user?.id || 'me',
                  displayName: user?.displayName || 'Bạn',
                  avatarUrl: user?.avatarUrl,
                }}
                localStream={localVideoStream}
                localScreenStream={localScreenStream}
                activeScreenSharerId={activeScreenSharerId}
                isLocalMuted={isMuted}
                isLocalCameraOff={!isVideoEnabled}
                participants={participants}
              />
            )}
          </div>

          {/* Thanh điều khiển dưới cùng */}
          <div className="h-20 px-6 flex items-center justify-center gap-3 sm:gap-4 border-t border-white/10 bg-[#1b1b1f] shrink-0">
            <button
              type="button"
              onClick={() => setWhiteboardTarget(showWhiteboard ? null : targetUser)}
              className={`h-12 px-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-md ${
                showWhiteboard
                  ? 'bg-[#5B5FC7] text-white'
                  : 'bg-[#2c2c32] text-white hover:bg-[#383840]'
              }`}
              title={showWhiteboard ? 'Đóng bảng vẽ' : 'Mở bảng vẽ cộng tác'}
            >
              <PenTool size={19} />
              <span className="hidden sm:inline text-sm">{showWhiteboard ? 'Đóng bảng' : 'Bảng vẽ'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                isMuted
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30'
                  : 'bg-[#2c2c32] text-white hover:bg-[#383840]'
              }`}
              title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                !isVideoEnabled
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30'
                  : 'bg-[#2c2c32] text-white hover:bg-[#383840]'
              }`}
              title={isVideoEnabled ? 'Tắt Camera' : 'Bật Camera'}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                isScreenSharing
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-400/60'
                  : 'bg-[#2c2c32] text-white hover:bg-[#383840]'
              }`}
              title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-12 w-12 rounded-full flex items-center justify-center bg-[#2c2c32] text-gray-200 hover:bg-[#383840] transition-all shadow-md"
              title="Cài đặt thiết bị Audio/Video"
            >
              <Settings size={20} />
            </button>

            <button
              type="button"
              onClick={endCall}
              className="h-12 px-6 rounded-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg transition-all active:scale-95"
              title="Rời khỏi phòng họp"
            >
              <PhoneOff size={20} />
              <span className="hidden sm:inline text-sm">Rời cuộc họp</span>
            </button>
          </div>

          <DeviceSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </div>
    )
  }

  // Khi đang đàm thoại cuộc gọi Video 1-1 (hoặc đang chia sẻ màn hình trong cuộc gọi 1-1) -> Hiển thị VideoCallView toàn diện
  if ((callType === 'VIDEO' || isScreenSharing || Boolean(activeScreenSharerId)) && callStatus === 'CONNECTED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-2 sm:p-6">
        <div className="relative w-full h-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-[#383838]">
          <VideoCallView />
        </div>
      </div>
    )
  }

  const activeUser = targetUser || caller

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
              {callType === 'VIDEO' ? 'Đang gọi video...' : 'Đang đổ chuông...'}
            </p>
          )}

          {callStatus === 'CONNECTING' && (
            <p className="text-indigo-400 flex items-center justify-center gap-1.5 animate-pulse">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
              Đang thiết lập kết nối WebRTC...
            </p>
          )}

          {callStatus === 'CONNECTED' && isReconnecting && (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3.5 py-1 text-xs border border-amber-500/40 text-amber-300">
              <RefreshCw size={12} className="animate-spin" />
              <span>Đang kết nối lại cuộc gọi...</span>
            </div>
          )}

          {callStatus === 'CONNECTED' && !isReconnecting && (
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
                  onClick={toggleScreenShare}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${
                    isScreenSharing
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#292929] hover:bg-[#383838] text-gray-200'
                  }`}
                  title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
                >
                  {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
                </button>
                <span className="text-xs text-gray-400">
                  {isScreenSharing ? 'Đang chia sẻ' : 'Chia sẻ'}
                </span>
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

