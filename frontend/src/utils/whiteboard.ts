import type { WhiteboardEvent, WhiteboardPoint, WhiteboardShape } from '../types/whiteboard'

function downloadUrl(url: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
}

export function exportCanvasToPng(canvas: HTMLCanvasElement, filename: string) {
  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const context = output.getContext('2d')
  if (!context) throw new Error('Không thể tạo ảnh xuất bảng vẽ.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, output.width, output.height)
  context.drawImage(canvas, 0, 0)
  downloadUrl(output.toDataURL('image/png'), filename)
}

export async function exportCanvasToPdf(
  canvas: HTMLCanvasElement,
  filename: string,
  title = 'Bảng vẽ cuộc họp'
) {
  const { jsPDF } = await import('jspdf')
  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const context = output.getContext('2d')
  if (!context) throw new Error('Không thể tạo ảnh xuất bảng vẽ.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, output.width, output.height)
  context.drawImage(canvas, 0, 0)

  const orientation = output.width >= output.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 12
  const headerHeight = 18
  const imageWidth = pageWidth - margin * 2
  const imageHeight = pageHeight - margin * 2 - headerHeight
  const scale = Math.min(imageWidth / output.width, imageHeight / output.height)
  const renderedWidth = output.width * scale
  const renderedHeight = output.height * scale
  const image = output.toDataURL('image/png')

  pdf.setFontSize(14)
  pdf.text(title, margin, margin + 5)
  pdf.setFontSize(8)
  pdf.text(new Date().toLocaleString(), margin, margin + 11)
  pdf.addImage(
    image,
    'PNG',
    (pageWidth - renderedWidth) / 2,
    margin + headerHeight + (imageHeight - renderedHeight) / 2,
    renderedWidth,
    renderedHeight
  )
  pdf.save(filename)
}

function intersects(shape: WhiteboardShape, point: WhiteboardPoint, radius: number) {
  if (!shape.points.length) return false
  if (shape.type === 'TEXT' && shape.text) {
    const fontSize = shape.fontSize || 20
    const lines = shape.text.split('\n')
    const left = shape.points[0].x - radius
    const top = shape.points[0].y - radius
    const right = shape.points[0].x + Math.max(...lines.map((line) => line.length * fontSize * 0.65)) + radius
    const bottom = shape.points[0].y + lines.length * fontSize * 1.25 + radius
    return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
  }
  const xs = shape.points.map(({ x }) => x)
  const ys = shape.points.map(({ y }) => y)
  const left = Math.min(...xs) - radius
  const right = Math.max(...xs) + radius
  const top = Math.min(...ys) - radius
  const bottom = Math.max(...ys) + radius
  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
}

export function applyWhiteboardEvent(shapes: WhiteboardShape[], event: WhiteboardEvent) {
  switch (event.action) {
    case 'DRAW':
      return shapes.some((shape) => shape.id === event.shape.id)
        ? shapes.map((shape) => shape.id === event.shape.id ? event.shape : shape)
        : [...shapes, event.shape]
    case 'ERASE':
      return shapes.filter((shape) => !intersects(shape, event.point, event.eraserSize / 2))
    case 'CLEAR':
      return []
    case 'UNDO': {
      const index = shapes.findIndex((shape) => shape.id === event.shapeId)
      return index < 0 ? shapes : shapes.filter((_, shapeIndex) => shapeIndex !== index)
    }
    case 'REDO':
      return shapes.some((shape) => shape.id === event.shape.id)
        ? shapes
        : [...shapes, event.shape]
    case 'RESTORE':
      return event.shapes
    case 'MOVE':
      return shapes.map((shape) => shape.id === event.shapeId && shape.type === 'TEXT'
        ? { ...shape, points: [event.point, ...shape.points.slice(1)] }
        : shape)
  }
}
