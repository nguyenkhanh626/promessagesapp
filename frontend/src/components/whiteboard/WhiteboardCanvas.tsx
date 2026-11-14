import { useCallback, useEffect, useRef, type PointerEvent } from 'react'

export interface CanvasPoint {
  x: number
  y: number
}

export interface FreehandStroke {
  points: CanvasPoint[]
  color: string
  width: number
}

interface WhiteboardCanvasProps {
  color: string
  strokeWidth: number
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: FreehandStroke
) {
  const { points } = stroke
  if (points.length === 0) return

  context.beginPath()
  context.strokeStyle = stroke.color
  context.fillStyle = stroke.color
  context.lineWidth = stroke.width
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.moveTo(points[0].x, points[0].y)

  if (points.length === 1) {
    context.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2)
    context.fill()
    return
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const midpointX = (current.x + next.x) / 2
    const midpointY = (current.y + next.y) / 2
    context.quadraticCurveTo(current.x, current.y, midpointX, midpointY)
  }

  const lastPoint = points[points.length - 1]
  context.lineTo(lastPoint.x, lastPoint.y)
  context.stroke()
}

export function WhiteboardCanvas({ color, strokeWidth }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<FreehandStroke[]>([])
  const activeStrokeRef = useRef<FreehandStroke | null>(null)

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
    strokesRef.current.forEach((stroke) => drawStroke(context, stroke))
    if (activeStrokeRef.current) drawStroke(context, activeStrokeRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(redraw)
    observer.observe(canvas)
    redraw()
    return () => observer.disconnect()
  }, [redraw])

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    activeStrokeRef.current = {
      points: [getCanvasPoint(event)],
      color,
      width: strokeWidth,
    }
    redraw()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const activeStroke = activeStrokeRef.current
    if (!activeStroke) return
    activeStroke.points.push(getCanvasPoint(event))
    redraw()
  }

  const finishStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    const activeStroke = activeStrokeRef.current
    if (!activeStroke) return

    activeStroke.points.push(getCanvasPoint(event))
    strokesRef.current = [...strokesRef.current, activeStroke]
    activeStrokeRef.current = null
    redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label="Bảng vẽ tự do"
      className="block h-full w-full touch-none cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    />
  )
}
