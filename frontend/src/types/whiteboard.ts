export type WhiteboardShapeType =
  | 'FREEHAND'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'LINE'
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
}
