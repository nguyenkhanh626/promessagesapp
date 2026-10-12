package com.team17.chatapp.controller;

import com.team17.chatapp.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> healthCheck() {
        Map<String, String> healthData = Map.of(
                "status", "UP",
                "app", "ProMessagesApp - Teams Clone",
                "version", "1.0.0"
        );
        return ResponseEntity.ok(ApiResponse.success("Hệ thống hoạt động bình thường", healthData));
    }
}

