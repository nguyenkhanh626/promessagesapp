import { useState } from 'react'
import {
  Circle,
  Download,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Type,
  Undo2,
} from 'lucide-react'

const tools = [
  { label: 'Chọn', icon: MousePointer2 },
  { label: 'Nét vẽ', icon: Pencil },
  { label: 'Hình chữ nhật', icon: Square },
  { label: 'Hình tròn', icon: Circle },
  { label: 'Văn bản', icon: Type },
] as const

export function WhiteboardPage() {
  const [activeTool, setActiveTool] = useState<(typeof tools)[number]['label']>('Nét vẽ')

  return (
    <section className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-xl border border-[#e1dfdd] bg-white text-[#242424] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1dfdd] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6264a7]">Không gian cộng tác</p>
          <h1 className="mt-1 text-xl font-semibold">Bảng vẽ nhóm</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#616161]">
          <span className="h-2 w-2 rounded-full bg-[#13a10e]" />
          Bảng vẽ sẵn sàng
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1" aria-label="Công cụ bảng vẽ">
          {tools.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-pressed={activeTool === label}
              onClick={() => setActiveTool(label)}
              className={`grid h-9 w-9 place-items-center rounded-md transition-colors ${
                activeTool === label
                  ? 'bg-[#5b5fc7] text-white'
                  : 'text-[#424242] hover:bg-[#edebe9]'
              }`}
              title={label}
            >
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-[#d1d1d1]" />
          <button type="button" aria-label="Hoàn tác" disabled className="grid h-9 w-9 place-items-center rounded-md text-[#a19f9d]">
            <Undo2 size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Làm lại" disabled className="grid h-9 w-9 place-items-center rounded-md text-[#a19f9d]">
            <Redo2 size={18} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d1d1d1] px-3 text-sm text-[#616161]"
          title="Xuất bảng vẽ sẽ có trong phiên bản tiếp theo"
        >
          <Download size={16} aria-hidden="true" />
          Xuất
        </button>
      </div>

      <div className="relative m-4 flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#edebe9] bg-[radial-gradient(#d1d1d1_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="rounded-xl border border-[#edebe9] bg-white/95 px-6 py-5 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eeefff] text-[#5b5fc7]">
            <Pencil size={22} aria-hidden="true" />
          </div>
          <h2 className="mt-3 font-semibold">Bắt đầu cộng tác trên bảng vẽ</h2>
          <p className="mt-1 max-w-sm text-sm text-[#616161]">
            Chọn công cụ <strong>{activeTool.toLowerCase()}</strong>. Bảng vẽ vector và đồng bộ thời gian thực sẽ được hoàn thiện ở tuần 2.
          </p>
        </div>
        <span className="absolute bottom-3 right-4 rounded-full border border-[#e1dfdd] bg-white px-3 py-1 text-xs text-[#616161]">
          100%
        </span>
      </div>
    </section>
  )
}
