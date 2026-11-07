package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.chat.dto.AddGroupMembersRequest;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.ConversationMemberDto;
import com.team17.chatapp.chat.dto.CreateGroupConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.dto.UpdateGroupConversationRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface ChatService {

    List<ConversationDto> getUserConversations(UUID currentUserId);

    ConversationDto getOrCreateDirectConversation(UUID currentUserId, UUID targetUserId);

    ConversationDto createGroupConversation(UUID creatorId, CreateGroupConversationRequest request);

    ConversationDto updateGroupConversation(UUID conversationId, UUID requesterId, UpdateGroupConversationRequest request);

    ConversationDto getConversationById(UUID conversationId, UUID currentUserId);

    List<ConversationMemberDto> getConversationMembers(UUID conversationId, UUID currentUserId);

    ConversationDto addMembersToGroup(UUID conversationId, UUID requesterId, AddGroupMembersRequest request);

    void removeMemberFromGroup(UUID conversationId, UUID requesterId, UUID targetUserId);

    Page<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, int page, int size);

    List<MessageDto> getAllMessagesAsc(UUID conversationId, UUID currentUserId);

    MessageDto saveMessage(UUID conversationId, UUID senderId, SendMessageRequest request);

    List<UserDto> searchUsers(String query, UUID currentUserId);
}
