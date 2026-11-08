import { useState } from 'react'
import {
  Check,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'
import { WhiteboardCanvas } from '../components/whiteboard/WhiteboardCanvas'

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

export function WhiteboardPage() {
  const [selectedColor, setSelectedColor] = useState<string>(colors[0].value)
  const [widthIndex, setWidthIndex] = useState(1)

  return (
    <section className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-xl border border-[#e1dfdd] bg-white text-[#242424] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e1dfdd] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6264a7]">Không gian cộng tác</p>
          <h1 className="mt-1 text-xl font-semibold">Bảng vẽ nhóm</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#616161]">
          <span className="h-2 w-2 rounded-full bg-[#13a10e]" />
          Studio Canvas
        </div>
      </header>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[#e1dfdd] bg-[#faf9f8] px-4 py-3">
        <div className="flex items-center gap-2" aria-label="Công cụ bảng vẽ">
          <button
            type="button"
            aria-label="Bút vẽ tự do"
            aria-pressed="true"
            className="grid h-9 w-9 place-items-center rounded-md bg-[#5b5fc7] text-white"
            title="Bút vẽ tự do"
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
          <span className="text-sm font-medium">Bút vẽ</span>
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
                className={`grid h-7 w-7 place-items-center rounded-full border transition ${
                  selectedColor === value
                    ? 'border-[#5b5fc7] ring-2 ring-[#5b5fc7] ring-offset-1'
                    : 'border-[#c8c6c4] hover:scale-110'
                }`}
                style={{ backgroundColor: value }}
                title={label}
              >
                {selectedColor === value && (
                  <Check
                    size={14}
                    className={value === '#ffffff' || value === '#FFB900' ? 'text-[#242424]' : 'text-white'}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </fieldset>

        <span className="hidden h-7 w-px bg-[#d1d1d1] sm:block" />

        <label className="flex min-w-[190px] flex-1 items-center gap-3 sm:flex-none">
          <SlidersHorizontal size={16} className="shrink-0 text-[#616161]" aria-hidden="true" />
          <span className="whitespace-nowrap text-sm text-[#616161]">Độ dày</span>
          <input
            type="range"
            min={0}
            max={strokeWidths.length - 1}
            step={1}
            value={widthIndex}
            onChange={(event) => setWidthIndex(Number(event.target.value))}
            aria-label="Độ dày nét vẽ"
            aria-valuetext={`${strokeWidths[widthIndex]} pixel`}
            className="min-w-16 flex-1 accent-[#5b5fc7]"
          />
          <span className="w-10 text-right text-sm tabular-nums">{strokeWidths[widthIndex]} px</span>
        </label>
      </div>

      <div className="relative m-4 min-h-[360px] flex-1 overflow-hidden rounded-lg border border-[#edebe9] bg-[radial-gradient(#d1d1d1_1px,transparent_1px)] [background-size:20px_20px]">
        <WhiteboardCanvas color={selectedColor} strokeWidth={strokeWidths[widthIndex]} />
      </div>
    </section>
  )
}
