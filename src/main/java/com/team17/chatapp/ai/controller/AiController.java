package com.team17.chatapp.ai.controller;

import com.team17.chatapp.ai.dto.AiHealthResponse;
import com.team17.chatapp.ai.dto.AiPromptRequest;
import com.team17.chatapp.ai.dto.AiPromptResponse;
import com.team17.chatapp.ai.service.AiClientService;
import com.team17.chatapp.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiClientService aiClientService;

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<AiHealthResponse>> health() {
        AiHealthResponse health = aiClientService.testConnection();
        return ResponseEntity.ok(ApiResponse.success(health));
    }

    @PostMapping("/test-prompt")
    public ResponseEntity<ApiResponse<AiPromptResponse>> testPrompt(
            @Valid @RequestBody AiPromptRequest request) {
        AiPromptResponse response = aiClientService.sendPrompt(request);
        if (!"OK".equals(response.status())) {
            ApiResponse<AiPromptResponse> error = ApiResponse.<AiPromptResponse>builder()
                    .success(false)
                    .message(response.reply())
                    .data(response)
                    .build();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
