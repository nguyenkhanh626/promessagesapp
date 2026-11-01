import { useState, useCallback, useRef } from 'react'

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const getAudioStream = useCallback(async (): Promise<MediaStream | null> => {
    setPermissionError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsMuted(false)
      return mediaStream
    } catch (err: any) {
      let message = 'Không thể truy cập Microphone'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Bạn đã chặn quyền truy cập Microphone. Vui lòng cho phép quyền trong cài đặt trình duyệt.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Không tìm thấy thiết bị Microphone trên máy tính của bạn.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Microphone đang bị một ứng dụng khác chiếm dụng.'
      }
      setPermissionError(message)
      console.error('Lỗi getUserMedia:', err)
      return null
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return
    const audioTrack = streamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
    }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setIsMuted(false)
  }, [])

  return {
    stream,
    isMuted,
    permissionError,
    getAudioStream,
    toggleMute,
    stopStream,
  }
}

