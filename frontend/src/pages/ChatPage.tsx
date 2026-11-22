import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { ConversationAssetsDrawer } from '../components/chat/ConversationAssetsDrawer'
import { CreateGroupModal } from '../components/chat/CreateGroupModal'
import { FilePreviewModal, type PreviewableFile } from '../components/chat/FilePreviewModal'
import { GroupMembersPanel } from '../components/chat/GroupMembersPanel'
import { UserDirectoryModal } from '../components/chat/UserDirectoryModal'
import { chatService } from '../services/chatService'
import { useAuth } from '../context/AuthContext'
import { useChatWebSocket } from '../hooks/useChatWebSocket'
import type {
  Conversation,
  ConversationMediaItem,
  ConversationMember,
  Message,
  PinMessageEvent,
  PresenceEvent,
  TypingEvent,
  UserPresenceStatus,
} from '../types/chat'
import type { User } from '../types/auth'

export const ChatPage: React.FC = () => {
  const { user: currentUser, token } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([])
  const [mediaItems, setMediaItems] = useState<ConversationMediaItem[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [groupMembers, setGroupMembers] = useState<ConversationMember[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([])
  const [myStatus, setMyStatus] = useState<UserPresenceStatus>(
    (currentUser?.status as UserPresenceStatus) || 'ONLINE'
  )
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [assetsDrawerTab, setAssetsDrawerTab] = useState<'PINNED' | 'MEDIA' | null>(null)
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null)
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // 1. Tải danh sách các cuộc trò chuyện của người dùng
  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations()
      setConversations(data)
      if (data.length > 0 && !activeConversation) {
        setActiveConversation(data[0])
      }
    } catch (err) {
      console.error('Không thể tải danh sách cuộc trò chuyện:', err)
    }
  }, [activeConversation])

  useEffect(() => {
    loadConversations()
  }, [])

  const activeConversationIdRef = useRef<string | null>(null)
  activeConversationIdRef.current = activeConversation?.id || null

  // 2. Tải lịch sử tin nhắn, tin nhắn đã ghim, tệp đã chia sẻ & thành viên khi chọn hội thoại
  useEffect(() => {
    setTypingUsers([])
    setMessages([])
    setPinnedMessages([])
    setMediaItems([])
    setGroupMembers([])
    setJumpToMessageId(null)
    if (!activeConversation) {
      setShowMembersPanel(false)
      setAssetsDrawerTab(null)
      return
    }

    let isMounted = true
    async function fetchConversationData() {
      const convId = activeConversation!.id
      setIsLoadingMedia(true)
      try {
        const [history, pinned, media] = await Promise.all([
          chatService.getMessages(convId),
          chatService.getPinnedMessages(convId).catch(() => []),
          chatService.getConversationMedia(convId, 'ALL').catch(() => []),
        ])
        if (isMounted) {
          setMessages(history)
          setPinnedMessages(pinned)
          setMediaItems(media)
        }

        if (activeConversation!.type === 'GROUP') {
          const members = await chatService.getConversationMembers(convId)
          if (isMounted) {
            setGroupMembers(members)
          }
        } else {
          setGroupMembers([])
          setShowMembersPanel(false)
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu cuộc trò chuyện:', err)
      } finally {
        if (isMounted) {
          setIsLoadingMedia(false)
        }
      }
    }

    fetchConversationData()
    return () => {
      isMounted = false
    }
  }, [activeConversation?.id, activeConversation?.type])

  // 3. Xử lý nhận tin nhắn mới từ WebSocket STOMP thời gian thực
  const handleIncomingMessage = useCallback((newMsg: Message) => {
    if (newMsg.conversationId === activeConversationIdRef.current) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })

      if ((newMsg.messageType === 'IMAGE' || newMsg.messageType === 'FILE') && newMsg.fileUrl) {
        setMediaItems((prev) => {
          if (prev.some((item) => item.messageId === newMsg.id)) return prev
          const mediaItem: ConversationMediaItem = {
            messageId: newMsg.id,
            conversationId: newMsg.conversationId,
            senderId: newMsg.senderId,
            senderName: newMsg.senderName,
            senderAvatarUrl: newMsg.senderAvatarUrl,
            messageType: newMsg.messageType as 'IMAGE' | 'FILE',
            fileUrl: newMsg.fileUrl!,
            fileName: newMsg.fileName || newMsg.content,
            fileSize: newMsg.fileSize,
            createdAt: newMsg.createdAt,
          }
          return [mediaItem, ...prev]
        })
      }

      // Khi nhận được tin nhắn mới từ người đang gõ, xóa trạng thái typing của người đó
      setTypingUsers((prev) => prev.filter((t) => t.userId !== newMsg.senderId))
    }

    const basePreview =
      newMsg.messageType === 'IMAGE'
        ? `📷 [Hình ảnh] ${newMsg.content}`
        : newMsg.messageType === 'FILE'
          ? `📎 [Tệp] ${newMsg.fileName || newMsg.content}`
          : newMsg.content
    const previewText = newMsg.important ? `❗ ${basePreview}` : basePreview

    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === newMsg.conversationId) {
          return {
            ...c,
            lastMessageContent: previewText,
            lastMessageAt: newMsg.createdAt,
          }
        }
        return c
      })
      return updated.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || 0).getTime()
        const timeB = new Date(b.lastMessageAt || 0).getTime()
        return timeB - timeA
      })
    })
  }, [])

  // 4. Xử lý nhận sự kiện Typing Indicator thời gian thực
  const handleTypingEvent = useCallback((event: TypingEvent) => {
    if (!event || !event.userId) return
    setTypingUsers((prev) => {
      const filtered = prev.filter((t) => t.userId !== event.userId)
      if (event.typing) {
        return [...filtered, event]
      }
      return filtered
    })
  }, [])

  // 5. Xử lý nhận sự kiện Presence (Online/Offline/Busy/Away) thời gian thực
  const handlePresenceEvent = useCallback((event: PresenceEvent) => {
    if (!event || !event.userId) return

    setConversations((prev) =>
      prev.map((c) => {
        if (c.otherUser && c.otherUser.id === event.userId) {
          return {
            ...c,
            otherUser: { ...c.otherUser, status: event.status },
          }
        }
        return c
      })
    )

    setActiveConversation((prev) => {
      if (prev && prev.otherUser && prev.otherUser.id === event.userId) {
        return {
          ...prev,
          otherUser: { ...prev.otherUser, status: event.status },
        }
      }
      return prev
    })

    setGroupMembers((prev) =>
      prev.map((m) => (m.userId === event.userId ? { ...m, status: event.status } : m))
    )
  }, [])

  // 6. Xử lý khi được mời vào nhóm mới hoặc thông tin nhóm cập nhật theo thời gian thực
  const handleConversationUpdate = useCallback((updatedConv: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === updatedConv.id)
      const next = exists
        ? prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
        : [updatedConv, ...prev]

      return next.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || 0).getTime()
        const timeB = new Date(b.lastMessageAt || 0).getTime()
        return timeB - timeA
      })
    })

    if (updatedConv.id === activeConversationIdRef.current) {
      setActiveConversation(updatedConv)
      if (updatedConv.members) {
        setGroupMembers(updatedConv.members)
      }
    }
  }, [])

  // 7. Xử lý sự kiện Ghim / Bỏ ghim tin nhắn thời gian thực
  const handlePinEvent = useCallback((event: PinMessageEvent) => {
    if (!event || event.conversationId !== activeConversationIdRef.current) return

    setMessages((prev) =>
      prev.map((m) =>
        m.id === event.messageId
          ? {
              ...m,
              pinned: event.pinned,
              pinnedBy: event.pinnedById,
              pinnedByName: event.pinnedByName,
              pinnedAt: event.pinnedAt,
            }
          : m
      )
    )

    setPinnedMessages((prev) => {
      const withoutTarget = prev.filter((m) => m.id !== event.messageId)
      if (event.pinned && event.message) {
        return [event.message, ...withoutTarget]
      }
      return withoutTarget
    })
  }, [])

  // Lắng nghe WebSocket (Chat + Typing + Presence + Nhóm mới + Pin)
  const { sendTypingSignal } = useChatWebSocket(
    activeConversation ? activeConversation.id : null,
    token,
    handleIncomingMessage,
    handleTypingEvent,
    handlePresenceEvent,
    handleConversationUpdate,
    handlePinEvent
  )

  const handleTypingChange = useCallback(
    (typing: boolean) => {
      if (!activeConversation) return
      sendTypingSignal(typing)
      chatService.sendTypingIndicator(activeConversation.id, typing).catch(() => {})
    },
    [activeConversation, sendTypingSignal]
  )

  // Đổi trạng thái hoạt động cá nhân
  const handleChangeMyStatus = async (status: UserPresenceStatus) => {
    setMyStatus(status)
    try {
      await chatService.updateMyStatus(status)
    } catch (err) {
      console.error('Không thể cập nhật trạng thái:', err)
    }
  }

  // Gửi tin nhắn mới (hỗ trợ đính kèm hình ảnh / file & gắn cờ Quan trọng)
  const handleSendMessage = async (
    content: string,
    attachmentFile?: File | null,
    important: boolean = false
  ) => {
    if (!activeConversation) return
    setIsSending(true)
    try {
      if (attachmentFile) {
        const uploaded = await chatService.uploadFile(attachmentFile)
        const sentMsg = await chatService.sendMessage(activeConversation.id, {
          content: content || uploaded.originalFileName,
          messageType: uploaded.messageType,
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.originalFileName,
          fileSize: uploaded.fileSize,
          important,
        })
        handleIncomingMessage(sentMsg)
      } else if (content) {
        const sentMsg = await chatService.sendMessage(activeConversation.id, {
          content,
          messageType: 'TEXT',
          important,
        })
        handleIncomingMessage(sentMsg)
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err)
    } finally {
      setIsSending(false)
    }
  }

  // Ghim / Bỏ ghim một tin nhắn
  const handleTogglePinMessage = async (message: Message) => {
    if (!activeConversation) return
    try {
      const event = message.pinned
        ? await chatService.unpinMessage(activeConversation.id, message.id)
        : await chatService.pinMessage(activeConversation.id, message.id)
      handlePinEvent(event)
    } catch (err) {
      console.error('Không thể cập nhật trạng thái ghim tin nhắn:', err)
    }
  }

  const handleUnpinById = async (messageId: string) => {
    if (!activeConversation) return
    try {
      const event = await chatService.unpinMessage(activeConversation.id, messageId)
      handlePinEvent(event)
    } catch (err) {
      console.error('Không thể bỏ ghim tin nhắn:', err)
    }
  }

  // Mở/đóng Drawer bên phải (Tin nhắn đã ghim / Tệp đã chia sẻ)
  const handleOpenAssetsDrawer = (tab: 'PINNED' | 'MEDIA') => {
    setShowMembersPanel(false)
    setAssetsDrawerTab((prev) => (prev === tab ? null : tab))
  }

  const handleToggleMembersPanel = () => {
    setAssetsDrawerTab(null)
    setShowMembersPanel((prev) => !prev)
  }

  // Tìm kiếm người dùng
  const handleSearchUsers = async (query: string) => {
    setIsSearching(true)
    try {
      const results = await chatService.searchUsers(query)
      setSearchResults(results)
    } catch (err) {
      console.error('Lỗi tìm kiếm người dùng:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Bắt đầu chat 1-1 với một người dùng
  const handleStartDirectChat = async (targetUser: User) => {
    try {
      const conversation = await chatService.getOrCreateDirectConversation(targetUser.id)
      setActiveConversation(conversation)
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversation.id)
        if (!exists) {
          return [conversation, ...prev]
        }
        return prev
      })
    } catch (err) {
      console.error('Lỗi bắt đầu chat 1-1:', err)
    }
  }

  // Tạo nhóm chat mới
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const newGroup = await chatService.createGroupConversation({ name, memberIds })
    setConversations((prev) => [newGroup, ...prev])
    setActiveConversation(newGroup)
    if (newGroup.members) {
      setGroupMembers(newGroup.members)
    }
  }

  // Thêm thành viên mới vào nhóm
  const handleAddMembers = async (userIds: string[]) => {
    if (!activeConversation) return
    try {
      const updatedConv = await chatService.addGroupMembers(activeConversation.id, userIds)
      setActiveConversation(updatedConv)
      if (updatedConv.members) {
        setGroupMembers(updatedConv.members)
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      )
      const history = await chatService.getMessages(activeConversation.id)
      setMessages(history)
    } catch (err) {
      console.error('Lỗi thêm thành viên vào nhóm:', err)
    }
  }

  // Xóa thành viên hoặc rời nhóm
  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeConversation) return
    try {
      await chatService.removeGroupMember(activeConversation.id, targetUserId)

      if (targetUserId === currentUser?.id) {
        const remaining = conversations.filter((c) => c.id !== activeConversation.id)
        setConversations(remaining)
        setActiveConversation(remaining.length > 0 ? remaining[0] : null)
        setShowMembersPanel(false)
      } else {
        const updatedMembers = await chatService.getConversationMembers(activeConversation.id)
        setGroupMembers(updatedMembers)
        setActiveConversation((prev) =>
          prev ? { ...prev, memberCount: updatedMembers.length } : null
        )
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id ? { ...c, memberCount: updatedMembers.length } : c
          )
        )
        const history = await chatService.getMessages(activeConversation.id)
        setMessages(history)
      }
    } catch (err) {
      console.error('Lỗi xóa/rời nhóm:', err)
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={(conv) => setActiveConversation(conv)}
        onStartDirectChat={handleStartDirectChat}
        onOpenCreateGroup={() => setShowCreateGroupModal(true)}
        onOpenDirectory={() => setShowDirectoryModal(true)}
        currentUserStatus={myStatus}
        onChangeMyStatus={handleChangeMyStatus}
        searchResults={searchResults}
        onSearchUsers={handleSearchUsers}
        isSearching={isSearching}
      />

      <ChatWindow
        conversation={activeConversation}
        messages={messages}
        pinnedMessages={pinnedMessages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onTogglePinMessage={handleTogglePinMessage}
        onTypingChange={handleTypingChange}
        typingUsers={typingUsers}
        isSending={isSending}
        showMembersPanel={showMembersPanel}
        onToggleMembersPanel={handleToggleMembersPanel}
        assetsDrawerTab={assetsDrawerTab}
        onOpenAssetsDrawer={handleOpenAssetsDrawer}
        jumpToMessageId={jumpToMessageId}
        onClearJumpToMessage={() => setJumpToMessageId(null)}
        onPreviewFile={(file) => setPreviewFile(file)}
      />

      {activeConversation && activeConversation.type === 'GROUP' && showMembersPanel && (
        <GroupMembersPanel
          conversation={activeConversation}
          members={groupMembers}
          currentUserId={currentUser?.id}
          onClose={() => setShowMembersPanel(false)}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
          searchResults={searchResults}
          onSearchUsers={handleSearchUsers}
        />
      )}

      {activeConversation && assetsDrawerTab && (
        <ConversationAssetsDrawer
          activeTab={assetsDrawerTab}
          onTabChange={(tab) => setAssetsDrawerTab(tab)}
          pinnedMessages={pinnedMessages}
          mediaItems={mediaItems}
          isLoadingMedia={isLoadingMedia}
          onClose={() => setAssetsDrawerTab(null)}
          onJumpToMessage={(messageId) => setJumpToMessageId(messageId)}
          onUnpinMessage={handleUnpinById}
          onPreviewFile={(file) => setPreviewFile(file)}
        />
      )}

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
        searchResults={searchResults}
        onSearchUsers={handleSearchUsers}
        isSearching={isSearching}
      />

      <UserDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        onStartDirectChat={handleStartDirectChat}
      />
    </div>
  )
}
