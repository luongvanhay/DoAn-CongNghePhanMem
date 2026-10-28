package com.doan.translation_service.controller;

import com.doan.translation_service.dto.TranslationRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class TranslationController {
    private static final int FALLBACK_CHUNK_CODE_POINTS = 800;

    private final RestClient restClient = RestClient.create();

    @Value("${translation.api-url:}")
    private String translationApiUrl;

    @Value("${translation.api-key:}")
    private String translationApiKey;

    @Value("${translation.fallback-api-url:https://translate.googleapis.com/translate_a/single}")
    private String fallbackApiUrl;

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "translation-service", "status", "ok");
    }

    @PostMapping("/translate")
    public Map<String, String> translate(@Valid @RequestBody TranslationRequest request) {
        String source = request.getSource().trim().toLowerCase();
        String target = request.getTarget().trim().toLowerCase();

        if (source.equals(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ngôn ngữ nguồn và ngôn ngữ đích phải khác nhau");
        }

        if (translationApiUrl == null || translationApiUrl.isBlank()) {
            return translationResponse(
                    translateWithFallback(request.getText(), source, target),
                    source,
                    target,
                    "Google Translate");
        }

        try {
            // Thử dịch bằng dịch vụ chính (LibreTranslate)
            String translatedText = translateWithConfiguredProvider(
                    request.getText(), source, target);
            return translationResponse(
                    translatedText,
                    source,
                    target,
                    translationApiUrl.contains("libretranslate.com")
                            ? "LibreTranslate" : "Configured translation provider");
        } catch (RestClientException | IllegalStateException localException) {
            // Log chi tiết lỗi từ LibreTranslate (kết hợp từ đoạn code 1 và 2)
            System.err.println("Lỗi khi gọi LibreTranslate (" + source + " -> " + target + "): "
                    + localException.getClass().getSimpleName() + " - " + localException.getMessage()
                    + "; đang thử chuyển sang dịch vụ dự phòng (Google Translate)...");

            try {
                // Thử dịch vụ dự phòng Google Translate
                String translatedText = translateWithFallback(
                        request.getText(), source, target);
                return Map.of(
                        "translated_text", translatedText,
                        "source", source,
                        "target", target,
                        "provider", "Google Translate"
                );
            } catch (RestClientException | IllegalStateException fallbackException) {
                System.err.println("Lỗi dịch vụ dự phòng Google Translate: " + fallbackException.getMessage());
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Không dịch được nội dung bằng cả LibreTranslate và dịch vụ dự phòng: " + fallbackException.getMessage(),
                        fallbackException);
            }
        }
    }

    private Map<String, String> translationResponse(
            String translatedText, String source, String target, String provider) {
        return Map.of(
                "translated_text", translatedText,
                "source", source,
                "target", target,
                "provider", provider);
    }

    private String translateWithConfiguredProvider(
            String text, String source, String target) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("q", text);
        payload.put("source", source);
        payload.put("target", target);
        payload.put("format", "text");
        if (translationApiKey != null && !translationApiKey.isBlank()) {
            payload.put("api_key", translationApiKey);
        }

        Map<?, ?> providerResponse = restClient.post()
                .uri(translationApiUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(Map.class);

        Object translated = providerResponse == null
                ? null : providerResponse.get("translatedText");
        if (!(translated instanceof String translatedText)
                || translatedText.isBlank()) {
            throw new IllegalStateException(
                    "LibreTranslate không trả về translatedText hợp lệ");
        }

        return translatedText;
    }

    private String translateWithFallback(
            String text, String source, String target) {
        StringBuilder translatedText = new StringBuilder();
        int start = 0;

        while (start < text.length()) {
            int remainingCodePoints = text.codePointCount(start, text.length());
            int end = text.offsetByCodePoints(
                    start, Math.min(FALLBACK_CHUNK_CODE_POINTS, remainingCodePoints));

            if (end < text.length()) {
                int boundary = text.lastIndexOf(' ', end);
                if (boundary > start) {
                    end = boundary;
                }
            }

            int next = end;
            while (next < text.length()
                    && Character.isWhitespace(text.charAt(next))) {
                next++;
            }

            URI uri = UriComponentsBuilder.fromUriString(fallbackApiUrl)
                    .queryParam("client", "gtx")
                    .queryParam("sl", source)
                    .queryParam("tl", target)
                    .queryParam("dt", "t")
                    .queryParam("q", text.substring(start, end))
                    .build()
                    .encode()
                    .toUri();

            Object response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(Object.class);

            appendTranslatedSegments(translatedText, response);
            if (next < text.length()) {
                translatedText.append(text, end, next);
            }
            start = next;
        }

        if (translatedText.isEmpty()) {
            throw new IllegalStateException(
                    "Dịch vụ dự phòng không trả về nội dung đã dịch");
        }

        return translatedText.toString();
    }

    private void appendTranslatedSegments(
            StringBuilder translatedText, Object response) {
        if (response instanceof List<?> responseItems
                && !responseItems.isEmpty()
                && responseItems.get(0) instanceof List<?> segments) {
            for (Object segment : segments) {
                if (segment instanceof List<?> values
                        && !values.isEmpty()
                        && values.get(0) instanceof String text) {
                    translatedText.append(text);
                }
            }
        }
    }
}