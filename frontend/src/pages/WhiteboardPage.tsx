import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  Circle as CircleIcon,
  Download,
  Eraser,
  LoaderCircle,
  Minus,
  Pencil,
  RectangleHorizontal,
  Redo2,
  Save,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { WhiteboardCanvas, type WhiteboardTool } from '../components/whiteboard/WhiteboardCanvas'
import { useAuth } from '../context/AuthContext'
import { useWhiteboardSync } from '../hooks/useWhiteboardSync'
import { chatService } from '../services/chatService'
import { whiteboardService } from '../services/whiteboardService'
import type { Conversation } from '../types/chat'
import type { WhiteboardEvent, WhiteboardSession, WhiteboardShape } from '../types/whiteboard'
import { applyWhiteboardEvent, exportCanvasToPdf, exportCanvasToPng } from '../utils/whiteboard'

const colors = [
  { label: 'Tím Teams', value: '#5B5FC7' },
  { label: 'Đen than', value: '#242424' },
  { label: 'Đỏ tươi', value: '#D13438' },
  { label: 'Xanh lá', value: '#107C41' },
  { label: 'Xanh dương', value: '#0078D4' },
  { label: 'Cam', value: '#FF8C00' },
] as const

const strokeWidths = [2, 4, 8, 12] as const
const fontSizes = [14, 18, 24, 36] as const

const tools: { id: WhiteboardTool; label: string; icon: typeof Pencil }[] = [
  { id: 'PENCIL', label: 'Bút vẽ tự do', icon: Pencil },
  { id: 'ERASER', label: 'Tẩy nét vẽ', icon: Eraser },
  { id: 'RECTANGLE', label: 'Hình chữ nhật', icon: RectangleHorizontal },
  { id: 'ELLIPSE', label: 'Hình tròn / elip', icon: CircleIcon },
  { id: 'LINE', label: 'Đường thẳng', icon: Minus },
  { id: 'ARROW', label: 'Mũi tên', icon: ArrowUpRight },
  { id: 'TEXT', label: 'Hộp văn bản', icon: Type },
]

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải bảng vẽ.'
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character)
}

function shapeToSvg(shape: WhiteboardShape) {
  const [start, end] = shape.points
  if (!start) return ''
  const stroke = `stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`
  const fill = shape.fillColor && shape.fillColor !== 'transparent' ? shape.fillColor : 'none'
  if (shape.type === 'TEXT') {
    const lines = (shape.text || '').split('\n')
    return `<text x="${start.x}" y="${start.y}" fill="${shape.strokeColor}" font-family="sans-serif" font-size="${shape.fontSize || 20}" dominant-baseline="hanging">${lines.map((line, index) => `<tspan x="${start.x}" dy="${index === 0 ? 0 : (shape.fontSize || 20) * 1.25}">${escapeXml(line)}</tspan>`).join('')}</text>`
  }
  if (!end) return ''
  if (shape.type === 'RECTANGLE') {
    return `<rect x="${Math.min(start.x, end.x)}" y="${Math.min(start.y, end.y)}" width="${Math.abs(end.x - start.x)}" height="${Math.abs(end.y - start.y)}" ${stroke} fill="${fill}"/>`
  }
  if (shape.type === 'CIRCLE') {
    return `<ellipse cx="${(start.x + end.x) / 2}" cy="${(start.y + end.y) / 2}" rx="${Math.abs(end.x - start.x) / 2}" ry="${Math.abs(end.y - start.y) / 2}" ${stroke} fill="${fill}"/>`
  }
  if (shape.type === 'LINE' || shape.type === 'ARROW') {
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const arrowLength = Math.max(10, shape.strokeWidth * 3)
    const arrowX1 = end.x - arrowLength * Math.cos(angle - Math.PI / 6)
    const arrowY1 = end.y - arrowLength * Math.sin(angle - Math.PI / 6)
    const arrowX2 = end.x - arrowLength * Math.cos(angle + Math.PI / 6)
    const arrowY2 = end.y - arrowLength * Math.sin(angle + Math.PI / 6)
    const arrow = shape.type === 'ARROW'
      ? `<path d="M ${end.x} ${end.y} L ${arrowX1} ${arrowY1} M ${end.x} ${end.y} L ${arrowX2} ${arrowY2}" ${stroke} fill="none"/>`
      : ''
    return `<path d="M ${start.x} ${start.y} L ${end.x} ${end.y}" ${stroke} fill="none"/>${arrow}`
  }
  if (shape.points.length === 1) {
    return `<circle cx="${start.x}" cy="${start.y}" r="${shape.strokeWidth / 2}" fill="${shape.strokeColor}"/>`
  }
  const path = shape.points.reduce((result, point, index, points) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    if (index < points.length - 1) {
      const next = points[index + 1]
      return `${result} Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`
    }
    return `${result} L ${point.x} ${point.y}`
  }, '')
  return `<path d="${path}" ${stroke} fill="none"/>`
}

function WhiteboardStudio({ embeddedConversationId }: { embeddedConversationId?: string }) {
  const { token, user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState(embeddedConversationId || '')
  const [session, setSession] = useState<WhiteboardSession | null>(null)
  const [shapes, setShapes] = useState<WhiteboardShape[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>(colors[0].value)
  const [selectedFill, setSelectedFill] = useState('transparent')
  const [widthIndex, setWidthIndex] = useState(1)
  const [fontIndex, setFontIndex] = useState(2)
  const [tool, setTool] = useState<WhiteboardTool>('PENCIL')
  const [loadingConversations, setLoadingConversations] = useState(!embeddedConversationId)
  const [openingSession, setOpeningSession] = useState(Boolean(embeddedConversationId))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const shapesRef = useRef<WhiteboardShape[]>([])
  const dirtyRef = useRef(false)
  const historyRef = useRef<WhiteboardShape[][]>([[]])
  const historyIndexRef = useRef(0)
  const sendEventRef = useRef<(event: WhiteboardEvent) => void>(() => {})

  useEffect(() => {
    if (embeddedConversationId) return
    let active = true
    chatService.getConversations()
      .then((items) => {
        if (active) {
          setConversations(items)
          setConversationId((current) => current || items[0]?.id || '')
        }
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoadingConversations(false)
      })
    return () => { active = false }
  }, [embeddedConversationId])

  const commitEvent = useCallback((event: WhiteboardEvent, broadcast: boolean, recordHistory = true) => {
    if (event.action === 'CLEAR' && shapesRef.current.length === 0) return
    if (event.action === 'RESTORE'
      && JSON.stringify(shapesRef.current) === JSON.stringify(event.shapes)) return
    const shapeAlreadyExists = event.action === 'DRAW'
      && shapesRef.current.some((shape) => shape.id === event.shape.id)
    const next = applyWhiteboardEvent(shapesRef.current, event)
    shapesRef.current = next
    setShapes(next)
    dirtyRef.current = true
    if (recordHistory) {
      if (shapeAlreadyExists && event.action === 'DRAW') {
        const history = [...historyRef.current]
        history[historyIndexRef.current] = next
        historyRef.current = history
      } else {
        const history = historyRef.current.slice(0, historyIndexRef.current + 1)
        history.push(next)
        if (history.length > 100) history.shift()
        historyRef.current = history
        historyIndexRef.current = history.length - 1
      }
      setCanUndo(historyIndexRef.current > 0)
      setCanRedo(false)
    }
    if (broadcast) sendEventRef.current(event)
  }, [])

  const handleRemoteEvent = useCallback((event: WhiteboardEvent) => {
    commitEvent(event, false)
  }, [commitEvent])
  const {
    connectionState, cursors, sendEvent, sendCursor,
  } = useWhiteboardSync(session?.id ?? null, token, user?.id ?? null, handleRemoteEvent)
  useEffect(() => {
    sendEventRef.current = sendEvent
  }, [sendEvent])

  const openSession = useCallback(async (
    requestedConversationId = conversationId,
    showLoading = true
  ) => {
    if (!requestedConversationId) return
    if (showLoading) {
      setOpeningSession(true)
      setErrorMessage(null)
    }
    try {
      const selectedConversation = conversations.find((item) => item.id === requestedConversationId)
      const opened = await whiteboardService.openSession(
        requestedConversationId,
        selectedConversation?.name || 'Bảng vẽ nhóm'
      )
      const snapshot = await whiteboardService.getLatestSnapshot(opened.id)
      const restoredShapes = snapshot.shapes || opened.shapes
      setSession(opened)
      shapesRef.current = restoredShapes
      setShapes(restoredShapes)
      historyRef.current = [restoredShapes]
      historyIndexRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
      dirtyRef.current = false
      setSaveState('saved')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setOpeningSession(false)
    }
  }, [conversationId, conversations])

  useEffect(() => {
    if (embeddedConversationId) void openSession(embeddedConversationId, false)
  }, [embeddedConversationId, openSession])

  const saveSnapshot = useCallback(() => {
    if (!session) return
    const snapshot = shapesRef.current
    setSaveState('saving')
    saveQueueRef.current = saveQueueRef.current
      .then(() => whiteboardService.saveSnapshot(session.id, snapshot))
      .then(() => {
        if (shapesRef.current === snapshot) dirtyRef.current = false
        setSaveState('saved')
      })
      .catch((error: unknown) => {
        setSaveState('error')
        setErrorMessage(getErrorMessage(error))
      })
  }, [session])

  useEffect(() => {
    if (!session) return
    const timer = window.setInterval(() => {
      if (dirtyRef.current) saveSnapshot()
    }, 30000)
    return () => window.clearInterval(timer)
  }, [saveSnapshot, session])

  const undo = () => {
    if (historyIndexRef.current <= 0) return
    const nextIndex = historyIndexRef.current - 1
    commitEvent({ action: 'RESTORE', shapes: historyRef.current[nextIndex] }, true, false)
    historyIndexRef.current = nextIndex
    setCanUndo(nextIndex > 0)
    setCanRedo(true)
  }

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    const nextIndex = historyIndexRef.current + 1
    commitEvent({ action: 'RESTORE', shapes: historyRef.current[nextIndex] }, true, false)
    historyIndexRef.current = nextIndex
    setCanUndo(true)
    setCanRedo(nextIndex < historyRef.current.length - 1)
  }

  const handleLocalEvent = (event: WhiteboardEvent) => {
    commitEvent(event, true)
  }

  const clearBoard = () => {
    handleLocalEvent({ action: 'CLEAR' })
    setShowClearDialog(false)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
      if (event.key === 'Escape') setShowClearDialog(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const exportPng = () => {
    if (!canvasRef.current) return
    try {
      exportCanvasToPng(canvasRef.current, 'whiteboard.png')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  const exportPdf = async () => {
    if (!canvasRef.current) return
    try {
      await exportCanvasToPdf(canvasRef.current, 'whiteboard.pdf', session?.title || 'Bảng vẽ cuộc họp')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  const exportSvg = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    const content = shapes.map(shapeToSvg).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>${content}</svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const link = document.createElement('a')
    link.download = 'whiteboard.svg'
    link.href = url
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const setCanvasElement = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas
  }, [])

  return (
    <section className={`flex h-full min-h-0 flex-col overflow-hidden bg-white text-[#242424] ${
      embeddedConversationId ? '' : 'min-h-[560px] rounded-xl border border-[#e1dfdd] shadow-sm'
    }`}>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1dfdd] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6264a7]">Không gian cộng tác</p>
          <h1 className="mt-1 text-xl font-semibold">{session?.title || 'Bảng vẽ nhóm'}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#616161]">
          <span className={`h-2 w-2 rounded-full ${connectionState === 'connected' ? 'bg-[#13a10e]' : 'bg-[#c8c6c4]'}`} />
          {connectionState === 'connected' ? 'Đang đồng bộ' : connectionState === 'connecting' ? 'Đang kết nối' : 'Chưa kết nối'}
          {session && (
            <button type="button" onClick={saveSnapshot} className="inline-flex items-center gap-1 rounded-md border border-[#d1d1d1] px-2.5 py-1.5 hover:bg-[#f5f5f5]">
              {saveState === 'saving' ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {saveState === 'saved' ? 'Đã lưu' : saveState === 'error' ? 'Lưu lại' : 'Lưu'}
            </button>
          )}
        </div>
      </header>

      {!embeddedConversationId && <div className="flex flex-wrap items-end gap-3 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-3">
        <label className="min-w-[220px] flex-1 text-sm text-[#616161]">
          Cuộc trò chuyện
          <select
            value={conversationId}
            onChange={(event) => {
              setConversationId(event.target.value)
              setSession(null)
              shapesRef.current = []
              setShapes([])
              historyRef.current = [[]]
              historyIndexRef.current = 0
              setCanUndo(false)
              setCanRedo(false)
              dirtyRef.current = false
              setErrorMessage(null)
            }}
            disabled={loadingConversations || conversations.length === 0}
            className="mt-1 block w-full rounded-md border border-[#c8c6c4] bg-white px-3 py-2 text-[#242424]"
          >
            {conversations.length === 0 && <option value="">Chưa có cuộc trò chuyện</option>}
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.name || conversation.otherUser?.displayName || 'Cuộc trò chuyện'}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => openSession()}
          disabled={!conversationId || openingSession}
          className="rounded-md bg-[#5b5fc7] px-4 py-2 text-sm font-medium text-white hover:bg-[#464aaf] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {openingSession ? 'Đang mở...' : session ? 'Mở bảng' : 'Mở bảng vẽ'}
        </button>
        {session && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} disabled={!canUndo} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white disabled:opacity-40">
              <Undo2 size={17} />
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Làm lại (Ctrl+Y)" aria-label="Làm lại" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white disabled:opacity-40">
              <Redo2 size={17} />
            </button>
            <button type="button" onClick={() => setShowClearDialog(true)} disabled={shapes.length === 0} title="Xóa toàn bộ" aria-label="Xóa toàn bộ bảng vẽ" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white disabled:opacity-40">
              <Trash2 size={17} />
            </button>
            <button type="button" onClick={exportPng} title="Xuất ảnh PNG" aria-label="Xuất bảng vẽ ra ảnh PNG" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white">
              <Download size={17} />
            </button>
            <button type="button" onClick={() => void exportPdf()} title="Xuất tài liệu PDF" aria-label="Xuất bảng vẽ ra tài liệu PDF" className="rounded-md border border-[#d1d1d1] px-2.5 text-xs hover:bg-white">
              PDF
            </button>
            <button type="button" onClick={exportSvg} title="Xuất ảnh SVG" aria-label="Xuất bảng vẽ ra ảnh SVG" className="rounded-md border border-[#d1d1d1] px-2.5 text-xs hover:bg-white">
              SVG
            </button>
          </div>
        )}
      </div>}
      {embeddedConversationId && (
        <div className="flex items-center justify-between border-b border-[#e1dfdd] bg-[#faf9f8] px-3 py-2 text-sm text-[#616161]">
          <span>Bảng vẽ đang đồng bộ với cuộc họp</span>
          <span>{openingSession ? 'Đang mở...' : connectionState === 'connected' ? 'Đang đồng bộ' : 'Đang kết nối'}</span>
        </div>
      )}

      {session && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-3">
          <div className="flex flex-wrap items-center gap-1" aria-label="Công cụ bảng vẽ">
            {tools.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={tool === id}
                title={label}
                onClick={() => setTool(id)}
                className={`grid h-9 w-9 place-items-center rounded-md ${
                  tool === id ? 'bg-[#5b5fc7] text-white' : 'text-[#424242] hover:bg-[#edebe9]'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <span className="hidden h-7 w-px bg-[#d1d1d1] sm:block" />
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Màu nét vẽ</legend>
            <span className="text-sm text-[#616161]">Màu</span>
            <div className="flex items-center gap-1.5">
              {colors.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={selectedColor === value}
                  onClick={() => setSelectedColor(value)}
                  className={`grid h-7 w-7 place-items-center rounded-full border ${
                    selectedColor === value ? 'border-[#5b5fc7] ring-2 ring-[#5b5fc7] ring-offset-1' : 'border-[#c8c6c4]'
                  }`}
                  style={{ backgroundColor: value }}
                  title={label}
                >
                  {selectedColor === value && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-[#616161]">
            Màu tô
            <select
              value={selectedFill}
              onChange={(event) => setSelectedFill(event.target.value)}
              aria-label="Màu tô nền hình"
              className="rounded border border-[#c8c6c4] bg-white px-2 py-1"
            >
              <option value="transparent">Trong suốt</option>
              {colors.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <span className="hidden h-7 w-px bg-[#d1d1d1] sm:block" />
          <label className="flex min-w-[180px] flex-1 items-center gap-2 sm:flex-none">
            <SlidersHorizontal size={16} className="text-[#616161]" aria-hidden="true" />
            <span className="whitespace-nowrap text-sm text-[#616161]">Độ dày</span>
            <input type="range" min={0} max={strokeWidths.length - 1} step={1} value={widthIndex} onChange={(event) => setWidthIndex(Number(event.target.value))} aria-label="Độ dày nét vẽ" aria-valuetext={`${strokeWidths[widthIndex]} pixel`} className="min-w-16 flex-1 accent-[#5b5fc7]" />
            <span className="w-10 text-right text-sm tabular-nums">{strokeWidths[widthIndex]} px</span>
          </label>
          {tool === 'TEXT' && (
            <label className="flex items-center gap-2 text-sm text-[#616161]">
              Cỡ chữ (kéo để di chuyển)
              <select value={fontIndex} onChange={(event) => setFontIndex(Number(event.target.value))} aria-label="Cỡ chữ" className="rounded border border-[#c8c6c4] bg-white px-2 py-1">
                {fontSizes.map((size, index) => <option key={size} value={index}>{size}px</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="border-b border-[#f1c1c1] bg-[#fdf3f3] px-4 py-2 text-sm text-[#a4262c]">
          {errorMessage}
        </p>
      )}

      <div className="relative m-4 min-h-[360px] flex-1 overflow-hidden rounded-lg border border-[#edebe9] bg-[radial-gradient(#d1d1d1_1px,transparent_1px)] [background-size:20px_20px]">
        {session && user ? (
          <WhiteboardCanvas
            color={selectedColor}
            strokeWidth={strokeWidths[widthIndex]}
            fontSize={fontSizes[fontIndex]}
            tool={tool}
            shapes={shapes}
            cursors={cursors}
            onLocalEvent={handleLocalEvent}
            onPreviewShape={(shape) => sendEvent({ action: 'DRAW', shape })}
            onCursorMove={sendCursor}
            authorId={user.id}
            authorName={user.displayName}
            onCanvasReady={setCanvasElement}
            fillColor={selectedFill}
          />
        ) : (
          <div className="grid h-full min-h-[360px] place-items-center px-6 text-center text-sm text-[#616161]">
            {loadingConversations
              ? 'Đang tải cuộc trò chuyện...'
              : conversations.length === 0
                ? 'Hãy bắt đầu một cuộc trò chuyện trước khi tạo bảng vẽ.'
                : 'Chọn cuộc trò chuyện và mở bảng để bắt đầu vẽ cùng nhau.'}
          </div>
        )}
      </div>

      {showClearDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="clear-whiteboard-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="clear-whiteboard-title" className="text-lg font-semibold">Xóa toàn bộ bảng vẽ?</h2>
            <p className="mt-2 text-sm text-[#616161]">Bạn có chắc chắn muốn xóa toàn bộ nội dung bảng vẽ không?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowClearDialog(false)} className="rounded-md border border-[#c8c6c4] px-4 py-2 text-sm hover:bg-[#f5f5f5]">Hủy</button>
              <button type="button" onClick={clearBoard} className="rounded-md bg-[#c4314b] px-4 py-2 text-sm font-medium text-white hover:bg-[#a4263d]">Xóa bảng</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function WhiteboardPage() {
  return <WhiteboardStudio />
}

export function EmbeddedWhiteboard({ sessionId }: { sessionId: string }) {
  return <WhiteboardStudio key={sessionId} embeddedConversationId={sessionId} />
}
