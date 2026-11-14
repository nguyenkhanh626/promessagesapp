package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.PresenceEventDto;
import com.team17.chatapp.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // In-memory presence cache: userId -> UserStatus
    private final ConcurrentHashMap<UUID, UserStatus> presenceCache = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public PresenceEventDto updateUserStatus(UUID userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("Không tìm thấy người dùng", HttpStatus.NOT_FOUND));

        user.setStatus(status);
        User savedUser = userRepository.save(user);
        presenceCache.put(userId, status);

        PresenceEventDto event = PresenceEventDto.from(savedUser);
        messagingTemplate.convertAndSend("/topic/presence", event);

        log.info("Đã cập nhật và broadcast trạng thái người dùng {} ({}) -> {}",
                savedUser.getEmail(), userId, status);
        return event;
    }

    @Override
    @Transactional
    public PresenceEventDto handleUserConnected(String emailOrUsername) {
        if (emailOrUsername == null || emailOrUsername.startsWith("Anonymous")) {
            return null;
        }
        Optional<User> userOpt = userRepository.findByEmail(emailOrUsername);
        if (userOpt.isEmpty()) {
            return null;
        }

        User user = userOpt.get();
        UserStatus currentCached = presenceCache.get(user.getId());
        // Nếu người dùng chưa đặt BUSY hoặc AWAY thủ công thì chuyển sang ONLINE
        UserStatus targetStatus = (currentCached == UserStatus.BUSY || currentCached == UserStatus.AWAY)
                ? currentCached
                : UserStatus.ONLINE;

        user.setStatus(targetStatus);
        User savedUser = userRepository.save(user);
        presenceCache.put(user.getId(), targetStatus);

        PresenceEventDto event = PresenceEventDto.from(savedUser);
        messagingTemplate.convertAndSend("/topic/presence", event);
        return event;
    }

    @Override
    @Transactional
    public PresenceEventDto handleUserDisconnected(String emailOrUsername) {
        if (emailOrUsername == null || emailOrUsername.startsWith("Anonymous")) {
            return null;
        }
        Optional<User> userOpt = userRepository.findByEmail(emailOrUsername);
        if (userOpt.isEmpty()) {
            return null;
        }

        User user = userOpt.get();
        user.setStatus(UserStatus.OFFLINE);
        User savedUser = userRepository.save(user);
        presenceCache.put(user.getId(), UserStatus.OFFLINE);

        PresenceEventDto event = PresenceEventDto.from(savedUser);
        messagingTemplate.convertAndSend("/topic/presence", event);
        return event;
    }

    @Override
    public UserStatus getUserStatus(UUID userId, UserStatus fallbackStatus) {
        if (userId == null) {
            return fallbackStatus != null ? fallbackStatus : UserStatus.OFFLINE;
        }
        return presenceCache.getOrDefault(userId, fallbackStatus != null ? fallbackStatus : UserStatus.OFFLINE);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDto> getUserDirectory(UUID currentUserId, String query, UserStatus statusFilter) {
        List<User> users;
        if (query == null || query.isBlank()) {
            users = userRepository.findTop20ByIdNotOrderByDisplayNameAsc(currentUserId);
        } else {
            users = userRepository.searchUsers(query.trim(), currentUserId);
        }

        return users.stream()
                .map(u -> {
                    UserDto dto = UserDto.from(u);
                    UserStatus effectiveStatus = getUserStatus(u.getId(), u.getStatus());
                    dto.setStatus(effectiveStatus);
                    return dto;
                })
                .filter(dto -> statusFilter == null || dto.getStatus() == statusFilter)
                .sorted(Comparator.comparing((UserDto dto) -> dto.getStatus() == UserStatus.OFFLINE)
                        .thenComparing(dto -> dto.getDisplayName() != null ? dto.getDisplayName() : ""))
                .collect(Collectors.toList());
    }
}
