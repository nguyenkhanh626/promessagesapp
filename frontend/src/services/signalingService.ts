import type { SignalMessage } from '../types/calling'

type SignalListener = (message: SignalMessage) => void

class SignalingService {
  private socket: WebSocket | null = null
  private isConnected = false
  private token: string | null = null
  private listeners: Set<SignalListener> = new Set()
  private reconnectTimer: any = null
  private queuedFrames: Array<{ destination: string; signal: SignalMessage }> = []
  private subscribedRoomId: string | null = null

  public connect(token: string) {
    if (this.socket && this.token === token && this.isConnected) {
      return
    }

    this.token = token
    this.cleanupSocket()

    try {
      const wsUrl = `ws://localhost:8080/ws`
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        const connectFrame = `CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\nAuthorization:Bearer ${this.token}\n\n\0`
        this.socket?.send(connectFrame)
      }

      this.socket.onmessage = (event) => {
        const raw = event.data as string

        if (raw.startsWith('CONNECTED')) {
          this.isConnected = true
          console.log('✅ [Signaling WebSocket] Kết nối STOMP thành công!')

          // Đăng ký nhận tín hiệu cá nhân tại hàng đợi /user/queue/signals
          const subFrame = `SUBSCRIBE\nid:sub-user-signals\ndestination:/user/queue/signals\n\n\0`
          this.socket?.send(subFrame)

          // Nếu đang trong phòng họp nhóm, tự động re-subscribe kênh phòng
          if (this.subscribedRoomId) {
            const roomSubFrame = `SUBSCRIBE\nid:sub-room-${this.subscribedRoomId}\ndestination:/topic/call/room/${this.subscribedRoomId}\n\n\0`
            this.socket?.send(roomSubFrame)
          }

          // Gửi các bản tin còn lưu trong hàng đợi tạm
          while (this.queuedFrames.length > 0) {
            const pending = this.queuedFrames.shift()
            if (pending) this.sendToDestination(pending.destination, pending.signal)
          }
          return
        }

        if (raw.startsWith('MESSAGE')) {
          const doubleCrlf = raw.indexOf('\r\n\r\n')
          const doubleLf = raw.indexOf('\n\n')
          const bodyStart = doubleCrlf !== -1 ? doubleCrlf + 4 : (doubleLf !== -1 ? doubleLf + 2 : -1)

          if (bodyStart !== -1) {
            const body = raw.substring(bodyStart).replace(/\0$/, '').trim()
            try {
              const signal = JSON.parse(body) as SignalMessage
              if (signal && signal.type) {
                console.log('🔔 [Signaling WebSocket] Nhận Signal:', signal.type, signal)
                this.notifyListeners(signal)
              }
            } catch (err) {
              console.error('Lỗi phân tích bản tin Signal:', err, 'Body:', body)
            }
          }
        }
      }

      this.socket.onerror = (e) => {
        console.warn('⚠️ Lỗi kết nối Signaling WebSocket:', e)
        this.isConnected = false
      }

      this.socket.onclose = (e) => {
        console.log('🔌 Signaling WebSocket đóng kết nối (code:', e.code, e.reason, ')')
        this.isConnected = false
        if (this.token) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
          this.reconnectTimer = setTimeout(() => {
            if (this.token) this.connect(this.token)
          }, 3000)
        }
      }
    } catch (e) {
      console.error('Không thể tạo kết nối WebSocket:', e)
    }
  }

  public disconnect() {
    this.token = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.cleanupSocket()
  }

  public sendSignal(signal: SignalMessage) {
    this.sendToDestination('/app/call/signal', signal)
  }

  public sendRoomSignal(signal: SignalMessage) {
    this.sendToDestination('/app/call/room-signal', signal)
  }

  public subscribeToRoom(roomId: string) {
    if (this.subscribedRoomId && this.subscribedRoomId !== roomId) {
      this.unsubscribeFromRoom(this.subscribedRoomId)
    }
    this.subscribedRoomId = roomId

    if (this.socket && this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      const roomSubFrame = `SUBSCRIBE\nid:sub-room-${roomId}\ndestination:/topic/call/room/${roomId}\n\n\0`
      this.socket.send(roomSubFrame)
      console.log('📡 [Signaling WebSocket] Đã subscribe phòng họp:', roomId)
    }
  }

  public unsubscribeFromRoom(roomId: string) {
    if (this.subscribedRoomId === roomId) {
      this.subscribedRoomId = null
    }
    if (this.socket && this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      const unsubFrame = `UNSUBSCRIBE\nid:sub-room-${roomId}\n\n\0`
      this.socket.send(unsubFrame)
      console.log('🔌 [Signaling WebSocket] Đã unsubscribe phòng họp:', roomId)
    }
  }

  public joinRoom(roomId: string, senderId: string, senderName?: string) {
    this.subscribeToRoom(roomId)
    this.sendToDestination('/app/call/join', {
      type: 'JOIN_ROOM',
      senderId,
      senderName,
      roomId,
    })
  }

  public leaveRoom(roomId: string, senderId: string) {
    this.sendToDestination('/app/call/leave', {
      type: 'LEAVE_ROOM',
      senderId,
      roomId,
    })
    this.unsubscribeFromRoom(roomId)
  }

  private sendToDestination(destination: string, signal: SignalMessage) {
    if (!this.socket || !this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket chưa sẵn sàng, lưu tạm signal vào hàng đợi:', signal.type)
      this.queuedFrames.push({ destination, signal })
      return
    }

    const body = JSON.stringify(signal)
    const sendFrame = `SEND\ndestination:${destination}\ncontent-type:application/json\n\n${body}\0`

    console.log('🚀 [Signaling WebSocket] Gửi Signal:', signal.type, 'tới', destination, signal.receiverId || signal.roomId || '')
    this.socket.send(sendFrame)
  }

  public subscribe(listener: SignalListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(signal: SignalMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(signal)
      } catch (err) {
        console.error('Lỗi khi thực thi signal listener:', err)
      }
    })
  }

  private cleanupSocket() {
    if (this.socket) {
      try {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
          const unsubFrame = `UNSUBSCRIBE\nid:sub-user-signals\n\n\0`
          this.socket.send(unsubFrame)
        }
        this.socket.close()
      } catch {}
      this.socket = null
    }
    this.isConnected = false
  }
}

export const signalingService = new SignalingService()
