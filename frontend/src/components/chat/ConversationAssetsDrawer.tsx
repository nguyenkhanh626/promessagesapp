import React, { useState } from 'react'
import {
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Pin,
  PinOff,
  X,
} from 'lucide-react'
import type { ConversationMediaItem, Message } from '../../types/chat'
import { isPdfFile, type PreviewableFile } from './FilePreviewModal'

interface ConversationAssetsDrawerProps {
  activeTab: 'PINNED' | 'MEDIA'
  onTabChange: (tab: 'PINNED' | 'MEDIA') => void
  pinnedMessages: Message[]
  mediaItems: ConversationMediaItem[]
  isLoadingMedia: boolean
  onClose: () => void
  onJumpToMessage: (messageId: string) => void
  onUnpinMessage: (messageId: string) => void
  onPreviewFile: (file: PreviewableFile) => void
}

export const ConversationAssetsDrawer: React.FC<ConversationAssetsDrawerProps> = ({
  activeTab,
  onTabChange,
  pinnedMessages,
  mediaItems,
  isLoadingMedia,
  onClose,
  onJumpToMessage,
  onUnpinMessage,
  onPreviewFile,
}) => {
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'IMAGE' | 'FILE'>('ALL')

  const imageItems = mediaItems.filter((item) => item.messageType === 'IMAGE')
  const fileItems = mediaItems.filter((item) => item.messageType === 'FILE')

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleString([], {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <aside className="w-80 h-full flex flex-col bg-[#201f1f] border-l border-[#383838] text-white select-none shrink-0">
      {/* Header */}
      <div className="h-16 px-4 border-b border-[#383838] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {activeTab === 'PINNED' ? (
            <Pin size={17} className="text-amber-400" />
          ) : (
            <FolderOpen size={17} className="text-[#9ba0ff]" />
          )}
          <h3 className="font-bold text-sm text-white">
            {activeTab === 'PINNED' ? 'Tin nhắn đã ghim' : 'Tệp đã chia sẻ'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#383838] transition-colors"
          title="Đóng bảng"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Tabs: Tin nhắn đã ghim | Tệp đã chia sẻ */}
      <div className="p-3 border-b border-[#303030]">
        <div className="grid grid-cols-2 gap-1 bg-[#181818] p-1 rounded-xl border border-[#303030]">
          <button
            type="button"
            onClick={() => onTabChange('PINNED')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'PINNED'
                ? 'bg-[#5B5FC7] text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Pin size={13} />
            <span>Đã ghim ({pinnedMessages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('MEDIA')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'MEDIA'
                ? 'bg-[#5B5FC7] text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FolderOpen size={13} />
            <span>Tệp ({mediaItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'PINNED' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {pinnedMessages.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-500 text-xs space-y-2">
              <Pin size={28} className="mx-auto opacity-35" />
              <p className="font-semibold text-gray-400">Chưa có tin nhắn nào được ghim</p>
              <p>Rê chuột vào tin nhắn quan trọng trong khung chat và nhấn biểu tượng ghim để lưu lại tại đây.</p>
            </div>
          ) : (
            pinnedMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-xl bg-[#26262a] border border-[#38383f] hover:border-[#5B5FC7]/60 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#9ba0ff] truncate">{msg.senderName}</p>
                    <p className="text-[10px] text-gray-400">
                      {msg.pinnedByName ? `Ghim bởi ${msg.pinnedByName} • ` : ''}
                      {formatDateTime(msg.pinnedAt || msg.createdAt)}
                    </p>
                  </div>
                  {msg.important && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-bold text-rose-300 shrink-0">
                      QUAN TRỌNG
                    </span>
                  )}
                </div>

                {msg.messageType === 'IMAGE' && msg.fileUrl && (
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName || msg.content}
                    onClick={() =>
                      onPreviewFile({
                        fileUrl: msg.fileUrl!,
                        fileName: msg.fileName || msg.content,
                        messageType: 'IMAGE',
                        fileSize: msg.fileSize,
                      })
                    }
                    className="h-28 w-full object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-90"
                  />
                )}

                <p className="text-xs text-gray-200 line-clamp-3 whitespace-pre-wrap break-words">
                  {msg.messageType === 'FILE' ? `📎 ${msg.fileName || msg.content}` : msg.content}
                </p>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onJumpToMessage(msg.id)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-indigo-300 hover:bg-[#5B5FC7]/20 flex items-center gap-1 transition-colors"
                  >
                    <ArrowUpRight size={12} />
                    <span>Đi tới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnpinMessage(msg.id)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 flex items-center gap-1 transition-colors"
                  >
                    <PinOff size={12} />
                    <span>Bỏ ghim</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Sub-filter: Tất cả | Hình ảnh | Tài liệu */}
          <div className="px-3 pt-2.5 pb-2 flex items-center gap-1.5 shrink-0">
            {(
              [
                { key: 'ALL', label: `Tất cả (${mediaItems.length})` },
                { key: 'IMAGE', label: `Ảnh (${imageItems.length})` },
                { key: 'FILE', label: `Tài liệu (${fileItems.length})` },
              ] as const
            ).map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setMediaFilter(sub.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  mediaFilter === sub.key
                    ? 'bg-[#5B5FC7]/25 border-[#5B5FC7] text-indigo-200'
                    : 'bg-[#1a1a1d] border-[#323236] text-gray-400 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {isLoadingMedia ? (
              <p className="text-xs text-gray-400 text-center py-8">Đang tải thư viện tệp...</p>
            ) : mediaItems.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-500 text-xs space-y-2">
                <FolderOpen size={28} className="mx-auto opacity-35" />
                <p className="font-semibold text-gray-400">Chưa có hình ảnh hoặc tệp nào</p>
                <p>Ảnh và tài liệu được chia sẻ trong cuộc trò chuyện sẽ được lưu gọn gàng tại đây.</p>
              </div>
            ) : (
              <>
                {/* Hình ảnh */}
                {(mediaFilter === 'ALL' || mediaFilter === 'IMAGE') && imageItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                      <ImageIcon size={12} />
                      <span>Hình ảnh ({imageItems.length})</span>
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {imageItems.map((img) => (
                        <button
                          key={img.messageId}
                          type="button"
                          onClick={() =>
                            onPreviewFile({
                              fileUrl: img.fileUrl,
                              fileName: img.fileName,
                              messageType: 'IMAGE',
                              fileSize: img.fileSize,
                            })
                          }
                          className="group relative aspect-square rounded-lg overflow-hidden bg-[#181818] border border-[#323236] hover:border-[#5B5FC7]"
                          title={`${img.fileName} — gửi bởi ${img.senderName}`}
                        >
                          <img
                            src={img.fileUrl}
                            alt={img.fileName}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tệp tài liệu */}
                {(mediaFilter === 'ALL' || mediaFilter === 'FILE') && fileItems.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                      <FileText size={12} />
                      <span>Tài liệu ({fileItems.length})</span>
                    </p>
                    <div className="space-y-2">
                      {fileItems.map((doc) => {
                        const canPreviewPdf = isPdfFile(doc.fileName, doc.fileUrl)
                        return (
                          <div
                            key={doc.messageId}
                            className="p-2.5 rounded-xl bg-[#26262a] border border-[#36363d] flex items-center justify-between gap-2 hover:border-[#5B5FC7]/60 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-[#5B5FC7]/20 border border-[#5B5FC7]/40 flex items-center justify-center text-[#9ba0ff] shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {doc.senderName}
                                  {doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {canPreviewPdf && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewFile({
                                      fileUrl: doc.fileUrl,
                                      fileName: doc.fileName,
                                      messageType: 'FILE',
                                      fileSize: doc.fileSize,
                                    })
                                  }
                                  className="h-7 w-7 rounded-lg bg-[#32323a] hover:bg-[#5B5FC7] flex items-center justify-center text-gray-200 hover:text-white transition-colors"
                                  title="Xem trước PDF trực tiếp"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                              <a
                                href={`${doc.fileUrl}?download=true`}
                                download={doc.fileName || true}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 w-7 rounded-lg bg-[#32323a] hover:bg-[#44444e] flex items-center justify-center text-gray-200 hover:text-white transition-colors"
                                title="Tải xuống"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
