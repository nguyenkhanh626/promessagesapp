import type { SignalMessage } from '../types/calling'

type SignalListener = (message: SignalMessage) => void

class SignalingService {
  private socket: WebSocket | null = null
  private isConnected = false
  private token: string | null = null
  private listeners: Set<SignalListener> = new Set()
  private reconnectTimer: any = null
  private queuedMessages: SignalMessage[] = []

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

          // Gửi các bản tin còn lưu trong hàng đợi tạm
          while (this.queuedMessages.length > 0) {
            const pending = this.queuedMessages.shift()
            if (pending) this.sendSignal(pending)
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
    if (!this.socket || !this.isConnected || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket chưa sẵn sàng, lưu tạm signal vào hàng đợi:', signal.type)
      this.queuedMessages.push(signal)
      return
    }

    const body = JSON.stringify(signal)
    // Định dạng frame SEND chuẩn STOMP 1.2: header kết thúc bằng \n\n, theo sau là body và kết thúc bằng null octet (\0)
    const sendFrame = `SEND\ndestination:/app/call/signal\ncontent-type:application/json\n\n${body}\0`

    console.log('🚀 [Signaling WebSocket] Gửi Signal:', signal.type, 'tới', signal.receiverId)
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
