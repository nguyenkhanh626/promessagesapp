package com.team17.chatapp.chat.repository;

import com.team17.chatapp.chat.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {

    List<MessageReaction> findByMessageId(UUID messageId);

    List<MessageReaction> findByMessageIdIn(Collection<UUID> messageIds);

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(UUID messageId, UUID userId, String emoji);
}
