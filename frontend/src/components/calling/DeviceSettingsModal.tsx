import React, { useEffect, useState, useRef } from 'react'
import { Mic, Video, Volume2, X, Check, VolumeX } from 'lucide-react'
import { deviceService, type AvailableDevices } from '../../services/deviceService'
import { useCall } from '../../context/CallContext'

interface DeviceSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    switchCameraDevice,
    switchMicrophoneDevice,
  } = useCall()

  const [devices, setDevices] = useState<AvailableDevices>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  })

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')
  const [volumeLevel, setVolumeLevel] = useState<number>(0)
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false)

  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Tải danh sách thiết bị khi mở modal
  useEffect(() => {
    if (!isOpen) return

    const loadDevices = async () => {
      const devList = await deviceService.getAvailableDevices()
      setDevices(devList)

      if (devList.audioInputs.length > 0 && !selectedAudioInput) {
        setSelectedAudioInput(devList.audioInputs[0].deviceId)
      }
      if (devList.videoInputs.length > 0 && !selectedVideoInput) {
        setSelectedVideoInput(devList.videoInputs[0].deviceId)
      }
      if (devList.audioOutputs.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(devList.audioOutputs[0].deviceId)
      }
    }

    loadDevices()
    const unsubscribe = deviceService.onDeviceChange(loadDevices)
    return () => {
      unsubscribe()
    }
  }, [isOpen])

  // Khởi tạo Camera Preview trong Modal
  useEffect(() => {
    if (!isOpen) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop())
        previewStreamRef.current = null
      }
      return
    }

    let isMounted = true

    const startPreview = async () => {
      try {
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((t) => t.stop())
        }

        const constraints: MediaStreamConstraints = {
          video: selectedVideoInput
            ? { deviceId: { exact: selectedVideoInput }, width: { ideal: 640 }, height: { ideal: 360 } }
            : true,
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (isMounted) {
          previewStreamRef.current = stream
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream
          }
        } else {
          stream.getTracks().forEach((t) => t.stop())
        }
      } catch (err) {
        console.warn('Không thể mở preview camera trong cài đặt:', err)
      }
    }

    if (devices.videoInputs.length > 0) {
      startPreview()
    }

    return () => {
      isMounted = false
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop())
        previewStreamRef.current = null
      }
    }
  }, [isOpen, selectedVideoInput, devices.videoInputs.length])

  // Đo âm lượng microphone thời gian thực (Audio VU Meter)
  useEffect(() => {
    if (!isOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      return
    }

    let micStream: MediaStream | null = null

    const startMeter = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
          video: false,
        })
        micStream = stream

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioCtx
        const analyser = audioCtx.createAnalyser()
        analyserRef.current = analyser
        analyser.fftSize = 256

        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          const percent = Math.min(100, Math.round((avg / 128) * 100))
          setVolumeLevel(percent)
          animFrameRef.current = requestAnimationFrame(updateMeter)
        }

        updateMeter()
      } catch (err) {
        console.warn('Không thể khởi tạo đo âm lượng mic:', err)
      }
    }

    if (devices.audioInputs.length > 0) {
      startMeter()
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      if (micStream) micStream.getTracks().forEach((t) => t.stop())
    }
  }, [isOpen, selectedAudioInput, devices.audioInputs.length])

  // Phát âm thanh kiểm tra loa
  const handleTestSound = () => {
    if (isPlayingTestSound) return
    setIsPlayingTestSound(true)

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45)

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.5)

      setTimeout(() => {
        setIsPlayingTestSound(false)
        audioCtx.close().catch(() => {})
      }, 500)
    } catch {
      setIsPlayingTestSound(false)
    }
  }

  // Đổi Microphone
  const handleChangeMicrophone = async (deviceId: string) => {
    setSelectedAudioInput(deviceId)
    await switchMicrophoneDevice(deviceId)
  }

  // Đổi Camera
  const handleChangeCamera = async (deviceId: string) => {
    setSelectedVideoInput(deviceId)
    await switchCameraDevice(deviceId)
  }

  // Đổi Loa
  const handleChangeSpeaker = async (deviceId: string) => {
    setSelectedAudioOutput(deviceId)
    const audioEl = document.querySelector('audio')
    if (audioEl) {
      await deviceService.switchSpeaker(audioEl, deviceId)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#201f1f] p-6 text-white shadow-2xl border border-[#383838]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#333] pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B5FC7]/20 text-[#7f85f5]">
              <Video size={18} />
            </div>
            <h3 className="text-base font-bold text-white">Cài đặt Thiết bị Cuộc gọi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#2b2b2b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm">
          {/* Chọn Camera & Preview */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 font-semibold text-gray-300 text-xs uppercase tracking-wider">
              <Video size={14} className="text-[#7f85f5]" />
              Máy ảnh (Webcam)
            </label>
            <select
              value={selectedVideoInput}
              onChange={(e) => handleChangeCamera(e.target.value)}
              className="w-full rounded-lg border border-[#383838] bg-[#292929] px-3 py-2 text-white outline-none focus:border-[#5B5FC7] transition-colors"
            >
              {devices.videoInputs.length === 0 ? (
                <option value="">Không tìm thấy Camera</option>
              ) : (
                devices.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>

            {/* Video Preview nhỏ */}
            <div className="mt-2.5 relative h-36 w-full overflow-hidden rounded-xl bg-black border border-[#333]">
              {devices.videoInputs.length > 0 ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-xs text-gray-500">
                  <Video size={28} className="mb-1 text-gray-600" />
                  <span>Không có tín hiệu camera</span>
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-gray-300">
                Xem trước
              </span>
            </div>
          </div>

          {/* Chọn Microphone & VU Meter */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 font-semibold text-gray-300 text-xs uppercase tracking-wider">
              <Mic size={14} className="text-[#7f85f5]" />
              Microphone
            </label>
            <select
              value={selectedAudioInput}
              onChange={(e) => handleChangeMicrophone(e.target.value)}
              className="w-full rounded-lg border border-[#383838] bg-[#292929] px-3 py-2 text-white outline-none focus:border-[#5B5FC7] transition-colors"
            >
              {devices.audioInputs.length === 0 ? (
                <option value="">Không tìm thấy Microphone</option>
              ) : (
                devices.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))
              )}
            </select>

            {/* Thanh đo âm lượng Microphone (VU Meter) */}
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-400">Âm lượng mic:</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#1b1b1b] border border-[#333]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#5B5FC7] transition-all duration-75"
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-xs text-gray-400">{volumeLevel}%</span>
            </div>
          </div>

          {/* Chọn Loa / Tai nghe & Nút Test Sound */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 font-semibold text-gray-300 text-xs uppercase tracking-wider">
              <Volume2 size={14} className="text-[#7f85f5]" />
              Loa / Tai nghe (Audio Output)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedAudioOutput}
                onChange={(e) => handleChangeSpeaker(e.target.value)}
                className="w-full rounded-lg border border-[#383838] bg-[#292929] px-3 py-2 text-white outline-none focus:border-[#5B5FC7] transition-colors"
              >
                {devices.audioOutputs.length === 0 ? (
                  <option value="">Loa mặc định hệ thống</option>
                ) : (
                  devices.audioOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={handleTestSound}
                className="flex items-center gap-1.5 shrink-0 rounded-lg bg-[#2b2b2b] hover:bg-[#383838] px-3 py-2 text-xs font-medium text-gray-200 transition-colors"
                title="Phát chuông kiểm tra âm thanh loa"
              >
                {isPlayingTestSound ? <VolumeX size={15} className="text-amber-400 animate-bounce" /> : <Volume2 size={15} />}
                <span>Kiểm tra</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="mt-6 flex items-center justify-end border-t border-[#333] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg bg-[#5B5FC7] hover:bg-[#4f52b2] px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors"
          >
            <Check size={15} />
            <span>Xong</span>
          </button>
        </div>
      </div>
    </div>
  )
}

