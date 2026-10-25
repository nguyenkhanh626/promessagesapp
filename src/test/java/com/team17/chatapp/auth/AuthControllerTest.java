package com.team17.chatapp.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.team17.chatapp.auth.controller.AuthController;
import com.team17.chatapp.auth.dto.AuthResponse;
import com.team17.chatapp.auth.dto.LoginRequest;
import com.team17.chatapp.auth.dto.RegisterRequest;
import com.team17.chatapp.auth.dto.UserDto;
import com.team17.chatapp.auth.entity.Role;
import com.team17.chatapp.auth.entity.UserStatus;
import com.team17.chatapp.auth.service.AuthService;
import com.team17.chatapp.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private AuthResponse sampleAuthResponse;
    private UserDto sampleUserDto;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleUserDto = UserDto.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .displayName("Nguyen Van A")
                .avatarUrl("https://example.com/avatar.png")
                .status(UserStatus.ONLINE)
                .role(Role.ROLE_USER)
                .createdAt(LocalDateTime.now())
                .build();

        sampleAuthResponse = AuthResponse.builder()
                .token("mocked.jwt.token")
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .user(sampleUserDto)
                .build();
    }

    @Test
    @DisplayName("API POST /api/auth/register trả về 201 Created và AuthResponse")
    void testRegisterEndpoint() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .displayName("Nguyen Van A")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(sampleAuthResponse);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.data.user.email").value("test@example.com"));
    }

    @Test
    @DisplayName("API POST /api/auth/login trả về 200 OK và AuthResponse")
    void testLoginEndpoint() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(sampleAuthResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.data.user.displayName").value("Nguyen Van A"));
    }

    @Test
    @DisplayName("API GET /api/auth/me trả về 200 OK với thông tin người dùng")
    void testGetCurrentUserEndpoint() throws Exception {
        when(authService.getCurrentUser("test@example.com")).thenReturn(sampleUserDto);

        UsernamePasswordAuthenticationToken principal =
                new UsernamePasswordAuthenticationToken("test@example.com", null);

        mockMvc.perform(get("/api/auth/me").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.displayName").value("Nguyen Van A"));
    }

    @Test
    @DisplayName("Validation Error khi gửi request rỗng")
    void testRegister_ValidationError() throws Exception {
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .email("invalid-email")
                .password("123")
                .displayName("")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation error"));
    }
}

