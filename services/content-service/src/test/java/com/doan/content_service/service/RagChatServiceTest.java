package com.doan.content_service.service;

import com.doan.content_service.dto.ChatRequest;
import com.doan.content_service.dto.ChatResponse;
import com.doan.content_service.model.Content;
import com.doan.content_service.repository.ContentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RagChatServiceTest {

    private static final String CHAT_API_URL =
            "https://chat.example.test/v1/chat/completions";

    @Test
    void answersUsingTheSelectedPoiAsRetrievedContext() {
        ContentRepository repository = mock(ContentRepository.class);
        when(repository.findAll()).thenReturn(List.of(place()));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(CHAT_API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(content().string(containsString("Tượng Quan Âm")))
                .andRespond(withSuccess(
                        """
                        {"choices":[{"message":{"content":"Tượng Quan Âm cao 67 mét."}}]}
                        """,
                        MediaType.APPLICATION_JSON));

        RagChatService service = new RagChatService(repository, builder.build());
        configureProvider(service);

        ChatResponse response = service.answer(
                new ChatRequest("Tượng Quan Âm cao bao nhiêu?", "vi", "poi-1"));

        assertThat(response.answer()).isEqualTo("Tượng Quan Âm cao 67 mét.");
        assertThat(response.sources()).containsExactly("Chùa Linh Ứng");
        server.verify();
    }

    @Test
    void returnsGroundedNoMatchWithoutCallingTheProvider() {
        ContentRepository repository = mock(ContentRepository.class);
        Content flowerPlace = place();
        flowerPlace.setBody("Hoa nở gần chùa.");
        when(repository.findAll()).thenReturn(List.of(flowerPlace));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RagChatService service = new RagChatService(repository, builder.build());
        configureProvider(service);

        ChatResponse response = service.answer(
                new ChatRequest("Thông tin về sao Hỏa?", "vi", null));

        assertThat(response.answer())
                .isEqualTo("Hiện chưa có thông tin chính thức về câu hỏi này. "
                        + "Bạn vui lòng hỏi thêm nhân viên trực tại chùa.");
        assertThat(response.sources()).isEmpty();
        server.verify();
    }

    @Test
    void answersFromRetrievedContentWithoutAnApiKey() {
        ContentRepository repository = mock(ContentRepository.class);
        when(repository.findAll()).thenReturn(List.of(place()));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RagChatService service = new RagChatService(repository, builder.build());
        ReflectionTestUtils.setField(service, "apiKey", " ");

        ChatResponse response = service.answer(
                new ChatRequest("Tượng Quan Âm ở đâu?", "vi", "poi-1"));

        assertThat(response.answer())
                .contains("Chùa Linh Ứng", "Bán đảo Sơn Trà", "Tượng Quan Âm cao 67 mét.");
        assertThat(response.sources()).containsExactly("Chùa Linh Ứng");
        server.verify();
    }

    @Test
    void doesNotUseSelectedPoiForAnUnrelatedQuestion() {
        ContentRepository repository = mock(ContentRepository.class);
        when(repository.findAll()).thenReturn(List.of(place()));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RagChatService service = new RagChatService(repository, builder.build());
        ReflectionTestUtils.setField(service, "apiKey", "");

        ChatResponse response = service.answer(
                new ChatRequest("kk", "vi", "poi-1"));

        assertThat(response.answer())
                .isEqualTo("Hiện chưa có thông tin chính thức về câu hỏi này. "
                        + "Bạn vui lòng hỏi thêm nhân viên trực tại chùa.");
        assertThat(response.sources()).isEmpty();
        server.verify();
    }

    @Test
    void answersWithOnlyTheBestPoiMatchWithoutAnApiKey() {
        ContentRepository repository = mock(ContentRepository.class);
        Content gateway = new Content();
        gateway.setId("poi-gateway");
        gateway.setTitle("Cổng Tam Quan");
        gateway.setBody("Cổng Tam Quan là lối vào chính.");
        gateway.setActive(true);
        when(repository.findAll()).thenReturn(List.of(gateway, place()));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RagChatService service = new RagChatService(repository, builder.build());
        ReflectionTestUtils.setField(service, "apiKey", "");

        ChatResponse response = service.answer(
                new ChatRequest("Cổng Tam Quan", "vi", null));

        assertThat(response.answer())
                .contains("Cổng Tam Quan", "lối vào chính")
                .doesNotContain("Chùa Linh Ứng");
        assertThat(response.sources()).containsExactly("Cổng Tam Quan");
        server.verify();
    }

    @Test
    void reportsTemporaryUnavailabilityWhenTheProviderTimesOut() {
        ContentRepository repository = mock(ContentRepository.class);
        when(repository.findAll()).thenReturn(List.of(place()));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(CHAT_API_URL))
                .andRespond(withException(new IOException("timeout")));

        RagChatService service = new RagChatService(repository, builder.build());
        configureProvider(service);

        assertThatThrownBy(() -> service.answer(
                new ChatRequest("Tượng Quan Âm ở đâu?", "vi", "poi-1")))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        exception -> {
                            assertThat(exception.getStatusCode())
                                    .isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
                            assertThat(exception.getReason())
                                    .isEqualTo("Dịch vụ chatbot tạm thời không phản hồi. "
                                            + "Vui lòng thử lại sau ít phút.");
                        });
        server.verify();
    }

    private static Content place() {
        Content content = new Content();
        content.setId("poi-1");
        content.setTitle("Chùa Linh Ứng");
        content.setLocation("Bán đảo Sơn Trà");
        content.setBody("Tượng Quan Âm cao 67 mét.");
        content.setActive(true);
        return content;
    }

    private static void configureProvider(RagChatService service) {
        ReflectionTestUtils.setField(service, "apiUrl", CHAT_API_URL);
        ReflectionTestUtils.setField(service, "model", "test-model");
        ReflectionTestUtils.setField(service, "apiKey", "test-key");
    }
}
