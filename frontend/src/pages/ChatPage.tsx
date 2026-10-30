import React, { useCallback, useEffect, useState } from 'react'
import { ChatSidebar } from '../components/chat/ChatSidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { chatService } from '../services/chatService'
import { useAuth } from '../context/AuthContext'
import { useChatWebSocket } from '../hooks/useChatWebSocket'
import type { Conversation, Message } from '../types/chat'
import type { User } from '../types/auth'

export const ChatPage: React.FC = () => {
  const { user: currentUser, token } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
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

  // 2. Tải lịch sử tin nhắn khi chọn một cuộc trò chuyện
  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }

    let isMounted = true
    async function fetchMessages() {
      try {
        const history = await chatService.getMessages(activeConversation!.id)
        if (isMounted) {
          setMessages(history)
        }
      } catch (err) {
        console.error('Không thể tải tin nhắn:', err)
      }
    }

    fetchMessages()
    return () => {
      isMounted = false
    }
  }, [activeConversation?.id])

  // 3. Xử lý nhận tin nhắn mới từ WebSocket STOMP thời gian thực
  const handleIncomingMessage = useCallback((newMsg: Message) => {
    setMessages((prev) => {
      // Tránh trùng lặp id
      if (prev.some((m) => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })

    // Cập nhật tin nhắn gần nhất và đưa conversation lên đầu sidebar
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === newMsg.conversationId) {
          return {
            ...c,
            lastMessageContent: newMsg.content,
            lastMessageAt: newMsg.createdAt,
          }
        }
        return c
      })
      // Sắp xếp lại theo thời gian tin nhắn mới nhất
      return updated.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || 0).getTime()
        const timeB = new Date(b.lastMessageAt || 0).getTime()
        return timeB - timeA
      })
    })
  }, [])

  // Lắng nghe WebSocket
  useChatWebSocket(activeConversation ? activeConversation.id : null, token, handleIncomingMessage)

  // 4. Gửi tin nhắn mới
  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return
    setIsSending(true)
    try {
      const sentMsg = await chatService.sendMessage(activeConversation.id, { content })
      handleIncomingMessage(sentMsg)
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err)
    } finally {
      setIsSending(false)
    }
  }

  // 5. Tìm kiếm người dùng để bắt đầu chat
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

  // 6. Bắt đầu chat 1-1 với một người dùng từ tìm kiếm
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

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={(conv) => setActiveConversation(conv)}
        onStartDirectChat={handleStartDirectChat}
        searchResults={searchResults}
        onSearchUsers={handleSearchUsers}
        isSearching={isSearching}
      />
      <ChatWindow
        conversation={activeConversation}
        messages={messages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        isSending={isSending}
      />
    </div>
  )
}

