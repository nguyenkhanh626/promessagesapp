import { useEffect, useRef, useState } from 'react'

export interface VoiceStreamEntry {
  id: string
  stream?: MediaStream | null
  isMuted?: boolean
}

interface AnalyserItem {
  id: string
  streamId: string
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  dataArray: Uint8Array<ArrayBuffer>
}

const SPEECH_THRESHOLD = 14 // Ngưỡng âm lượng (0 - 255)
const HOLD_DURATION_MS = 650 // Giữ trạng thái nói thêm 650ms tránh chớp tắt liên tục
const SAMPLE_INTERVAL_MS = 100

/**
 * Hook nhận diện giọng nói thời gian thực (Voice Activity Detection - VAD)
 * sử dụng Web Audio API AnalyserNode cho cả Local Stream và Remote Streams.
 */
export function useVoiceActivity(entries: VoiceStreamEntry[], enabled: boolean = true) {
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({})
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({})

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analysersRef = useRef<Map<string, AnalyserItem>>(new Map())
  const lastSpokeAtRef = useRef<Record<string, number>>({})
  const entriesRef = useRef<VoiceStreamEntry[]>(entries)
  entriesRef.current = entries

  useEffect(() => {
    if (!enabled) {
      setSpeakingUsers({})
      setAudioLevels({})
      return
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx()
    }
    const ctx = audioCtxRef.current

    // Đồng bộ danh sách AnalyserNode với các stream hiện có
    const activeIds = new Set<string>()
    entries.forEach(({ id, stream, isMuted }) => {
      if (!stream || isMuted) return
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0 || !audioTracks.some((t) => t.enabled)) return

      activeIds.add(id)
      const existing = analysersRef.current.get(id)
      if (existing && existing.streamId === stream.id) return

      // Nếu stream đổi, dọn cái cũ trước
      if (existing) {
        try {
          existing.source.disconnect()
          existing.analyser.disconnect()
        } catch {}
      }

      try {
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.4
        source.connect(analyser)

        const dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
        analysersRef.current.set(id, {
          id,
          streamId: stream.id,
          source,
          analyser,
          dataArray,
        })
      } catch (err) {
        console.warn(`⚠️ [VAD] Không thể tạo AnalyserNode cho '${id}':`, err)
      }
    })

    // Xóa các analyser không còn active
    Array.from(analysersRef.current.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        const item = analysersRef.current.get(id)
        if (item) {
          try {
            item.source.disconnect()
            item.analyser.disconnect()
          } catch {}
          analysersRef.current.delete(id)
        }
      }
    })
  }, [entries, enabled])

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => {
      const ctx = audioCtxRef.current
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      const now = Date.now()
      const nextSpeaking: Record<string, boolean> = {}
      const nextLevels: Record<string, number> = {}

      entriesRef.current.forEach(({ id, isMuted }) => {
        if (isMuted) {
          nextSpeaking[id] = false
          nextLevels[id] = 0
          return
        }

        const item = analysersRef.current.get(id)
        if (!item) {
          nextSpeaking[id] = false
          nextLevels[id] = 0
          return
        }

        item.analyser.getByteFrequencyData(item.dataArray)
        let sum = 0
        for (let i = 0; i < item.dataArray.length; i++) {
          sum += item.dataArray[i]
        }
        const avg = sum / item.dataArray.length
        nextLevels[id] = Math.min(100, Math.round((avg / 64) * 100))

        if (avg >= SPEECH_THRESHOLD) {
          lastSpokeAtRef.current[id] = now
          nextSpeaking[id] = true
        } else {
          const last = lastSpokeAtRef.current[id] || 0
          nextSpeaking[id] = now - last < HOLD_DURATION_MS
        }
      })

      setSpeakingUsers(nextSpeaking)
      setAudioLevels(nextLevels)
    }, SAMPLE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [enabled])

  useEffect(() => {
    return () => {
      analysersRef.current.forEach((item) => {
        try {
          item.source.disconnect()
          item.analyser.disconnect()
        } catch {}
      })
      analysersRef.current.clear()
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [])

  return { speakingUsers, audioLevels }
}
