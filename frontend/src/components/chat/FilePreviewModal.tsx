import React, { useState } from 'react'
import { Download, ExternalLink, FileText, X, ZoomIn, ZoomOut } from 'lucide-react'

export interface PreviewableFile {
  fileUrl: string
  fileName?: string
  messageType?: 'IMAGE' | 'FILE' | string
  fileSize?: number
}

interface FilePreviewModalProps {
  file: PreviewableFile | null
  onClose: () => void
}

export const isPdfFile = (fileName?: string, fileUrl?: string) => {
  const target = (fileName || fileUrl || '').toLowerCase()
  return target.endsWith('.pdf')
}

export const isImageFile = (messageType?: string, fileName?: string, fileUrl?: string) => {
  if (messageType === 'IMAGE') return true
  const target = (fileName || fileUrl || '').toLowerCase()
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(target)
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [zoom, setZoom] = useState(1)

  if (!file) return null

  const isImg = isImageFile(file.messageType, file.fileName, file.fileUrl)
  const isPdf = !isImg && isPdfFile(file.fileName, file.fileUrl)

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-[#1e1e22] border border-[#383838] shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-5 py-3.5 bg-[#252529] border-b border-[#383838] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#5B5FC7]/25 border border-[#5B5FC7]/40 flex items-center justify-center text-[#9ba0ff] shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {file.fileName || 'Xem trước tệp đính kèm'}
              </p>
              {file.fileSize ? (
                <p className="text-[11px] text-gray-400">{formatSize(file.fileSize)}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImg && (
              <div className="flex items-center gap-1 bg-[#181818] border border-[#383838] rounded-lg px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  className="p-1 text-gray-300 hover:text-white rounded"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-1.5 text-[11px] font-semibold text-gray-300 hover:text-white"
                  title="Đặt lại 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  className="p-1 text-gray-300 hover:text-white rounded"
                  title="Phóng to"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            )}

            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#2e2e34] hover:bg-[#3a3a42] text-xs font-semibold text-gray-200 flex items-center gap-1.5 border border-[#45454d] transition-colors"
              title="Mở trong tab mới"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Mở tab mới</span>
            </a>

            <a
              href={`${file.fileUrl}?download=true`}
              download={file.fileName || true}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#5B5FC7] hover:bg-[#4f52b2] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              <span>Tải xuống</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-[#2e2e34] hover:bg-[#3a3a42] flex items-center justify-center text-gray-300 hover:text-white border border-[#45454d]"
              title="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-[#141417] flex items-center justify-center p-4 min-h-[420px]">
          {isImg ? (
            <img
              src={file.fileUrl}
              alt={file.fileName || 'Xem trước hình ảnh'}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-h-[76vh] max-w-full rounded-xl object-contain transition-transform duration-150 shadow-xl"
            />
          ) : isPdf ? (
            <iframe
              src={file.fileUrl}
              title={file.fileName || 'Xem trước tài liệu PDF'}
              className="w-full h-[76vh] rounded-xl border border-[#323238] bg-white"
            />
          ) : (
            <div className="text-center p-10 max-w-sm space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-[#26262b] border border-[#383838] flex items-center justify-center text-[#9ba0ff]">
                <FileText size={32} />
              </div>
              <h4 className="text-sm font-bold text-white break-all">{file.fileName || 'Tệp đính kèm'}</h4>
              <p className="text-xs text-gray-400">
                Định dạng tệp này không hỗ trợ xem trực tiếp trên trình duyệt. Nhấn nút Tải xuống để mở trên máy của bạn.
              </p>
              <a
                href={`${file.fileUrl}?download=true`}
                download={file.fileName || true}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B5FC7] hover:bg-[#4f52b2] text-xs font-semibold text-white transition-colors"
              >
                <Download size={14} />
                <span>Tải tệp về máy</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
