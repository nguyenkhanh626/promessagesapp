package com.team17.chatapp.chat.repository;

import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c JOIN ConversationMember cm ON c.id = cm.conversationId " +
           "WHERE cm.userId = :userId " +
           "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    List<Conversation> findConversationsByUserId(@Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c " +
           "JOIN ConversationMember cm1 ON c.id = cm1.conversationId " +
           "JOIN ConversationMember cm2 ON c.id = cm2.conversationId " +
           "WHERE c.type = :type AND cm1.userId = :user1Id AND cm2.userId = :user2Id")
    Optional<Conversation> findDirectConversationBetweenUsers(
            @Param("type") ConversationType type,
            @Param("user1Id") UUID user1Id,
            @Param("user2Id") UUID user2Id
    );
}

