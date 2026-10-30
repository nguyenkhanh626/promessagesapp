package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface ChatService {

    List<ConversationDto> getUserConversations(UUID currentUserId);

    ConversationDto getOrCreateDirectConversation(UUID currentUserId, UUID targetUserId);

    ConversationDto getConversationById(UUID conversationId, UUID currentUserId);

    Page<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, int page, int size);

    List<MessageDto> getAllMessagesAsc(UUID conversationId, UUID currentUserId);

    MessageDto saveMessage(UUID conversationId, UUID senderId, SendMessageRequest request);

    List<UserDto> searchUsers(String query, UUID currentUserId);
}

