import { useCallback, useEffect, useRef } from 'react'
import type { Conversation, Message, PresenceEvent, TypingEvent } from '../types/chat'

export function useChatWebSocket(
  conversationId: string | null,
  token: string | null,
  onNewMessage: (message: Message) => void,
  onTypingEvent?: (event: TypingEvent) => void,
  onPresenceEvent?: (event: PresenceEvent) => void,
  onConversationUpdate?: (conversation: Conversation) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const isConnectedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!token) return

    let socket: WebSocket | null = null
    let reconnectTimeout: any = null
    let isUnmounted = false

    function connect() {
      if (isUnmounted) return
      try {
        const wsUrl = `ws://localhost:8080/ws`
        socket = new WebSocket(wsUrl)
        wsRef.current = socket

        socket.onopen = () => {
          if (isUnmounted) {
            socket?.close()
            return
          }
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
          if (isUnmounted) return
          const raw = event.data as string

          // Khi nhận được CONNECTED từ Server -> Subscribe vào các kênh
          if (raw.startsWith('CONNECTED')) {
            isConnectedRef.current = true

            // 1. Luôn subscribe kênh Presence toàn cục & cập nhật nhóm mới
            const subPresenceFrame = [
              'SUBSCRIBE',
              'id:sub-presence',
              'destination:/topic/presence',
              '\n',
            ].join('\n') + '\0'
            socket?.send(subPresenceFrame)

            const subConversationsFrame = [
              'SUBSCRIBE',
              'id:sub-user-conversations',
              'destination:/user/queue/conversations',
              '\n',
            ].join('\n') + '\0'
            socket?.send(subConversationsFrame)

            // 2. Nếu có conversationId -> subscribe kênh chat và kênh typing
            if (conversationId) {
              const subChatFrame = [
                'SUBSCRIBE',
                `id:sub-${conversationId}`,
                `destination:/topic/chat/${conversationId}`,
                '\n',
              ].join('\n') + '\0'
              socket?.send(subChatFrame)

              const subTypingFrame = [
                'SUBSCRIBE',
                `id:sub-typing-${conversationId}`,
                `destination:/topic/chat/${conversationId}/typing`,
                '\n',
              ].join('\n') + '\0'
              socket?.send(subTypingFrame)
            }
            return
          }

          // Khi nhận được bản tin MESSAGE từ STOMP
          if (raw.startsWith('MESSAGE')) {
            const doubleCrlf = raw.indexOf('\r\n\r\n')
            const doubleLf = raw.indexOf('\n\n')
            const bodyStart = doubleCrlf !== -1 ? doubleCrlf + 4 : (doubleLf !== -1 ? doubleLf + 2 : -1)
            const headerEnd = doubleCrlf !== -1 ? doubleCrlf : doubleLf

            if (bodyStart !== -1 && headerEnd !== -1) {
              const headersPart = raw.substring(0, headerEnd)
              const body = raw.substring(bodyStart).replace(/\0$/, '').trim()

              try {
                const parsed = JSON.parse(body)
                if (headersPart.includes('/topic/presence')) {
                  if (onPresenceEvent && parsed && parsed.userId) {
                    onPresenceEvent(parsed as PresenceEvent)
                  }
                } else if (headersPart.includes('/queue/conversations')) {
                  if (onConversationUpdate && parsed && parsed.id) {
                    onConversationUpdate(parsed as Conversation)
                  }
                } else if (headersPart.includes('/typing')) {
                  if (onTypingEvent && parsed && parsed.conversationId) {
                    onTypingEvent(parsed as TypingEvent)
                  }
                } else {
                  if (parsed && parsed.id) {
                    onNewMessage(parsed as Message)
                  }
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
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(() => {
              if (token && !isUnmounted) connect()
            }, 4000)
          }
        }
      } catch {
        // Fallback
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (socket) {
        if (isConnectedRef.current && socket.readyState === WebSocket.OPEN) {
          if (conversationId) {
            const unsubChat = ['UNSUBSCRIBE', `id:sub-${conversationId}`, '\n'].join('\n') + '\0'
            const unsubTyping = ['UNSUBSCRIBE', `id:sub-typing-${conversationId}`, '\n'].join('\n') + '\0'
            socket.send(unsubChat)
            socket.send(unsubTyping)
          }
          const unsubPresence = ['UNSUBSCRIBE', 'id:sub-presence', '\n'].join('\n') + '\0'
          const unsubConversations = ['UNSUBSCRIBE', 'id:sub-user-conversations', '\n'].join('\n') + '\0'
          socket.send(unsubPresence)
          socket.send(unsubConversations)
        }
        socket.close()
      }
      wsRef.current = null
      isConnectedRef.current = false
    }
  }, [conversationId, token, onNewMessage, onTypingEvent, onPresenceEvent, onConversationUpdate])

  const sendTypingSignal = useCallback(
    (typing: boolean) => {
      if (!conversationId || !wsRef.current || !isConnectedRef.current) return
      if (wsRef.current.readyState !== WebSocket.OPEN) return

      const payload = JSON.stringify({
        conversationId,
        typing,
      })

      const sendFrame = [
        'SEND',
        'destination:/app/chat.typing',
        'content-type:application/json',
        '\n',
        payload,
      ].join('\n') + '\0'

      wsRef.current.send(sendFrame)
    },
    [conversationId]
  )

  return { sendTypingSignal }
}
