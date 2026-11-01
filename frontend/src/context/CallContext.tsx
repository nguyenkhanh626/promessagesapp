import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import type { CallStatus, CallUserInfo, SignalMessage } from '../types/calling'
import { signalingService } from '../services/signalingService'
import { webrtcManager } from '../services/webrtcManager'
import { callSounds } from '../utils/callSounds'
import { useMediaStream } from '../hooks/useMediaStream'
import { useAuth } from './AuthContext'

interface CallContextType {
  callStatus: CallStatus
  currentRoomId: string | null
  caller: CallUserInfo | null
  targetUser: CallUserInfo | null
  duration: number
  isMuted: boolean
  isMinimized: boolean
  errorMessage: string | null
  startCall: (target: CallUserInfo) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  cancelCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleMinimize: () => void
  clearError: () => void
}

const CallContext = createContext<CallContextType | null>(null)

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth()
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE')
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [caller, setCaller] = useState<CallUserInfo | null>(null)
  const [targetUser, setTargetUser] = useState<CallUserInfo | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const durationTimerRef = useRef<any>(null)
  const timeoutTimerRef = useRef<any>(null)

  const {
    isMuted,
    permissionError,
    getAudioStream,
    toggleMute,
    stopStream,
  } = useMediaStream()

  // Khởi tạo thẻ audio ngầm để phát âm thanh đối phương
  useEffect(() => {
    const audio = document.createElement('audio')
    audio.autoplay = true
    remoteAudioRef.current = audio
    return () => {
      audio.srcObject = null
      audio.remove()
    }
  }, [])

  // Kết nối Signaling Server khi có Auth Token
  useEffect(() => {
    if (token) {
      signalingService.connect(token)
    } else {
      signalingService.disconnect()
    }
  }, [token])

  const cleanupCallState = useCallback(() => {
    callSounds.stopAll()
    stopStream()
    webrtcManager.close()
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    setCallStatus('IDLE')
    setCurrentRoomId(null)
    setCaller(null)
    setTargetUser(null)
    setDuration(0)
    setIsMinimized(false)
  }, [stopStream])

  // Bộ đếm thời gian đàm thoại
  useEffect(() => {
    if (callStatus === 'CONNECTED') {
      setDuration(0)
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
    }
  }, [callStatus])

  // Lắng nghe các bản tin Signaling từ WebSocket
  useEffect(() => {
    const unsubscribe = signalingService.subscribe(async (msg: SignalMessage) => {
      console.log('📥 [CallContext] Nhận Signal:', msg.type, msg)

      switch (msg.type) {
        case 'CALL_INVITE': {
          // Nếu đang bận gọi, tự động từ chối bằng CALL_BUSY
          if (callStatus !== 'IDLE') {
            signalingService.sendSignal({
              type: 'CALL_BUSY',
              senderId: user?.id || 'me',
              receiverId: msg.senderId,
              roomId: msg.roomId,
              payload: { reason: 'User is busy' },
            })
            return
          }

          setCurrentRoomId(msg.roomId || null)
          setCaller({
            id: msg.senderId,
            displayName: msg.senderName || 'Người dùng',
            avatarUrl: msg.payload?.avatarUrl,
            email: msg.payload?.email,
          })
          setCallStatus('INCOMING_RINGING')
          callSounds.playIncomingRingtone()
          break
        }

        case 'CALL_ACCEPT': {
          callSounds.stopAll()
          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
          setCallStatus('CONNECTING')

          try {
            // Người gọi tạo WebRTC Offer và gửi sang đối phương
            const offer = await webrtcManager.createOffer()
            signalingService.sendSignal({
              type: 'CALL_OFFER',
              senderId: user?.id || 'me',
              receiverId: targetUser?.id || msg.senderId,
              roomId: currentRoomId || msg.roomId,
              payload: offer,
            })
          } catch (err) {
            console.error('Lỗi khi tạo Offer:', err)
            cleanupCallState()
          }
          break
        }

        case 'CALL_OFFER': {
          callSounds.stopAll()
          setCallStatus('CONNECTING')

          try {
            // Người nhận nhận Offer và sinh Answer trả về
            const answer = await webrtcManager.handleOfferAndCreateAnswer(msg.payload)
            signalingService.sendSignal({
              type: 'CALL_ANSWER',
              senderId: user?.id || 'me',
              receiverId: caller?.id || msg.senderId,
              roomId: currentRoomId || msg.roomId,
              payload: answer,
            })
            setCallStatus('CONNECTED')
          } catch (err) {
            console.error('Lỗi khi xử lý Offer:', err)
            cleanupCallState()
          }
          break
        }

        case 'CALL_ANSWER': {
          try {
            await webrtcManager.handleAnswer(msg.payload)
            setCallStatus('CONNECTED')
          } catch (err) {
            console.error('Lỗi khi nhận Answer:', err)
          }
          break
        }

        case 'ICE_CANDIDATE': {
          if (msg.payload) {
            await webrtcManager.addIceCandidate(msg.payload)
          }
          break
        }

        case 'CALL_REJECT': {
          callSounds.stopAll()
          callSounds.playEndTone()
          setErrorMessage('Đối phương đã từ chối cuộc gọi.')
          cleanupCallState()
          break
        }

        case 'CALL_BUSY': {
          callSounds.stopAll()
          callSounds.playEndTone()
          setErrorMessage('Đối phương hiện đang bận cuộc gọi khác.')
          cleanupCallState()
          break
        }

        case 'CALL_CANCEL': {
          callSounds.stopAll()
          cleanupCallState()
          break
        }

        case 'CALL_TIMEOUT': {
          callSounds.stopAll()
          callSounds.playEndTone()
          setErrorMessage('Cuộc gọi không có phản hồi.')
          cleanupCallState()
          break
        }

        case 'CALL_END': {
          callSounds.stopAll()
          callSounds.playEndTone()
          cleanupCallState()
          break
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [callStatus, user, targetUser, caller, currentRoomId, cleanupCallState])

  // Khởi tạo cuộc gọi đi (Outgoing Call)
  const startCall = async (target: CallUserInfo) => {
    if (callStatus !== 'IDLE') return

    setErrorMessage(null)
    const stream = await getAudioStream()
    if (!stream) return

    const roomId = `${user?.id}_${target.id}_${Date.now()}`
    setCurrentRoomId(roomId)
    setTargetUser(target)
    setCallStatus('OUTGOING_RINGING')

    // Khởi tạo WebRTC Peer
    webrtcManager.init(
      (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream
        }
      },
      (candidate) => {
        signalingService.sendSignal({
          type: 'ICE_CANDIDATE',
          senderId: user?.id || 'me',
          receiverId: target.id,
          roomId,
          payload: candidate.toJSON(),
        })
      }
    )
    webrtcManager.setLocalStream(stream)

    callSounds.playDialTone()

    // Bắn bản tin mời gọi
    signalingService.sendSignal({
      type: 'CALL_INVITE',
      senderId: user?.id || 'me',
      senderName: user?.displayName || 'Người dùng Teams',
      receiverId: target.id,
      roomId,
      payload: {
        avatarUrl: user?.avatarUrl,
        email: user?.email,
      },
    })

    // Timeout tự hủy sau 35 giây nếu đối phương không nghe máy
    timeoutTimerRef.current = setTimeout(() => {
      cancelCall()
      setErrorMessage('Không có phản hồi từ đối phương.')
    }, 35000)
  }

  // Chấp nhận cuộc gọi đến (Accept Call)
  const acceptCall = async () => {
    if (!caller || !currentRoomId) return

    callSounds.stopAll()
    const stream = await getAudioStream()
    if (!stream) {
      rejectCall()
      return
    }

    // Khởi tạo WebRTC Peer
    webrtcManager.init(
      (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream
        }
      },
      (candidate) => {
        signalingService.sendSignal({
          type: 'ICE_CANDIDATE',
          senderId: user?.id || 'me',
          receiverId: caller.id,
          roomId: currentRoomId,
          payload: candidate.toJSON(),
        })
      }
    )
    webrtcManager.setLocalStream(stream)

    setCallStatus('CONNECTING')

    // Bắn bản tin chấp nhận
    signalingService.sendSignal({
      type: 'CALL_ACCEPT',
      senderId: user?.id || 'me',
      senderName: user?.displayName || 'Người dùng Teams',
      receiverId: caller.id,
      roomId: currentRoomId,
    })
  }

  // Từ chối cuộc gọi đến (Reject Call)
  const rejectCall = () => {
    if (caller && currentRoomId) {
      signalingService.sendSignal({
        type: 'CALL_REJECT',
        senderId: user?.id || 'me',
        receiverId: caller.id,
        roomId: currentRoomId,
      })
    }
    cleanupCallState()
  }

  // Hủy cuộc gọi đi khi đang đổ chuông (Cancel Call)
  const cancelCall = () => {
    if (targetUser && currentRoomId) {
      signalingService.sendSignal({
        type: 'CALL_CANCEL',
        senderId: user?.id || 'me',
        receiverId: targetUser.id,
        roomId: currentRoomId,
      })
    }
    cleanupCallState()
  }

  // Kết thúc cuộc gọi đang đàm thoại (End Call)
  const endCall = () => {
    const peerId = targetUser?.id || caller?.id
    if (peerId && currentRoomId) {
      signalingService.sendSignal({
        type: 'CALL_END',
        senderId: user?.id || 'me',
        receiverId: peerId,
        roomId: currentRoomId,
      })
    }
    callSounds.playEndTone()
    cleanupCallState()
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev)
  }

  const clearError = () => {
    setErrorMessage(null)
  }

  return (
    <CallContext.Provider
      value={{
        callStatus,
        currentRoomId,
        caller,
        targetUser,
        duration,
        isMuted,
        isMinimized,
        errorMessage: errorMessage || permissionError,
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleMinimize,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export const useCall = () => {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall phải được sử dụng bên trong CallProvider')
  }
  return context
}

