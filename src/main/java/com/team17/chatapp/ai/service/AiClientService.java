package com.team17.chatapp.ai.service;

import com.team17.chatapp.ai.dto.AiHealthResponse;
import com.team17.chatapp.ai.dto.AiPromptRequest;
import com.team17.chatapp.ai.dto.AiPromptResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiClientService {

    private static final String UNAVAILABLE_REPLY =
            "Trợ lý AI hiện chưa thể kết nối. Vui lòng thử lại sau.";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public AiClientService(
            RestClient geminiRestClient,
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-3.5-flash-lite}") String model) {
        this.restClient = geminiRestClient;
        this.apiKey = apiKey;
        this.model = model;
    }

    public AiHealthResponse testConnection() {
        if (!isConfigured()) {
            return new AiHealthResponse(
                    false,
                    "NOT_CONFIGURED",
                    model,
                    "Gemini chưa được cấu hình. Hãy đặt biến môi trường GEMINI_API_KEY.");
        }

        try {
            restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/{model}")
                            .queryParam("key", apiKey)
                            .build(model))
                    .retrieve()
                    .toBodilessEntity();
            return new AiHealthResponse(true, "ACTIVE", model, "Gemini đang hoạt động.");
        } catch (RestClientResponseException exception) {
            log.warn("Gemini health check failed for model {} with HTTP status {}", model, exception.getStatusCode());
            return new AiHealthResponse(
                    false,
                    "UNAVAILABLE",
                    model,
                    "Gemini từ chối yêu cầu. Hãy kiểm tra API key, model hoặc hạn mức sử dụng.");
        } catch (RestClientException exception) {
            log.warn("Gemini health check failed for model {} ({})", model, exception.getClass().getSimpleName());
            return new AiHealthResponse(
                    false,
                    "UNAVAILABLE",
                    model,
                    "Không thể kết nối Gemini. Hãy kiểm tra API key, model hoặc hạn mức sử dụng.");
        }
    }

    public AiPromptResponse sendPrompt(AiPromptRequest request) {
        if (!isConfigured()) {
            return unavailableResponse();
        }

        String prompt = request.prompt();
        if (request.context() != null && !request.context().isBlank()) {
            prompt = "Context:\n" + request.context() + "\n\nQuestion:\n" + prompt;
        }

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        try {
            JsonNode response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/{model}:generateContent")
                            .queryParam("key", apiKey)
                            .build(model))
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode textNode = response == null
                    ? null
                    : response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (textNode == null || !textNode.isTextual() || textNode.asText().isBlank()) {
                return unavailableResponse();
            }

            JsonNode tokenNode = response.path("usageMetadata").path("totalTokenCount");
            Integer tokensUsed = tokenNode.canConvertToInt() ? tokenNode.intValue() : null;
            return new AiPromptResponse(textNode.asText(), "OK", tokensUsed);
        } catch (RestClientResponseException exception) {
            log.warn("Gemini prompt request failed for model {} with HTTP status {}", model, exception.getStatusCode());
            return unavailableResponse();
        } catch (RestClientException exception) {
            log.warn("Gemini prompt request failed for model {} ({})", model, exception.getClass().getSimpleName());
            return unavailableResponse();
        }
    }

    private boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    private AiPromptResponse unavailableResponse() {
        return new AiPromptResponse(UNAVAILABLE_REPLY, "UNAVAILABLE", null);
    }
}
