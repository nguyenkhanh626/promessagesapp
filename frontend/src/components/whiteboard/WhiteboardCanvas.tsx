import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'
import type { WhiteboardEvent, WhiteboardPoint, WhiteboardShape } from '../../types/whiteboard'

export type WhiteboardTool = 'PENCIL' | 'ERASER' | 'RECTANGLE' | 'ELLIPSE' | 'LINE' | 'ARROW' | 'TEXT'

interface WhiteboardCanvasProps {
  color: string
  strokeWidth: number
  fontSize: number
  tool: WhiteboardTool
  shapes: WhiteboardShape[]
  onLocalEvent: (event: WhiteboardEvent) => void
  authorId: string
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void
}

function drawShape(context: CanvasRenderingContext2D, shape: WhiteboardShape) {
  const points = shape.points
  if (shape.type === 'TEXT') {
    if (points[0] && shape.text) {
      context.fillStyle = shape.strokeColor
      context.font = `${shape.fontSize || 20}px sans-serif`
      context.textBaseline = 'top'
      shape.text.split('\n').forEach((line, index) => {
        context.fillText(line, points[0].x, points[0].y + index * (shape.fontSize || 20) * 1.25)
      })
    }
    return
  }
  if (!points.length) return

  context.beginPath()
  context.strokeStyle = shape.strokeColor
  context.fillStyle = shape.strokeColor
  context.lineWidth = shape.strokeWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.moveTo(points[0].x, points[0].y)

  if (shape.type === 'FREEHAND') {
    if (points.length === 1) {
      context.arc(points[0].x, points[0].y, shape.strokeWidth / 2, 0, Math.PI * 2)
      context.fill()
      return
    }
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index]
      const next = points[index + 1]
      context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
    }
    const lastPoint = points[points.length - 1]
    context.lineTo(lastPoint.x, lastPoint.y)
  } else if (shape.type === 'RECTANGLE' || shape.type === 'CIRCLE') {
    const start = points[0]
    const end = points[points.length - 1]
    const left = Math.min(start.x, end.x)
    const top = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    if (shape.type === 'RECTANGLE') context.rect(left, top, width, height)
    else context.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
  } else {
    const start = points[0]
    const end = points[points.length - 1]
    context.lineTo(end.x, end.y)
    if (shape.type === 'ARROW') {
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const headLength = Math.max(10, shape.strokeWidth * 3)
      context.moveTo(end.x, end.y)
      context.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6))
      context.moveTo(end.x, end.y)
      context.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6))
    }
  }
  context.stroke()
}

function pointFromEvent(event: MouseEvent<HTMLCanvasElement>): WhiteboardPoint {
  const bounds = event.currentTarget.getBoundingClientRect()
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}

function shapeTypeForTool(tool: WhiteboardTool): WhiteboardShape['type'] {
  switch (tool) {
    case 'PENCIL': return 'FREEHAND'
    case 'RECTANGLE': return 'RECTANGLE'
    case 'ELLIPSE': return 'CIRCLE'
    case 'LINE': return 'LINE'
    case 'ARROW': return 'ARROW'
    case 'ERASER':
    case 'TEXT':
      throw new Error(`Tool ${tool} does not create a drag shape`)
  }
}

export function WhiteboardCanvas({
  color, strokeWidth, fontSize, tool, shapes, onLocalEvent, authorId,
  onCanvasReady,
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<WhiteboardShape | null>(null)
  const cursorRef = useRef<{ point: WhiteboardPoint; size: number } | null>(null)
  const movingTextRef = useRef<string | null>(null)
  const textHitOnPointerDownRef = useRef(false)
  const eraseSize = Math.max(18, strokeWidth * 3)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const bounds = canvas.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    const pixelWidth = Math.round(bounds.width * pixelRatio)
    const pixelHeight = Math.round(bounds.height * pixelRatio)
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, bounds.width, bounds.height)
    shapes.forEach((shape) => drawShape(context, shape))
    if (previewRef.current) drawShape(context, previewRef.current)
    if (tool === 'ERASER' && cursorRef.current) {
      context.beginPath()
      context.arc(cursorRef.current.point.x, cursorRef.current.point.y, cursorRef.current.size / 2, 0, Math.PI * 2)
      context.strokeStyle = '#5b5fc7'
      context.lineWidth = 1.5
      context.stroke()
    }
  }, [shapes, tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady(canvas)
    const observer = new ResizeObserver(redraw)
    observer.observe(canvas)
    redraw()
    return () => {
      observer.disconnect()
      onCanvasReady(null)
    }
  }, [onCanvasReady, redraw])

  const emitErase = (point: WhiteboardPoint) => {
    onLocalEvent({ action: 'ERASE', point, eraserSize: eraseSize })
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const point = pointFromEvent(event)
    if (tool === 'TEXT') {
      textHitOnPointerDownRef.current = false
      const context = event.currentTarget.getContext('2d')
      const textShape = [...shapes].reverse().find((shape) => {
        if (shape.type !== 'TEXT' || !shape.text || !context || !shape.points[0]) return false
        const fontSize = shape.fontSize || 20
        context.font = `${fontSize}px sans-serif`
        const lines = shape.text.split('\n')
        const width = Math.max(...lines.map((line) => context.measureText(line).width))
        const height = lines.length * fontSize * 1.25
        return point.x >= shape.points[0].x - 4
          && point.x <= shape.points[0].x + width + 4
          && point.y >= shape.points[0].y - 4
          && point.y <= shape.points[0].y + height + 4
      })
      if (textShape) {
        textHitOnPointerDownRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        movingTextRef.current = textShape.id
      }
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'ERASER') {
      cursorRef.current = { point, size: eraseSize }
      emitErase(point)
      redraw()
      return
    }
    previewRef.current = {
      id: crypto.randomUUID(),
      type: shapeTypeForTool(tool),
      points: [point],
      strokeColor: color,
      strokeWidth,
      authorId,
      fontSize,
    }
    redraw()
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event)
    if (movingTextRef.current) {
      onLocalEvent({ action: 'MOVE', shapeId: movingTextRef.current, point })
      return
    }
    if (tool === 'ERASER') {
      cursorRef.current = { point, size: eraseSize }
      if (event.buttons !== 0) emitErase(point)
      redraw()
      return
    }
    if (!previewRef.current) return
    if (tool === 'PENCIL') previewRef.current.points.push(point)
    else previewRef.current.points = [previewRef.current.points[0], point]
    redraw()
  }

  const finishStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (movingTextRef.current) {
      onLocalEvent({
        action: 'MOVE',
        shapeId: movingTextRef.current,
        point: pointFromEvent(event),
      })
      movingTextRef.current = null
      return
    }
    const shape = previewRef.current
    if (!shape) return
    const point = pointFromEvent(event)
    if (tool === 'PENCIL') shape.points.push(point)
    else shape.points = [shape.points[0], point]
    previewRef.current = null
    onLocalEvent({ action: 'DRAW', shape })
    redraw()
  }

  const handleDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'TEXT') return
    if (textHitOnPointerDownRef.current) {
      textHitOnPointerDownRef.current = false
      return
    }
    const point = pointFromEvent(event)
    const text = window.prompt('Nhập nội dung văn bản')
    if (!text?.trim()) return
    onLocalEvent({
      action: 'DRAW',
      shape: {
        id: crypto.randomUUID(),
        type: 'TEXT',
        points: [point],
        strokeColor: color,
        strokeWidth,
        authorId,
        text: text.trim(),
        fontSize,
      },
    })
  }

  const cancelStroke = () => {
    previewRef.current = null
    movingTextRef.current = null
    redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Bảng vẽ cộng tác"
      className={`block h-full w-full touch-none ${
        tool === 'TEXT' ? 'cursor-text' : tool === 'ERASER' ? 'cursor-none' : 'cursor-crosshair'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={cancelStroke}
      onDoubleClick={handleDoubleClick}
    />
  )
}
