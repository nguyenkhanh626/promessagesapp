package com.team17.chatapp.auth.service;

import com.team17.chatapp.auth.dto.AuthResponse;
import com.team17.chatapp.auth.dto.LoginRequest;
import com.team17.chatapp.auth.dto.RegisterRequest;
import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.User;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.repository.UserRepository;
import com.team17.chatapp.exception.AppException;
import com.team17.chatapp.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException("Email này đã được sử dụng. Vui lòng chọn email khác.", HttpStatus.CONFLICT);
        }

        String avatarUrl = request.getAvatarUrl();
        if (avatarUrl == null || avatarUrl.isBlank()) {
            avatarUrl = "https://ui-avatars.com/api/?name=" + 
                    request.getDisplayName().replace(" ", "+") + 
                    "&background=5B5FC7&color=fff&bold=true";
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName().trim())
                .avatarUrl(avatarUrl)
                .status(UserStatus.ONLINE)
                .role(Role.ROLE_USER)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Đăng ký người dùng mới thành công: {} ({})", savedUser.getEmail(), savedUser.getId());

        String token = jwtTokenProvider.generateToken(savedUser);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs())
                .user(UserDto.from(savedUser))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        User user = (User) authentication.getPrincipal();
        user.setStatus(UserStatus.ONLINE);
        userRepository.save(user);

        log.info("Người dùng đăng nhập thành công: {}", user.getEmail());

        String token = jwtTokenProvider.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs())
                .user(UserDto.from(user))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin người dùng", HttpStatus.NOT_FOUND));

        return UserDto.from(user);
    }

    @Override
    @Transactional
    public void logout(String email) {
        if (email != null && !email.isBlank()) {
            userRepository.findByEmail(email.trim().toLowerCase()).ifPresent(user -> {
                user.setStatus(UserStatus.OFFLINE);
                userRepository.save(user);
                log.info("Người dùng đăng xuất, cập nhật trạng thái OFFLINE: {}", email);
            });
        }
    }
}

