export type WhiteboardShapeType =
  | 'FREEHAND'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'LINE'
  | 'ARROW'
  | 'TEXT'

export interface WhiteboardPoint {
  x: number
  y: number
}

export interface WhiteboardShape {
  id: string
  type: WhiteboardShapeType
  points: WhiteboardPoint[]
  strokeColor: string
  strokeWidth: number
  authorId: string
  text?: string
  fontSize?: number
}

export interface WhiteboardSession {
  id: string
  conversationId: string
  title: string
  shapes: WhiteboardShape[]
  createdAt: string
  updatedAt: string
}

export type WhiteboardEvent =
  | { action: 'DRAW'; shape: WhiteboardShape; shapeId?: never; point?: never; eraserSize?: never }
  | { action: 'ERASE'; point: WhiteboardPoint; eraserSize: number; shape?: never; shapeId?: never }
  | { action: 'CLEAR'; shape?: never; shapeId?: never; point?: never; eraserSize?: never }
  | { action: 'UNDO'; shapeId: string; shape?: never; point?: never; eraserSize?: never }
  | { action: 'MOVE'; shapeId: string; point: WhiteboardPoint; shape?: never; eraserSize?: never }
