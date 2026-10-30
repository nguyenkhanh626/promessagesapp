import { useEffect, useRef } from 'react'
import type { Message } from '../types/chat'

export function useChatWebSocket(
  conversationId: string | null,
  token: string | null,
  onNewMessage: (message: Message) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const isConnectedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!conversationId || !token) return

    let socket: WebSocket | null = null
    let reconnectTimeout: any = null

    function connect() {
      try {
        // Kết nối WebSocket thuần tới endpoint /ws của Spring Boot
        const wsUrl = `ws://localhost:8080/ws`
        socket = new WebSocket(wsUrl)
        wsRef.current = socket

        socket.onopen = () => {
          // Gửi frame STOMP CONNECT kèm Bearer Token
          const connectFrame = [
            'CONNECT',
            'accept-version:1.2,1.1,1.0',
            'heart-beat:10000,10000',
            `Authorization:Bearer ${token}`,
            '\n',
          ].join('\n') + '\0'

          socket?.send(connectFrame)
        }

        socket.onmessage = (event) => {
          const raw = event.data as string

          // Nếu nhận được CONNECTED từ Server -> Subscribe topic
          if (raw.startsWith('CONNECTED')) {
            isConnectedRef.current = true
            const subFrame = [
              'SUBSCRIBE',
              `id:sub-${conversationId}`,
              `destination:/topic/chat/${conversationId}`,
              '\n',
            ].join('\n') + '\0'
            socket?.send(subFrame)
            return
          }

          // Nếu nhận được bản tin MESSAGE
          if (raw.startsWith('MESSAGE')) {
            const bodyStart = raw.indexOf('\n\n')
            if (bodyStart !== -1) {
              const body = raw.substring(bodyStart + 2).replace(/\0$/, '')
              try {
                const messageObj = JSON.parse(body) as Message
                if (messageObj && messageObj.id) {
                  onNewMessage(messageObj)
                }
              } catch {
                // Ignore parse error
              }
            }
          }
        }

        socket.onerror = () => {
          isConnectedRef.current = false
        }

        socket.onclose = () => {
          isConnectedRef.current = false
          // Tự động kết nối lại sau 4s nếu còn cuộc trò chuyện
          reconnectTimeout = setTimeout(() => {
            if (conversationId) connect()
          }, 4000)
        }
      } catch {
        // Fallback
      }
    }

    connect()

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (socket) {
        if (isConnectedRef.current && socket.readyState === WebSocket.OPEN) {
          const unsubFrame = [
            'UNSUBSCRIBE',
            `id:sub-${conversationId}`,
            '\n',
          ].join('\n') + '\0'
          socket.send(unsubFrame)
        }
        socket.close()
      }
      wsRef.current = null
      isConnectedRef.current = false
    }
  }, [conversationId, token])
}

