package com.team17.chatapp.ai;

import com.team17.chatapp.ai.dto.AiPromptRequest;
import com.team17.chatapp.ai.service.AiClientService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.springframework.http.HttpMethod.POST;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiClientServiceTest {

    @Test
    void reportsGeminiAsNotConfiguredWhenApiKeyIsMissing() {
        AiClientService service = new AiClientService(RestClient.create(), "", "gemini-3.5-flash-lite");

        assertFalse(service.testConnection().healthy());
        assertEquals("NOT_CONFIGURED", service.testConnection().status());
        assertEquals(
                "UNAVAILABLE",
                service.sendPrompt(new AiPromptRequest("Hello", null)).status());
    }

    @Test
    void parsesGeminiPromptResponse() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://gemini.test/v1beta");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://gemini.test/v1beta/models/test-model:generateContent?key=test-key"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "candidates": [{
                            "content": {"parts": [{"text": "Hello from Gemini"}]}
                          }],
                          "usageMetadata": {"totalTokenCount": 7}
                        }
                        """, MediaType.APPLICATION_JSON));
        AiClientService service = new AiClientService(builder.build(), "test-key", "test-model");

        var response = service.sendPrompt(new AiPromptRequest("Hello", null));

        assertEquals("OK", response.status());
        assertEquals("Hello from Gemini", response.reply());
        assertEquals(7, response.tokensUsed());
        server.verify();
    }
}
