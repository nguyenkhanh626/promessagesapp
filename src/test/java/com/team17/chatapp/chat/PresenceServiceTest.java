package com.team17.chatapp.chat;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.chat.dto.PresenceEventDto;
import com.team17.chatapp.chat.service.PresenceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PresenceServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private PresenceServiceImpl presenceService;

    private UUID userId;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        sampleUser = User.builder()
                .email("user1@example.com")
                .displayName("Nguyen Van A")
                .status(UserStatus.ONLINE)
                .role(Role.ROLE_USER)
                .build();
        sampleUser.setId(userId);
    }

    @Test
    @DisplayName("Tuần 4: Cập nhật trạng thái BUSY và broadcast qua kênh /topic/presence")
    void testUpdateUserStatus_BroadcastsPresence() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        PresenceEventDto event = presenceService.updateUserStatus(userId, UserStatus.BUSY);

        assertNotNull(event);
        assertEquals(UserStatus.BUSY, event.getStatus());
        assertEquals(userId, event.getUserId());
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), any(PresenceEventDto.class));
    }

    @Test
    @DisplayName("Tuần 4: Xử lý ngắt kết nối WebSocket chuyển trạng thái về OFFLINE")
    void testHandleUserDisconnected_SetsOffline() {
        when(userRepository.findByEmail("user1@example.com")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        PresenceEventDto event = presenceService.handleUserDisconnected("user1@example.com");

        assertNotNull(event);
        assertEquals(UserStatus.OFFLINE, event.getStatus());
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), any(PresenceEventDto.class));
    }

    @Test
    @DisplayName("Tuần 4: Lấy danh bạ người dùng kèm bộ lọc trạng thái ONLINE")
    void testGetUserDirectory_FilteredByStatus() {
        UUID currentUserId = UUID.randomUUID();
        when(userRepository.findTop20ByIdNotOrderByDisplayNameAsc(currentUserId))
                .thenReturn(List.of(sampleUser));

        List<UserDto> directory = presenceService.getUserDirectory(currentUserId, "", UserStatus.ONLINE);

        assertNotNull(directory);
        assertEquals(1, directory.size());
        assertEquals("Nguyen Van A", directory.get(0).getDisplayName());
        assertEquals(UserStatus.ONLINE, directory.get(0).getStatus());
    }
}
