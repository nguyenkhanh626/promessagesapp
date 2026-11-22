import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MicOff, MonitorUp, Pin, PinOff, Volume2 } from 'lucide-react'
import type { GroupParticipant } from '../../types/calling'
import { useVoiceActivity, type VoiceStreamEntry } from '../../hooks/useVoiceActivity'

interface GroupVideoGridProps {
  localUser: {
    id: string
    displayName: string
    avatarUrl?: string
  }
  localStream: MediaStream | null
  localScreenStream?: MediaStream | null
  activeScreenSharerId?: string | null
  isLocalMuted: boolean
  isLocalCameraOff: boolean
  participants: GroupParticipant[]
}

interface TileData {
  id: string
  displayName: string
  avatarUrl?: string
  stream?: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  isLocal: boolean
  isScreenShareTile: boolean
}

const VideoTile: React.FC<{
  tile: TileData
  isSpeaking: boolean
  audioLevel: number
  isPinned: boolean
  onTogglePin: (id: string) => void
  className?: string
}> = ({ tile, isSpeaking, audioLevel, isPinned, onTogglePin, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (tile.stream) {
      el.srcObject = tile.stream
      el.play().catch(() => {})
    } else {
      el.srcObject = null
    }
  }, [tile.stream, tile.isCameraOff, tile.isScreenShareTile])

  const hasVideo = Boolean(
    tile.stream &&
      (!tile.isCameraOff || tile.isScreenShareTile) &&
      tile.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  )

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gray-900 border transition-all duration-200 flex items-center justify-center group ${
        tile.isScreenShareTile
          ? 'border-[#5B5FC7] ring-2 ring-[#5B5FC7]/70 bg-[#0b0b0e]'
          : isSpeaking
            ? 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
            : 'border-white/10'
      } ${className}`}
    >
      {/* Luôn gắn thẻ video cho remote để phát audio ngay cả khi họ tắt camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.isLocal}
        className={`w-full h-full ${
          tile.isScreenShareTile
            ? 'object-contain bg-[#0b0b0e]'
            : `object-cover ${tile.isLocal ? 'scale-x-[-1]' : ''}`
        } ${hasVideo ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
      />

      {tile.isScreenShareTile && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5B5FC7]/90 backdrop-blur-md text-white text-xs font-semibold shadow-md">
          <MonitorUp size={13} />
          <span>
            Màn hình của {tile.displayName} {tile.isLocal ? '(Bạn)' : ''}
          </span>
        </div>
      )}

      {!hasVideo && (
        <div className="flex flex-col items-center justify-center p-4">
          <div
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gradient-to-br from-[#5B5FC7] to-[#7B83EB] text-white text-xl font-bold shadow-lg ${
              isSpeaking ? 'border-emerald-400 scale-105 transition-transform' : 'border-white/20'
            }`}
          >
            {tile.avatarUrl ? (
              <img
                src={tile.avatarUrl}
                alt={tile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              tile.displayName.charAt(0).toUpperCase()
            )}
          </div>
          {!tile.stream && !tile.isLocal && (
            <span className="mt-2 text-xs text-gray-400 animate-pulse">Đang kết nối...</span>
          )}
        </div>
      )}

      {/* Nút Ghim (Pin/Unpin) */}
      <button
        onClick={() => onTogglePin(tile.id)}
        title={isPinned ? 'Bỏ ghim' : 'Ghim lên màn hình chính'}
        className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md transition-opacity ${
          isPinned
            ? 'bg-[#5B5FC7] text-white opacity-100'
            : 'bg-black/50 text-white/80 hover:bg-black/75 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
      </button>

      {/* Thanh hiển thị tên, trạng thái Mic và sóng âm VAD */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 max-w-[80%]">
          {tile.isMuted ? (
            <MicOff size={13} className="text-red-400 shrink-0" />
          ) : isSpeaking ? (
            <Volume2 size={13} className="text-emerald-400 shrink-0 animate-pulse" />
          ) : null}
          <span className="text-xs font-medium text-white truncate">
            {tile.displayName} {tile.isLocal ? '(Bạn)' : ''}
          </span>
        </div>

        {isSpeaking && !tile.isMuted && (
          <div className="flex items-end gap-0.5 h-3.5 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40">
            <span
              className="w-0.5 bg-emerald-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(25, Math.min(100, audioLevel))}%` }}
            />
            <span
              className="w-0.5 bg-emerald-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(40, Math.min(100, audioLevel * 1.15))}%` }}
            />
            <span
              className="w-0.5 bg-emerald-400 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(20, Math.min(100, audioLevel * 0.85))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const GroupVideoGrid: React.FC<GroupVideoGridProps> = ({
  localUser,
  localStream,
  localScreenStream,
  activeScreenSharerId,
  isLocalMuted,
  isLocalCameraOff,
  participants,
}) => {
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  const allTiles: TileData[] = useMemo(() => {
    const isLocalSharing = Boolean(
      localScreenStream && activeScreenSharerId === localUser.id
    )
    const list: TileData[] = [
      {
        id: localUser.id,
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
        stream: isLocalSharing ? localScreenStream : localStream,
        isMuted: isLocalMuted,
        isCameraOff: isLocalSharing ? false : isLocalCameraOff,
        isLocal: true,
        isScreenShareTile: isLocalSharing,
      },
    ]

    participants.forEach((p) => {
      const isPeerSharing = Boolean(p.isScreenSharing || activeScreenSharerId === p.userId)
      list.push({
        id: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        stream: p.stream,
        isMuted: p.isMuted,
        isCameraOff: isPeerSharing ? false : p.isCameraOff,
        isLocal: false,
        isScreenShareTile: isPeerSharing,
      })
    })

    return list
  }, [
    localUser,
    localStream,
    localScreenStream,
    activeScreenSharerId,
    isLocalMuted,
    isLocalCameraOff,
    participants,
  ])

  // Nếu người đang ghim rời phòng thì bỏ ghim
  useEffect(() => {
    if (pinnedId && !allTiles.some((t) => t.id === pinnedId)) {
      setPinnedId(null)
    }
  }, [allTiles, pinnedId])

  const voiceEntries: VoiceStreamEntry[] = useMemo(
    () =>
      allTiles.map((t) => ({
        id: t.id,
        stream: t.stream,
        isMuted: t.isMuted,
      })),
    [allTiles]
  )

  const { speakingUsers, audioLevels } = useVoiceActivity(voiceEntries, true)

  const handleTogglePin = (id: string) => {
    setPinnedId((prev) => (prev === id ? null : id))
  }

  // Tự động ưu tiên Spotlight cho thành viên đang chia sẻ màn hình (hoặc người được ghim thủ công)
  const effectiveSpotlightId = pinnedId || activeScreenSharerId || null
  const pinnedTile = effectiveSpotlightId
    ? allTiles.find((t) => t.id === effectiveSpotlightId)
    : null
  const otherTiles = pinnedTile ? allTiles.filter((t) => t.id !== pinnedTile.id) : allTiles

  // Chế độ Spotlight (có 1 ô được Ghim)
  if (pinnedTile) {
    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
        <div className="flex-1 min-h-0">
          <VideoTile
            tile={pinnedTile}
            isSpeaking={Boolean(speakingUsers[pinnedTile.id])}
            audioLevel={audioLevels[pinnedTile.id] || 0}
            isPinned={true}
            onTogglePin={handleTogglePin}
            className="w-full h-full"
          />
        </div>
        {otherTiles.length > 0 && (
          <div className="flex md:flex-col gap-2.5 md:w-56 h-28 md:h-full overflow-x-auto md:overflow-y-auto shrink-0">
            {otherTiles.map((tile) => (
              <VideoTile
                key={tile.id}
                tile={tile}
                isSpeaking={Boolean(speakingUsers[tile.id])}
                audioLevel={audioLevels[tile.id] || 0}
                isPinned={false}
                onTogglePin={handleTogglePin}
                className="w-40 md:w-full h-full md:h-36 shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Chế độ Adaptive Grid cho 1 -> 5 người
  const count = allTiles.length
  let gridClass = 'grid-cols-1'
  if (count === 2) {
    gridClass = 'grid-cols-1 md:grid-cols-2'
  } else if (count === 3 || count === 4) {
    gridClass = 'grid-cols-2 grid-rows-2'
  } else if (count >= 5) {
    gridClass = 'grid-cols-6 grid-rows-2'
  }

  return (
    <div className={`w-full h-full grid ${gridClass} gap-3 p-3 overflow-hidden`}>
      {allTiles.map((tile, index) => {
        let spanClass = ''
        if (count >= 5) {
          // 3 ô hàng trên (mỗi ô 2 cột), 2 ô hàng dưới (mỗi ô 3 cột)
          spanClass = index < 3 ? 'col-span-2' : 'col-span-3'
        }
        return (
          <VideoTile
            key={tile.id}
            tile={tile}
            isSpeaking={Boolean(speakingUsers[tile.id])}
            audioLevel={audioLevels[tile.id] || 0}
            isPinned={false}
            onTogglePin={handleTogglePin}
            className={`w-full h-full min-h-[140px] ${spanClass}`}
          />
        )
      })}
    </div>
  )
}
