package com.team17.chatapp.auth.service;

import com.team17.chatapp.auth.dto.AuthResponse;
import com.team17.chatapp.auth.dto.LoginRequest;
import com.team17.chatapp.auth.dto.RegisterRequest;
import com.team17.chatapp.auth.dto.UserDto;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserDto getCurrentUser(String email);

    void logout(String email);
}

