import { useState, useCallback, useRef, useEffect } from 'react'
import { deviceService } from '../services/deviceService'

export interface GetMediaOptions {
  audio?: boolean
  video?: boolean
  audioDeviceId?: string
  videoDeviceId?: string
}

/**
 * Custom Hook quản lý vòng đời MediaStream (Audio & Video)
 * Hỗ trợ thu Video HD 720p, tự động giáng cấp về Audio-only nếu không có Camera,
 * Bật/Tắt Mic và Camera tức thì, cùng tính năng chuyển đổi nguồn thu thiết bị.
 */
export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true)
  const [hasCameraDevice, setHasCameraDevice] = useState<boolean>(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Kiểm tra ban đầu xem thiết bị có webcam phần cứng không
  useEffect(() => {
    deviceService
      .hasCamera()
      .then((hasCam) => {
        setHasCameraDevice(hasCam)
      })
      .catch(() => {
        setHasCameraDevice(false)
      })
  }, [])

  /**
   * Yêu cầu luồng MediaStream linh hoạt (Audio và/hoặc Video HD)
   */
  const getUserMediaStream = useCallback(
    async (options: GetMediaOptions = { audio: true, video: false }): Promise<MediaStream | null> => {
      setPermissionError(null)

      const wantsVideo = options.video ?? false
      const wantsAudio = options.audio ?? true

      const audioConstraint: boolean | MediaTrackConstraints = wantsAudio
        ? options.audioDeviceId
          ? {
              deviceId: { exact: options.audioDeviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
        : false

      const videoConstraint: boolean | MediaTrackConstraints = wantsVideo
        ? options.videoDeviceId
          ? {
              deviceId: { exact: options.videoDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
        : false

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint,
        })

        streamRef.current = mediaStream
        setStream(mediaStream)
        setIsMuted(false)

        const videoTracks = mediaStream.getVideoTracks()
        if (videoTracks.length > 0) {
          setIsVideoEnabled(true)
          setLocalVideoStream(new MediaStream([videoTracks[0]]))
        } else {
          setIsVideoEnabled(false)
          setLocalVideoStream(null)
        }

        return mediaStream
      } catch (err: any) {
        console.warn('⚠️ Lỗi khi yêu cầu luồng MediaStream với cấu hình:', options, err)

        // Fallback an toàn: Nếu người dùng yêu cầu cả Video mà thất bại (không có webcam hoặc từ chối cấp quyền cam)
        // -> Hệ thống tự động giáng cấp về Audio-only để cuộc gọi không bị gián đoạn
        if (wantsVideo) {
          console.info('🔄 Đang thử tự động giáng cấp về luồng Audio-only...')
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: false,
            })
            streamRef.current = fallbackStream
            setStream(fallbackStream)
            setIsMuted(false)
            setIsVideoEnabled(false)
            setLocalVideoStream(null)
            setPermissionError('Không thể mở Camera, hệ thống đã tự động chuyển sang cuộc gọi thoại.')
            return fallbackStream
          } catch (audioFallbackErr: any) {
            console.error('❌ Thất bại cả khi fallback về audio:', audioFallbackErr)
          }
        }

        let message = 'Không thể truy cập Microphone hoặc Camera'
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Bạn đã chặn quyền truy cập Microphone/Camera. Vui lòng cho phép quyền trong cài đặt trình duyệt.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'Không tìm thấy thiết bị Microphone hoặc Camera trên máy tính của bạn.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          message = 'Thiết bị Microphone hoặc Camera đang bị ứng dụng khác chiếm dụng.'
        } else if (err.name === 'OverconstrainedError') {
          message = 'Thiết bị không đáp ứng được độ phân giải yêu cầu.'
        }
        setPermissionError(message)
        return null
      }
    },
    []
  )

  /**
   * Lấy luồng Audio thuần (Audio-only)
   */
  const getAudioStream = useCallback(async (): Promise<MediaStream | null> => {
    return getUserMediaStream({ audio: true, video: false })
  }, [getUserMediaStream])

  /**
   * Lấy luồng Video kèm Audio HD (Video Call)
   */
  const getVideoStream = useCallback(
    async (videoDeviceId?: string, audioDeviceId?: string): Promise<MediaStream | null> => {
      return getUserMediaStream({
        audio: true,
        video: true,
        videoDeviceId,
        audioDeviceId,
      })
    },
    [getUserMediaStream]
  )

  /**
   * Bật/Tắt Micro (Mute/Unmute)
   */
  const toggleMute = useCallback((): boolean => {
    if (!streamRef.current) return false
    const audioTrack = streamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)
      return audioTrack.enabled
    }
    return false
  }, [])

  /**
   * Bật/Tắt Camera (Camera on/off)
   */
  const toggleVideo = useCallback((): boolean => {
    if (!streamRef.current) return false
    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoEnabled(videoTrack.enabled)
      return videoTrack.enabled
    }
    return false
  }, [])

  /**
   * Chuyển đổi Webcam đang sử dụng
   */
  const switchCameraDevice = useCallback(
    async (deviceId: string): Promise<MediaStreamTrack | null> => {
      const result = await deviceService.switchCamera(deviceId, streamRef.current)
      if (result) {
        streamRef.current = result.stream
        setStream(result.stream)
        setLocalVideoStream(new MediaStream([result.newTrack]))
        setIsVideoEnabled(true)
        return result.newTrack
      }
      return null
    },
    []
  )

  /**
   * Chuyển đổi Microphone đang sử dụng
   */
  const switchMicrophoneDevice = useCallback(
    async (deviceId: string): Promise<MediaStreamTrack | null> => {
      const result = await deviceService.switchMicrophone(deviceId, streamRef.current)
      if (result) {
        streamRef.current = result.stream
        setStream(result.stream)
        setIsMuted(false)
        return result.newTrack
      }
      return null
    },
    []
  )

  /**
   * Dừng toàn bộ các track và giải phóng thiết bị
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStream(null)
    setLocalVideoStream(null)
    setIsMuted(false)
    setIsVideoEnabled(true)
  }, [])

  return {
    stream,
    localVideoStream,
    isMuted,
    isVideoEnabled,
    hasCameraDevice,
    permissionError,
    getUserMediaStream,
    getAudioStream,
    getVideoStream,
    toggleMute,
    toggleVideo,
    switchCameraDevice,
    switchMicrophoneDevice,
    stopStream,
  }
}
