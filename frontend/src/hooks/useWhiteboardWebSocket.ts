import { useCallback, useEffect, useRef, useState } from 'react'
import type { WhiteboardEvent } from '../types/whiteboard'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export function useWhiteboardWebSocket(
  sessionId: string | null,
  token: string | null,
  onRemoteEvent: (event: WhiteboardEvent) => void
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const callbackRef = useRef(onRemoteEvent)
  const retryTimerRef = useRef<number | null>(null)
  const eraseTimerRef = useRef<number | null>(null)
  const pendingEraseRef = useRef<WhiteboardEvent | null>(null)
  const connectionRef = useRef<ConnectionState>('disconnected')

  useEffect(() => {
    callbackRef.current = onRemoteEvent
  }, [onRemoteEvent])

  useEffect(() => {
    if (!sessionId || !token) return

    let active = true
    let socket: WebSocket | null = null
    let reconnectDelay = 1000
    let subscriptionId = `whiteboard-${sessionId}`

    const updateState = (state: ConnectionState) => {
      connectionRef.current = state
      if (active) setConnectionState(state)
    }

    const connect = () => {
      if (!active) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//localhost:8080/ws`)
      socketRef.current = socket

      socket.onopen = () => {
        updateState('connecting')
        const frame = [
          'CONNECT',
          'accept-version:1.2',
          'heart-beat:10000,10000',
          `Authorization:Bearer ${token}`,
          '',
          '',
        ].join('\n') + '\0'
        socket?.send(frame)
      }

      socket.onmessage = (message) => {
        const raw = String(message.data)
        if (raw.startsWith('CONNECTED')) {
          reconnectDelay = 1000
          updateState('connected')
          socket?.send([
            'SUBSCRIBE',
            `id:${subscriptionId}`,
            `destination:/topic/whiteboard/${sessionId}`,
            '',
            '',
          ].join('\n') + '\0')
          return
        }
        if (raw.startsWith('MESSAGE')) {
          const bodyStart = raw.indexOf('\n\n')
          if (bodyStart < 0) return
          try {
            const event = JSON.parse(raw.slice(bodyStart + 2).replace(/\0$/, '')) as WhiteboardEvent
            if (event && typeof event.action === 'string') callbackRef.current(event)
          } catch {
            updateState('error')
          }
        }
        if (raw.startsWith('ERROR')) updateState('error')
      }

      socket.onerror = () => updateState('error')
      socket.onclose = () => {
        updateState('disconnected')
        if (!active) return
        retryTimerRef.current = window.setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, 15000)
      }
    }

    connect()
    return () => {
      active = false
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
      if (eraseTimerRef.current !== null) window.clearTimeout(eraseTimerRef.current)
      if (socket?.readyState === WebSocket.OPEN && connectionRef.current === 'connected') {
        socket.send(`UNSUBSCRIBE\nid:${subscriptionId}\n\n\0`)
      }
      socket?.close()
      socketRef.current = null
      updateState('disconnected')
    }
  }, [sessionId, token])

  const sendEvent = useCallback((event: WhiteboardEvent) => {
    const send = (payload: WhiteboardEvent) => {
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN || connectionRef.current !== 'connected') return
      socket.send([
        'SEND',
        `destination:/app/whiteboard/${sessionId}/draw`,
        'content-type:application/json',
        '',
        JSON.stringify(payload),
      ].join('\n') + '\0')
    }

    if (event.action !== 'ERASE' && event.action !== 'MOVE') {
      send(event)
      return
    }
    pendingEraseRef.current = event
    if (eraseTimerRef.current !== null) return
    eraseTimerRef.current = window.setTimeout(() => {
      eraseTimerRef.current = null
      const pendingEvent = pendingEraseRef.current
      pendingEraseRef.current = null
      if (pendingEvent) send(pendingEvent)
    }, 40)
  }, [sessionId])

  return { connectionState, sendEvent }
}
