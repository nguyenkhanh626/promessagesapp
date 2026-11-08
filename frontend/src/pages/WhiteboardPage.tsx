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
  Save,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { WhiteboardCanvas, type WhiteboardTool } from '../components/whiteboard/WhiteboardCanvas'
import { useAuth } from '../context/AuthContext'
import { useWhiteboardWebSocket } from '../hooks/useWhiteboardWebSocket'
import { chatService } from '../services/chatService'
import { whiteboardService } from '../services/whiteboardService'
import type { Conversation } from '../types/chat'
import type { WhiteboardEvent, WhiteboardSession, WhiteboardShape } from '../types/whiteboard'
import { applyWhiteboardEvent } from '../utils/whiteboard'

const colors = [
  { label: 'Đen', value: '#242424' },
  { label: 'Trắng', value: '#ffffff' },
  { label: 'Tím Teams', value: '#5B5FC7' },
  { label: 'Đỏ', value: '#C4314B' },
  { label: 'Xanh lá', value: '#107C41' },
  { label: 'Xanh dương', value: '#0078D4' },
  { label: 'Vàng', value: '#FFB900' },
] as const

const strokeWidths = [2, 4, 8, 12, 20] as const
const fontSizes = [14, 18, 24, 32, 40] as const

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

export function WhiteboardPage() {
  const { token, user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState('')
  const [session, setSession] = useState<WhiteboardSession | null>(null)
  const [shapes, setShapes] = useState<WhiteboardShape[]>([])
  const [selectedColor, setSelectedColor] = useState<string>(colors[0].value)
  const [widthIndex, setWidthIndex] = useState(1)
  const [fontIndex, setFontIndex] = useState(2)
  const [tool, setTool] = useState<WhiteboardTool>('PENCIL')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [openingSession, setOpeningSession] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
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
  }, [])

  const handleRemoteEvent = useCallback((event: WhiteboardEvent) => {
    setShapes((current) => applyWhiteboardEvent(current, event))
  }, [])
  const { connectionState, sendEvent } = useWhiteboardWebSocket(session?.id ?? null, token, handleRemoteEvent)

  const openSession = async () => {
    if (!conversationId) return
    setOpeningSession(true)
    setErrorMessage(null)
    try {
      const selectedConversation = conversations.find((item) => item.id === conversationId)
      const opened = await whiteboardService.openSession(
        conversationId,
        selectedConversation?.name || 'Bảng vẽ nhóm'
      )
      setSession(opened)
      setShapes(opened.shapes)
      setSaveState('saved')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setOpeningSession(false)
    }
  }

  useEffect(() => {
    if (!session) return
    const snapshot = shapes
    const sessionId = session.id
    const timer = window.setTimeout(() => {
      setSaveState('saving')
      saveQueueRef.current = saveQueueRef.current
        .then(() => whiteboardService.saveSnapshot(sessionId, snapshot))
        .then(() => setSaveState('saved'))
        .catch((error: unknown) => {
          setSaveState('error')
          setErrorMessage(getErrorMessage(error))
        })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [session, shapes])

  const handleLocalEvent = (event: WhiteboardEvent) => {
    setShapes((current) => applyWhiteboardEvent(current, event))
    sendEvent(event)
  }

  const undoLastOwnShape = () => {
    if (!user) return
    const lastOwnShape = [...shapes].reverse().find((shape) => shape.authorId === user.id)
    if (lastOwnShape) handleLocalEvent({ action: 'UNDO', shapeId: lastOwnShape.id })
  }

  const clearBoard = () => {
    handleLocalEvent({ action: 'CLEAR' })
    setShowClearDialog(false)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undoLastOwnShape()
      }
      if (event.key === 'Escape') setShowClearDialog(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const exportPng = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'whiteboard.png'
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const saveNow = () => {
    if (!session) return
    setSaveState('saving')
    saveQueueRef.current = saveQueueRef.current
      .then(() => whiteboardService.saveSnapshot(session.id, shapes))
      .then(() => setSaveState('saved'))
      .catch((error: unknown) => {
        setSaveState('error')
        setErrorMessage(getErrorMessage(error))
      })
  }

  const setCanvasElement = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas
  }, [])

  return (
    <section className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-xl border border-[#e1dfdd] bg-white text-[#242424] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1dfdd] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6264a7]">Không gian cộng tác</p>
          <h1 className="mt-1 text-xl font-semibold">{session?.title || 'Bảng vẽ nhóm'}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#616161]">
          <span className={`h-2 w-2 rounded-full ${connectionState === 'connected' ? 'bg-[#13a10e]' : 'bg-[#c8c6c4]'}`} />
          {connectionState === 'connected' ? 'Đang đồng bộ' : connectionState === 'connecting' ? 'Đang kết nối' : 'Chưa kết nối'}
          {session && (
            <button type="button" onClick={saveNow} className="inline-flex items-center gap-1 rounded-md border border-[#d1d1d1] px-2.5 py-1.5 hover:bg-[#f5f5f5]">
              {saveState === 'saving' ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {saveState === 'saved' ? 'Đã lưu' : saveState === 'error' ? 'Lưu lại' : 'Lưu'}
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-3">
        <label className="min-w-[220px] flex-1 text-sm text-[#616161]">
          Cuộc trò chuyện
          <select
            value={conversationId}
            onChange={(event) => {
              setConversationId(event.target.value)
              setSession(null)
              setShapes([])
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
          onClick={openSession}
          disabled={!conversationId || openingSession}
          className="rounded-md bg-[#5b5fc7] px-4 py-2 text-sm font-medium text-white hover:bg-[#464aaf] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {openingSession ? 'Đang mở...' : session ? 'Mở bảng' : 'Mở bảng vẽ'}
        </button>
        {session && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undoLastOwnShape} disabled={!shapes.some((shape) => shape.authorId === user?.id)} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white disabled:opacity-40">
              <Undo2 size={17} />
            </button>
            <button type="button" onClick={() => setShowClearDialog(true)} disabled={shapes.length === 0} title="Xóa toàn bộ" aria-label="Xóa toàn bộ bảng vẽ" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white disabled:opacity-40">
              <Trash2 size={17} />
            </button>
            <button type="button" onClick={exportPng} title="Xuất ảnh PNG" aria-label="Xuất bảng vẽ ra ảnh PNG" className="grid h-9 w-9 place-items-center rounded-md border border-[#d1d1d1] hover:bg-white">
              <Download size={17} />
            </button>
          </div>
        )}
      </div>

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
                  {selectedColor === value && <Check size={14} className={value === '#ffffff' || value === '#FFB900' ? 'text-[#242424]' : 'text-white'} />}
                </button>
              ))}
            </div>
          </fieldset>
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
            onLocalEvent={handleLocalEvent}
            authorId={user.id}
            onCanvasReady={setCanvasElement}
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
