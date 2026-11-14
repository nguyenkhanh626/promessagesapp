import React, { useCallback, useEffect, useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { CreateGroupModal } from '../components/chat/CreateGroupModal'
import { GroupMembersPanel } from '../components/chat/GroupMembersPanel'
import { UserDirectoryModal } from '../components/chat/UserDirectoryModal'
import { chatService } from '../services/chatService'
import { useAuth } from '../context/AuthContext'
import { useChatWebSocket } from '../hooks/useChatWebSocket'
import type {
  Conversation,
  ConversationMember,
  Message,
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
  const [groupMembers, setGroupMembers] = useState<ConversationMember[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([])
  const [myStatus, setMyStatus] = useState<UserPresenceStatus>(
    (currentUser?.status as UserPresenceStatus) || 'ONLINE'
  )
  const [showMembersPanel, setShowMembersPanel] = useState(false)
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

  // 2. Tải lịch sử tin nhắn và danh sách thành viên khi chọn một cuộc trò chuyện
  useEffect(() => {
    setTypingUsers([])
    if (!activeConversation) {
      setMessages([])
      setGroupMembers([])
      setShowMembersPanel(false)
      return
    }

    let isMounted = true
    async function fetchConversationData() {
      try {
        const history = await chatService.getMessages(activeConversation!.id)
        if (isMounted) {
          setMessages(history)
        }

        if (activeConversation!.type === 'GROUP') {
          const members = await chatService.getConversationMembers(activeConversation!.id)
          if (isMounted) {
            setGroupMembers(members)
          }
        } else {
          setGroupMembers([])
          setShowMembersPanel(false)
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu cuộc trò chuyện:', err)
      }
    }

    fetchConversationData()
    return () => {
      isMounted = false
    }
  }, [activeConversation?.id, activeConversation?.type])

  // 3. Xử lý nhận tin nhắn mới từ WebSocket STOMP thời gian thực
  const handleIncomingMessage = useCallback((newMsg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })

    // Khi nhận được tin nhắn mới từ người đang gõ, xóa trạng thái typing của người đó
    setTypingUsers((prev) => prev.filter((t) => t.userId !== newMsg.senderId))

    const previewText =
      newMsg.messageType === 'IMAGE'
        ? `📷 [Hình ảnh] ${newMsg.content}`
        : newMsg.messageType === 'FILE'
          ? `📎 [Tệp] ${newMsg.fileName || newMsg.content}`
          : newMsg.content

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

  // Lắng nghe WebSocket (Chat + Typing + Presence)
  const { sendTypingSignal } = useChatWebSocket(
    activeConversation ? activeConversation.id : null,
    token,
    handleIncomingMessage,
    handleTypingEvent,
    handlePresenceEvent
  )

  const handleTypingChange = useCallback(
    (typing: boolean) => {
      if (!activeConversation) return
      sendTypingSignal(typing)
      chatService.sendTypingIndicator(activeConversation.id, typing).catch(() => {})
    },
    [activeConversation, sendTypingSignal]
  )

  // 6. Đổi trạng thái hoạt động cá nhân
  const handleChangeMyStatus = async (status: UserPresenceStatus) => {
    setMyStatus(status)
    try {
      await chatService.updateMyStatus(status)
    } catch (err) {
      console.error('Không thể cập nhật trạng thái:', err)
    }
  }

  // 7. Gửi tin nhắn mới (hỗ trợ đính kèm hình ảnh / file)
  const handleSendMessage = async (content: string, attachmentFile?: File | null) => {
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
        })
        handleIncomingMessage(sentMsg)
      } else if (content) {
        const sentMsg = await chatService.sendMessage(activeConversation.id, {
          content,
          messageType: 'TEXT',
        })
        handleIncomingMessage(sentMsg)
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err)
    } finally {
      setIsSending(false)
    }
  }

  // 8. Tìm kiếm người dùng
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

  // 9. Bắt đầu chat 1-1 với một người dùng
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

  // 10. Tạo nhóm chat mới
  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const newGroup = await chatService.createGroupConversation({ name, memberIds })
    setConversations((prev) => [newGroup, ...prev])
    setActiveConversation(newGroup)
    if (newGroup.members) {
      setGroupMembers(newGroup.members)
    }
  }

  // 11. Thêm thành viên mới vào nhóm
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

  // 12. Xóa thành viên hoặc rời nhóm
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
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onTypingChange={handleTypingChange}
        typingUsers={typingUsers}
        isSending={isSending}
        showMembersPanel={showMembersPanel}
        onToggleMembersPanel={() => setShowMembersPanel((prev) => !prev)}
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
