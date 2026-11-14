package com.team17.chatapp.chat.service;

import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.chat.dto.PresenceEventDto;

import java.util.List;
import java.util.UUID;

public interface PresenceService {

    PresenceEventDto updateUserStatus(UUID userId, UserStatus status);

    PresenceEventDto handleUserConnected(String emailOrUsername);

    PresenceEventDto handleUserDisconnected(String emailOrUsername);

    UserStatus getUserStatus(UUID userId, UserStatus fallbackStatus);

    List<UserDto> getUserDirectory(UUID currentUserId, String query, UserStatus statusFilter);
}
