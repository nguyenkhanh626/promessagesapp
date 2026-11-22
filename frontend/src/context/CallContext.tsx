import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import type { CallMode, CallStatus, CallUserInfo, GroupParticipant, SignalMessage } from '../types/calling'
import { signalingService } from '../services/signalingService'
import { webrtcManager } from '../services/webrtcManager'
import { meshWebrtcManager } from '../services/meshWebrtcManager'
import { callSounds } from '../utils/callSounds'
import { useMediaStream } from '../hooks/useMediaStream'
import { useAuth } from './AuthContext'

interface CallContextType {
  callStatus: CallStatus
  callMode: CallMode
  callType: 'AUDIO' | 'VIDEO'
  currentRoomId: string | null
  caller: CallUserInfo | null
  targetUser: CallUserInfo | null
  participants: GroupParticipant[]
  duration: number
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  activeScreenSharerId: string | null
  isRemoteCameraOff: boolean
  isRemoteMuted: boolean
  hasCameraDevice: boolean
  localVideoStream: MediaStream | null
  localScreenStream: MediaStream | null
  remoteStream: MediaStream | null
  iceConnectionState: RTCIceConnectionState
  isMinimized: boolean
  errorMessage: string | null
  startCall: (target: CallUserInfo, type?: 'AUDIO' | 'VIDEO') => Promise<void>
  joinGroupCall: (roomId: string, groupName: string, type?: 'AUDIO' | 'VIDEO') => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  cancelCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => Promise<void>
  switchCameraDevice: (deviceId: string) => Promise<MediaStreamTrack | null>
  switchMicrophoneDevice: (deviceId: string) => Promise<MediaStreamTrack | null>
  toggleMinimize: () => void
  clearError: () => void
}

const CallContext = createContext<CallContextType | null>(null)

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth()
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE')
  const [callMode, setCallMode] = useState<CallMode>('DIRECT')
  const [currentCallType, setCurrentCallType] = useState<'AUDIO' | 'VIDEO'>('AUDIO')
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [caller, setCaller] = useState<CallUserInfo | null>(null)
  const [targetUser, setTargetUser] = useState<CallUserInfo | null>(null)
  const [participants, setParticipants] = useState<GroupParticipant[]>([])
  const [duration, setDuration] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState<boolean>(false)
  const [isRemoteMuted, setIsRemoteMuted] = useState<boolean>(false)
  const [activeScreenSharerId, setActiveScreenSharerId] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new')

  const callModeRef = useRef<CallMode>('DIRECT')
  const groupLocalStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const durationTimerRef = useRef<any>(null)
  const timeoutTimerRef = useRef<any>(null)

  const {
    localVideoStream,
    localScreenStream,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    hasCameraDevice,
    permissionError,
    getAudioStream,
    getVideoStream,
    toggleMute: toggleLocalMute,
    toggleVideo: toggleLocalVideo,
    switchCameraDevice,
    switchMicrophoneDevice,
    startScreenShare,
    stopScreenShare,
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
    meshWebrtcManager.closeAll()
    groupLocalStreamRef.current = null
    callModeRef.current = 'DIRECT'
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
    setCallMode('DIRECT')
    setCurrentCallType('AUDIO')
    setCurrentRoomId(null)
    setCaller(null)
    setTargetUser(null)
    setParticipants([])
    setDuration(0)
    setIsMinimized(false)
    setIsRemoteCameraOff(false)
    setIsRemoteMuted(false)
    setActiveScreenSharerId(null)
    setRemoteStream(null)
    setIceConnectionState('new')
  }, [stopStream])

  const initMeshPeerConnection = useCallback(
    (peerId: string, roomId: string) => {
      meshWebrtcManager.initPeer(peerId, groupLocalStreamRef.current, {
        onRemoteStream: (id, rStream) => {
          setParticipants((prev) =>
            prev.map((p) => (p.userId === id ? { ...p, stream: rStream } : p))
          )
        },
        onIceCandidate: (id, candidate) => {
          signalingService.sendSignal({
            type: 'ICE_CANDIDATE',
            senderId: user?.id || 'me',
            receiverId: id,
            roomId,
            payload: candidate.toJSON(),
          })
        },
        onIceStateChange: (id, state) => {
          setParticipants((prev) =>
            prev.map((p) => (p.userId === id ? { ...p, iceState: state } : p))
          )
        },
      })
    },
    [user?.id]
  )

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
          setCurrentCallType(msg.callType || 'AUDIO')
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
            // Người gọi tạo WebRTC Offer (hỗ trợ cả Video) và gửi sang đối phương
            const offer = await webrtcManager.createOffer(currentCallType === 'VIDEO')
            signalingService.sendSignal({
              type: 'CALL_OFFER',
              senderId: user?.id || 'me',
              receiverId: targetUser?.id || msg.senderId,
              roomId: currentRoomId || msg.roomId,
              callType: currentCallType,
              payload: offer,
            })
          } catch (err) {
            console.error('Lỗi khi tạo Offer:', err)
            cleanupCallState()
          }
          break
        }

        case 'CALL_OFFER': {
          if (callModeRef.current === 'GROUP') {
            const roomId = currentRoomId || msg.roomId || ''
            try {
              setParticipants((prev) => {
                if (prev.some((p) => p.userId === msg.senderId)) return prev
                return [
                  ...prev,
                  {
                    userId: msg.senderId,
                    displayName: msg.senderName || 'Thành viên',
                    stream: null,
                    isMuted: false,
                    isCameraOff: false,
                  },
                ]
              })
              initMeshPeerConnection(msg.senderId, roomId)
              const answer = await meshWebrtcManager.handleOffer(msg.senderId, msg.payload)
              if (answer) {
                signalingService.sendSignal({
                  type: 'CALL_ANSWER',
                  senderId: user?.id || 'me',
                  senderName: user?.displayName,
                  receiverId: msg.senderId,
                  roomId,
                  payload: answer,
                })
              }
            } catch (err) {
              console.error('Lỗi khi xử lý Mesh Offer:', err)
            }
            break
          }

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
          if (callModeRef.current === 'GROUP') {
            try {
              await meshWebrtcManager.handleAnswer(msg.senderId, msg.payload)
            } catch (err) {
              console.error('Lỗi khi nhận Mesh Answer:', err)
            }
            break
          }

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
            if (callModeRef.current === 'GROUP') {
              await meshWebrtcManager.addIceCandidate(msg.senderId, msg.payload)
            } else {
              await webrtcManager.addIceCandidate(msg.payload)
            }
          }
          break
        }

        case 'CAMERA_TOGGLE': {
          if (msg.payload && typeof msg.payload.enabled === 'boolean') {
            if (callModeRef.current === 'GROUP') {
              if (msg.senderId !== user?.id) {
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.userId === msg.senderId ? { ...p, isCameraOff: !msg.payload.enabled } : p
                  )
                )
              }
            } else {
              setIsRemoteCameraOff(!msg.payload.enabled)
            }
          }
          break
        }

        case 'MIC_TOGGLE': {
          if (msg.payload && typeof msg.payload.enabled === 'boolean') {
            if (callModeRef.current === 'GROUP') {
              if (msg.senderId !== user?.id) {
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.userId === msg.senderId ? { ...p, isMuted: !msg.payload.enabled } : p
                  )
                )
              }
            } else {
              setIsRemoteMuted(!msg.payload.enabled)
            }
          }
          break
        }

        case 'SCREEN_SHARE_START': {
          setActiveScreenSharerId(msg.senderId)
          if (callModeRef.current === 'GROUP') {
            setParticipants((prev) =>
              prev.map((p) => ({
                ...p,
                isScreenSharing: p.userId === msg.senderId,
              }))
            )
            // Nếu người khác trong nhóm bấm chia sẻ màn hình khi mình đang chia sẻ -> tự dừng phía mình
            if (msg.senderId !== user?.id && isScreenSharing) {
              const camTrack = stopScreenShare()
              await meshWebrtcManager.replaceTrackForAllPeers('video', camTrack, false)
            }
          } else if (msg.senderId !== user?.id) {
            setIsRemoteCameraOff(false)
          }
          break
        }

        case 'SCREEN_SHARE_STOP': {
          setActiveScreenSharerId((prev) => (prev === msg.senderId ? null : prev))
          if (callModeRef.current === 'GROUP') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.userId === msg.senderId ? { ...p, isScreenSharing: false } : p
              )
            )
          }
          break
        }

        case 'JOIN_ROOM': {
          if (callModeRef.current !== 'GROUP') break
          const roomId = msg.roomId || currentRoomId || ''
          const existingList: Array<{ userId: string; displayName?: string; avatarUrl?: string }> =
            msg.payload?.participants || []
          const existingSharer: string = msg.payload?.activeScreenSharerId || ''

          if (existingSharer) {
            setActiveScreenSharerId(existingSharer)
          }

          const initialParticipants: GroupParticipant[] = existingList
            .filter((p) => p.userId !== user?.id && p.userId !== user?.email)
            .map((p) => ({
              userId: p.userId,
              displayName: p.displayName || p.userId,
              avatarUrl: p.avatarUrl,
              stream: null,
              isMuted: false,
              isCameraOff: false,
              isScreenSharing: existingSharer === p.userId,
            }))

          setParticipants(initialParticipants)
          setCallStatus('CONNECTED')

          // Người mới vào chủ động tạo Offer gửi tới từng thành viên đã có mặt trong phòng
          for (const peer of initialParticipants) {
            try {
              initMeshPeerConnection(peer.userId, roomId)
              const offer = await meshWebrtcManager.createOffer(peer.userId)
              if (offer) {
                signalingService.sendSignal({
                  type: 'CALL_OFFER',
                  senderId: user?.id || 'me',
                  receiverId: peer.userId,
                  roomId,
                  callType: currentCallType,
                  payload: offer,
                })
              }
            } catch (err) {
              console.error(`Lỗi tạo Mesh Offer tới '${peer.userId}':`, err)
            }
          }
          break
        }

        case 'USER_JOINED': {
          if (callModeRef.current !== 'GROUP') break
          const joinedId = msg.payload?.joinedUserId || msg.senderId
          if (!joinedId || joinedId === user?.id || joinedId === user?.email) break

          const profile = msg.payload?.participant
          setParticipants((prev) => {
            if (prev.some((p) => p.userId === joinedId)) return prev
            return [
              ...prev,
              {
                userId: joinedId,
                displayName: profile?.displayName || msg.senderName || joinedId,
                avatarUrl: profile?.avatarUrl,
                stream: null,
                isMuted: false,
                isCameraOff: false,
              },
            ]
          })
          break
        }

        case 'USER_LEFT': {
          if (callModeRef.current !== 'GROUP') break
          const leftId = msg.payload?.leftUserId || msg.senderId
          if (!leftId) break
          meshWebrtcManager.removePeer(leftId)
          setParticipants((prev) => prev.filter((p) => p.userId !== leftId))
          setActiveScreenSharerId((prev) => (prev === leftId ? null : prev))
          break
        }

        case 'ROOM_FULL': {
          const reason = msg.payload?.reason || 'Phòng họp đã đạt giới hạn tối đa 5 thành viên.'
          setErrorMessage(reason)
          if (currentRoomId) {
            signalingService.unsubscribeFromRoom(currentRoomId)
          }
          cleanupCallState()
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
  }, [
    callStatus,
    user,
    targetUser,
    caller,
    currentRoomId,
    currentCallType,
    isScreenSharing,
    stopScreenShare,
    initMeshPeerConnection,
    cleanupCallState,
  ])

  // Tham gia cuộc gọi nhóm (Mesh WebRTC 3-5 người)
  const joinGroupCall = async (
    roomId: string,
    groupName: string,
    type: 'AUDIO' | 'VIDEO' = 'VIDEO'
  ) => {
    if (callStatus !== 'IDLE') return

    setErrorMessage(null)
    const stream = type === 'VIDEO' ? await getVideoStream() : await getAudioStream()
    if (!stream) return

    callModeRef.current = 'GROUP'
    groupLocalStreamRef.current = stream
    meshWebrtcManager.setLocalStream(stream)

    setCallMode('GROUP')
    setCurrentRoomId(roomId)
    setCurrentCallType(type)
    setTargetUser({ id: roomId, displayName: groupName })
    setParticipants([])
    setCallStatus('CONNECTING')

    signalingService.joinRoom(roomId, user?.id || 'me', user?.displayName || 'Người dùng')
  }

  // Khởi tạo cuộc gọi đi (Outgoing Call)
  const startCall = async (target: CallUserInfo, type: 'AUDIO' | 'VIDEO' = 'AUDIO') => {
    if (callStatus !== 'IDLE') return

    setErrorMessage(null)
    const stream = type === 'VIDEO' ? await getVideoStream() : await getAudioStream()
    if (!stream) return

    const roomId = `${user?.id}_${target.id}_${Date.now()}`
    setCurrentRoomId(roomId)
    setCurrentCallType(type)
    setTargetUser(target)
    setCallStatus('OUTGOING_RINGING')

    // Khởi tạo WebRTC Peer
    webrtcManager.init(
      (rStream) => {
        setRemoteStream(rStream)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = rStream
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
      },
      (state) => {
        setIceConnectionState(state)
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
      callType: type,
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
    const stream = currentCallType === 'VIDEO' ? await getVideoStream() : await getAudioStream()
    if (!stream) {
      rejectCall()
      return
    }

    // Khởi tạo WebRTC Peer
    webrtcManager.init(
      (rStream) => {
        setRemoteStream(rStream)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = rStream
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
      },
      (state) => {
        setIceConnectionState(state)
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

  // Kết thúc cuộc gọi đang đàm thoại (End Call / Leave Group)
  const endCall = () => {
    if (callModeRef.current === 'GROUP') {
      if (currentRoomId) {
        signalingService.leaveRoom(currentRoomId, user?.id || 'me')
      }
      callSounds.playEndTone()
      cleanupCallState()
      return
    }

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

  const toggleMute = () => {
    const isNowEnabled = toggleLocalMute()
    if (callModeRef.current === 'GROUP' && currentRoomId) {
      signalingService.sendRoomSignal({
        type: 'MIC_TOGGLE',
        senderId: user?.id || 'me',
        roomId: currentRoomId,
        payload: { enabled: isNowEnabled },
      })
      return
    }

    const otherUser = targetUser || caller
    if (otherUser && currentRoomId) {
      signalingService.sendSignal({
        type: 'MIC_TOGGLE',
        senderId: user?.id || 'me',
        receiverId: otherUser.id,
        roomId: currentRoomId,
        payload: { enabled: isNowEnabled },
      })
    }
  }

  const toggleVideo = () => {
    const isNowEnabled = toggleLocalVideo()
    if (callModeRef.current === 'GROUP' && currentRoomId) {
      signalingService.sendRoomSignal({
        type: 'CAMERA_TOGGLE',
        senderId: user?.id || 'me',
        roomId: currentRoomId,
        payload: { enabled: isNowEnabled },
      })
      return
    }

    const otherUser = targetUser || caller
    if (otherUser && currentRoomId) {
      signalingService.sendSignal({
        type: 'CAMERA_TOGGLE',
        senderId: user?.id || 'me',
        receiverId: otherUser.id,
        roomId: currentRoomId,
        payload: { enabled: isNowEnabled },
      })
    }
  }

  const handleStopScreenShare = useCallback(async () => {
    const camTrack = stopScreenShare()
    const myId = user?.id || 'me'
    setActiveScreenSharerId((prev) => (prev === myId ? null : prev))

    if (callModeRef.current === 'GROUP') {
      await meshWebrtcManager.replaceTrackForAllPeers('video', camTrack, false)
      if (currentRoomId) {
        signalingService.sendRoomSignal({
          type: 'SCREEN_SHARE_STOP',
          senderId: myId,
          roomId: currentRoomId,
        })
      }
    } else {
      await webrtcManager.replaceVideoTrack(camTrack)
      const otherUser = targetUser || caller
      if (otherUser && currentRoomId) {
        signalingService.sendSignal({
          type: 'SCREEN_SHARE_STOP',
          senderId: myId,
          receiverId: otherUser.id,
          roomId: currentRoomId,
        })
      }
    }
  }, [stopScreenShare, user?.id, currentRoomId, targetUser, caller])

  const toggleScreenShare = async () => {
    if (callStatus !== 'CONNECTED') return

    if (isScreenSharing) {
      await handleStopScreenShare()
      return
    }

    const screenTrack = await startScreenShare(() => {
      // Callback khi người dùng bấm nút "Stop sharing" của trình duyệt
      handleStopScreenShare()
    })

    if (!screenTrack) return

    const myId = user?.id || 'me'
    setActiveScreenSharerId(myId)

    if (callModeRef.current === 'GROUP') {
      await meshWebrtcManager.replaceTrackForAllPeers('video', screenTrack, true)
      if (currentRoomId) {
        signalingService.sendRoomSignal({
          type: 'SCREEN_SHARE_START',
          senderId: myId,
          senderName: user?.displayName,
          roomId: currentRoomId,
        })
      }
    } else {
      await webrtcManager.replaceVideoTrack(screenTrack)
      const otherUser = targetUser || caller
      if (otherUser && currentRoomId) {
        signalingService.sendSignal({
          type: 'SCREEN_SHARE_START',
          senderId: myId,
          senderName: user?.displayName,
          receiverId: otherUser.id,
          roomId: currentRoomId,
        })
        // Nếu cuộc gọi 1-1 ban đầu là Audio-only, đàm phán lại SDP để đẩy video track sang đối phương
        if (currentCallType === 'AUDIO') {
          try {
            const offer = await webrtcManager.createOffer(true)
            signalingService.sendSignal({
              type: 'CALL_OFFER',
              senderId: myId,
              receiverId: otherUser.id,
              roomId: currentRoomId,
              callType: 'VIDEO',
              payload: offer,
            })
          } catch (err) {
            console.warn('⚠️ Lỗi renegotiate khi chia sẻ màn hình trong Audio call:', err)
          }
        }
      }
    }
  }

  const handleSwitchCamera = async (deviceId: string): Promise<MediaStreamTrack | null> => {
    const track = await switchCameraDevice(deviceId)
    if (track && !isScreenSharing) {
      if (callModeRef.current === 'GROUP') {
        await meshWebrtcManager.replaceTrackForAllPeers('video', track, false)
      } else {
        await webrtcManager.replaceVideoTrack(track)
      }
    }
    return track
  }

  const handleSwitchMicrophone = async (deviceId: string): Promise<MediaStreamTrack | null> => {
    const track = await switchMicrophoneDevice(deviceId)
    if (track) {
      if (callModeRef.current === 'GROUP') {
        await meshWebrtcManager.replaceTrackForAllPeers('audio', track)
      } else {
        await webrtcManager.replaceAudioTrack(track)
      }
    }
    return track
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
        callMode,
        callType: currentCallType,
        currentRoomId,
        caller,
        targetUser,
        participants,
        duration,
        isMuted,
        isVideoEnabled,
        isScreenSharing,
        activeScreenSharerId,
        isRemoteCameraOff,
        isRemoteMuted,
        hasCameraDevice,
        localVideoStream,
        localScreenStream,
        remoteStream,
        iceConnectionState,
        isMinimized,
        errorMessage: errorMessage || permissionError,
        startCall,
        joinGroupCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        switchCameraDevice: handleSwitchCamera,
        switchMicrophoneDevice: handleSwitchMicrophone,
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

