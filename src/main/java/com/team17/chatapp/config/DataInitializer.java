package com.team17.chatapp.config;

import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.entity.Conversation;
import com.team17.chatapp.chat.entity.ConversationMember;
import com.team17.chatapp.chat.entity.ConversationType;
import com.team17.chatapp.chat.entity.MemberRole;
import com.team17.chatapp.chat.entity.Message;
import com.team17.chatapp.chat.entity.MessageType;
import com.team17.chatapp.chat.repository.ConversationMemberRepository;
import com.team17.chatapp.chat.repository.ConversationRepository;
import com.team17.chatapp.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessageRepository messageRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and seeding default user accounts...");

        User user1 = initUser(
                "user1@gmail.com",
                "Password123!",
                "Hoàng Phúc Hưng",
                "https://ui-avatars.com/api/?name=Hoàng+Phúc+Hưng&background=5B5FC7&color=fff&bold=true"
        );

        User user2 = initUser(
                "user2@gmail.com",
                "Password123!",
                "Nguyễn Thị B",
                "https://ui-avatars.com/api/?name=Nguyễn+Thị+B&background=008080&color=fff&bold=true"
        );

        if (user1 != null && user2 != null) {
            initSampleConversation(user1, user2);
        }

        log.info("Default user accounts initialization completed.");
    }

    private User initUser(String email, String rawPassword, String displayName, String avatarUrl) {
        String normalizedEmail = email.trim().toLowerCase();
        return userRepository.findByEmail(normalizedEmail)
                .map(existingUser -> {
                    existingUser.setPasswordHash(passwordEncoder.encode(rawPassword));
                    existingUser.setDisplayName(displayName);
                    if (existingUser.getAvatarUrl() == null || existingUser.getAvatarUrl().isBlank()) {
                        existingUser.setAvatarUrl(avatarUrl);
                    }
                    existingUser.setStatus(UserStatus.OFFLINE);
                    existingUser.setRole(Role.ROLE_USER);
                    User updated = userRepository.save(existingUser);
                    log.info("Updated password & profile for sample user: {}", normalizedEmail);
                    return updated;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(normalizedEmail)
                            .passwordHash(passwordEncoder.encode(rawPassword))
                            .displayName(displayName)
                            .avatarUrl(avatarUrl)
                            .status(UserStatus.OFFLINE)
                            .role(Role.ROLE_USER)
                            .build();
                    User saved = userRepository.save(newUser);
                    log.info("Created new sample user: {}", normalizedEmail);
                    return saved;
                });
    }

    private void initSampleConversation(User user1, User user2) {
        var existingConv = conversationRepository.findDirectConversationBetweenUsers(
                ConversationType.DIRECT, user1.getId(), user2.getId()
        );

        if (existingConv.isEmpty()) {
            Conversation conversation = Conversation.builder()
                    .type(ConversationType.DIRECT)
                    .lastMessageContent("Chào bạn! Chúc một ngày làm việc hiệu quả.")
                    .lastMessageAt(LocalDateTime.now())
                    .build();
            Conversation savedConv = conversationRepository.save(conversation);

            ConversationMember member1 = ConversationMember.builder()
                    .conversationId(savedConv.getId())
                    .userId(user1.getId())
                    .role(MemberRole.ADMIN)
                    .joinedAt(LocalDateTime.now())
                    .build();

            ConversationMember member2 = ConversationMember.builder()
                    .conversationId(savedConv.getId())
                    .userId(user2.getId())
                    .role(MemberRole.MEMBER)
                    .joinedAt(LocalDateTime.now())
                    .build();

            conversationMemberRepository.save(member1);
            conversationMemberRepository.save(member2);

            Message sampleMessage = Message.builder()
                    .conversationId(savedConv.getId())
                    .senderId(user1.getId())
                    .content("Chào bạn! Chúc một ngày làm việc hiệu quả.")
                    .messageType(MessageType.TEXT)
                    .build();
            messageRepository.save(sampleMessage);

            log.info("Created sample direct conversation between {} and {}", user1.getEmail(), user2.getEmail());
        }
    }
}

