import { useCallback, useEffect, useRef, useState } from 'react'
import type { WhiteboardCursor, WhiteboardEvent, WhiteboardPoint } from '../types/whiteboard'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

function frame(command: string, headers: Record<string, string> = {}, body = '') {
  return `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n${body}\0`
}

function readBody(raw: string) {
  const bodyStart = raw.indexOf('\n\n')
  return bodyStart < 0 ? null : raw.slice(bodyStart + 2).replace(/\0$/, '')
}

export function useWhiteboardSync(
  sessionId: string | null,
  token: string | null,
  userId: string | null,
  onRemoteEvent: (event: WhiteboardEvent) => void
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [cursors, setCursors] = useState<WhiteboardCursor[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const callbackRef = useRef(onRemoteEvent)
  const sendEventTimerRef = useRef<number | null>(null)
  const sendCursorTimerRef = useRef<number | null>(null)
  const pendingEventRef = useRef<WhiteboardEvent | null>(null)
  const pendingCursorRef = useRef<WhiteboardPoint | null>(null)

  useEffect(() => {
    callbackRef.current = onRemoteEvent
  }, [onRemoteEvent])

  const publish = useCallback((destination: string, payload: unknown) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(frame('SEND', {
      destination,
      'content-type': 'application/json',
    }, JSON.stringify(payload)))
  }, [])

  useEffect(() => {
    if (!sessionId || !token) return

    let active = true
    let socket: WebSocket | null = null
    let retryTimer: number | null = null
    let reconnectDelay = 1000
    const shapeSubscriptionId = `whiteboard-shapes-${sessionId}`
    const cursorSubscriptionId = `whiteboard-cursors-${sessionId}`

    const connect = () => {
      if (!active) return
      setConnectionState('connecting')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.hostname}:8080/ws`)
      socketRef.current = socket

      socket.onopen = () => {
        socket?.send(frame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '0,0',
          Authorization: `Bearer ${token}`,
        }))
      }

      socket.onmessage = ({ data }) => {
        const raw = String(data)
        if (raw.startsWith('CONNECTED')) {
          reconnectDelay = 1000
          setConnectionState('connected')
          socket?.send(frame('SUBSCRIBE', {
            id: shapeSubscriptionId,
            destination: `/topic/whiteboard/${sessionId}`,
          }))
          socket?.send(frame('SUBSCRIBE', {
            id: cursorSubscriptionId,
            destination: `/topic/whiteboard/${sessionId}/cursors`,
          }))
        } else if (raw.startsWith('MESSAGE')) {
          const body = readBody(raw)
          if (body === null) return
          try {
            const subscription = raw.match(/(?:^|\n)subscription:([^\n]+)/)?.[1]
            const payload = JSON.parse(body)
            if (subscription === cursorSubscriptionId) {
              const cursor = payload as WhiteboardCursor
              if (!cursor.userId || cursor.userId === userId || !cursor.point) return
              setCursors((current) => [
                ...current.filter((item) => item.userId !== cursor.userId),
                { ...cursor, updatedAt: Date.now() },
              ])
            } else if (payload && typeof payload.action === 'string') {
              callbackRef.current(payload as WhiteboardEvent)
            }
          } catch {
            setConnectionState('error')
          }
        } else if (raw.startsWith('ERROR')) {
          setConnectionState('error')
        }
      }

      socket.onerror = () => setConnectionState('error')
      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null
        setConnectionState('disconnected')
        if (!active) return
        retryTimer = window.setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, 15000)
      }
    }

    connect()
    const cursorExpiryTimer = window.setInterval(() => {
      const expiry = Date.now() - 3000
      setCursors((current) => current.filter(
        (cursor) => cursor.updatedAt !== undefined && cursor.updatedAt > expiry
      ))
    }, 1000)

    return () => {
      active = false
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      window.clearInterval(cursorExpiryTimer)
      if (sendEventTimerRef.current !== null) window.clearTimeout(sendEventTimerRef.current)
      if (sendCursorTimerRef.current !== null) window.clearTimeout(sendCursorTimerRef.current)
      sendEventTimerRef.current = null
      sendCursorTimerRef.current = null
      pendingEventRef.current = null
      pendingCursorRef.current = null
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(frame('UNSUBSCRIBE', { id: shapeSubscriptionId }))
        socket.send(frame('UNSUBSCRIBE', { id: cursorSubscriptionId }))
        socket.send(frame('DISCONNECT'))
      }
      socket?.close()
      if (socketRef.current === socket) socketRef.current = null
      setCursors([])
    }
  }, [sessionId, token, userId])

  const sendEvent = useCallback((event: WhiteboardEvent) => {
    if (event.action === 'CLEAR') {
      publish(`/app/whiteboard/${sessionId}/clear`, {})
      return
    }
    if (event.action !== 'DRAW' && event.action !== 'MOVE' && event.action !== 'ERASE') {
      publish(`/app/whiteboard/${sessionId}/draw`, event)
      return
    }
    pendingEventRef.current = event
    if (sendEventTimerRef.current !== null) return
    sendEventTimerRef.current = window.setTimeout(() => {
      sendEventTimerRef.current = null
      const pending = pendingEventRef.current
      pendingEventRef.current = null
      if (pending) publish(`/app/whiteboard/${sessionId}/draw`, pending)
    }, 35)
  }, [publish, sessionId])

  const sendCursor = useCallback((point: WhiteboardPoint) => {
    pendingCursorRef.current = point
    if (sendCursorTimerRef.current !== null) return
    sendCursorTimerRef.current = window.setTimeout(() => {
      sendCursorTimerRef.current = null
      const pointToSend = pendingCursorRef.current
      pendingCursorRef.current = null
      if (pointToSend) publish(`/app/whiteboard/${sessionId}/cursor`, { point: pointToSend })
    }, 40)
  }, [publish, sessionId])

  return {
    connectionState: sessionId && token ? connectionState : 'disconnected',
    cursors,
    sendEvent,
    sendCursor,
  }
}
