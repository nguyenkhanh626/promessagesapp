package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.chat.dto.AddGroupMembersRequest;
import com.team17.chatapp.chat.dto.ConversationDto;
import com.team17.chatapp.chat.dto.ConversationMediaDto;
import com.team17.chatapp.chat.dto.ConversationMemberDto;
import com.team17.chatapp.chat.dto.CreateGroupConversationRequest;
import com.team17.chatapp.chat.dto.MessageDto;
import com.team17.chatapp.chat.dto.PagedMessagesDto;
import com.team17.chatapp.chat.dto.PinMessageEventDto;
import com.team17.chatapp.chat.dto.ReactionEventDto;
import com.team17.chatapp.chat.dto.SendMessageRequest;
import com.team17.chatapp.chat.dto.UpdateGroupConversationRequest;
import com.team17.chatapp.chat.entity.MessageType;
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

    PagedMessagesDto getPagedMessages(UUID conversationId, UUID currentUserId, int page, int size);

    List<MessageDto> getAllMessagesAsc(UUID conversationId, UUID currentUserId);

    List<MessageDto> searchMessagesInConversation(UUID conversationId, UUID currentUserId, String keyword);

    List<MessageDto> searchAllMyMessages(UUID currentUserId, String keyword);

    PinMessageEventDto togglePinMessage(UUID conversationId, UUID messageId, UUID requesterId, boolean pin);

    List<MessageDto> getPinnedMessages(UUID conversationId, UUID currentUserId);

    ReactionEventDto toggleMessageReaction(UUID conversationId, UUID messageId, UUID userId, String emoji);

    List<ConversationMediaDto> getConversationMedia(UUID conversationId, UUID currentUserId, MessageType filterType);

    MessageDto saveMessage(UUID conversationId, UUID senderId, SendMessageRequest request);

    List<UserDto> searchUsers(String query, UUID currentUserId);
}
