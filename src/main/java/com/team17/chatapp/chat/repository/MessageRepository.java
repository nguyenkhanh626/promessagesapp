package com.team17.chatapp.chat.repository;

import com.team17.chatapp.chat.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId " +
           "AND m.messageType <> com.team17.chatapp.chat.entity.MessageType.SYSTEM " +
           "AND LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchMessagesInConversation(
            @Param("conversationId") UUID conversationId,
            @Param("keyword") String keyword
    );

    @Query("SELECT m FROM Message m WHERE m.conversationId IN (" +
           "SELECT cm.conversationId FROM ConversationMember cm WHERE cm.userId = :userId" +
           ") AND m.messageType <> com.team17.chatapp.chat.entity.MessageType.SYSTEM " +
           "AND LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchMessagesForUser(
            @Param("userId") UUID userId,
            @Param("keyword") String keyword
    );
}
