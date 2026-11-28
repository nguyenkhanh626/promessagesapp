package com.team17.chatapp.config;

import com.team17.chatapp.calling.dto.IceServerDto;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "app.webrtc")
public class IceServerConfigProperties {

    private List<String> stunUrls = List.of(
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:localhost:3478"
    );
    private String turnUrl = "turn:localhost:3478";
    private String turnUsername = "promessages";
    private String turnCredential = "promessages123";

    public List<IceServerDto> toIceServerDtos() {
        List<IceServerDto> servers = new ArrayList<>();
        if (stunUrls != null && !stunUrls.isEmpty()) {
            servers.add(IceServerDto.builder()
                    .urls(stunUrls)
                    .build());
        }
        if (turnUrl != null && !turnUrl.isBlank()) {
            servers.add(IceServerDto.builder()
                    .urls(List.of(turnUrl.trim()))
                    .username(turnUsername)
                    .credential(turnCredential)
                    .build());
        }
        return servers;
    }
}
