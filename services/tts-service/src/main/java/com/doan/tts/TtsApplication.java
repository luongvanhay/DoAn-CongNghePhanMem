package com.doan.tts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@SpringBootApplication
@RestController
public class TtsApplication {

    private static final int MAX_CHUNK_CHARACTERS = 180;
    private static final int MAX_TEXT_CHARACTERS = 5000;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) {
        SpringApplication.run(TtsApplication.class, args);
    }

    @PostMapping(
            value = {"/audio", "/api/tts/audio"},
            produces = "audio/mpeg")
    public ResponseEntity<byte[]> getAudio(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String lang = payload.getOrDefault("lang", "vi");

        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Vui lòng cung cấp văn bản (text)");
        }
        if (text.length() > MAX_TEXT_CHARACTERS) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Văn bản thuyết minh không được vượt quá "
                            + MAX_TEXT_CHARACTERS + " ký tự");
        }
        if (!lang.matches("[a-zA-Z-]{2,10}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Mã ngôn ngữ không hợp lệ");
        }

        try {
            ByteArrayOutputStream audio = new ByteArrayOutputStream();

            for (String chunk : splitText(text)) {
                String encodedText = URLEncoder.encode(
                        chunk, StandardCharsets.UTF_8);
                URI audioUri = URI.create(
                        "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl="
                                + lang + "&q=" + encodedText);
                HttpRequest request = HttpRequest.newBuilder(audioUri)
                        .timeout(Duration.ofSeconds(30))
                        .header("User-Agent", "Mozilla/5.0")
                        .header("Accept", "audio/mpeg,audio/*;q=0.9,*/*;q=0.8")
                        .GET()
                        .build();

                HttpResponse<byte[]> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofByteArray());
                String contentType = response.headers()
                        .firstValue("Content-Type")
                        .orElse("");

                if (response.statusCode() < 200
                        || response.statusCode() >= 300
                        || !contentType.toLowerCase().startsWith("audio/")) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "Nhà cung cấp TTS không trả về dữ liệu âm thanh hợp lệ");
                }

                audio.write(response.body());
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("audio/mpeg"))
                    .body(audio.toByteArray());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Yêu cầu tạo âm thanh bị gián đoạn", e);
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Không thể tải âm thanh từ nhà cung cấp TTS", e);
        }
    }

    static List<String> splitText(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;

        while (start < text.length()) {
            int remainingCodePoints =
                    text.codePointCount(start, text.length());
            int end = text.offsetByCodePoints(
                    start, Math.min(MAX_CHUNK_CHARACTERS, remainingCodePoints));

            if (end < text.length()) {
                int wordBoundary = text.lastIndexOf(' ', end);
                if (wordBoundary > start) {
                    end = wordBoundary;
                }
            }

            chunks.add(text.substring(start, end));
            start = end;
        }

        return chunks;
    }

    @PostMapping({"/convert", "/api/tts/convert"})
    public ResponseEntity<Map<String, Object>> convertTextToSpeech(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String lang = payload.getOrDefault("lang", "vi");
        Map<String, Object> response = new HashMap<>();

        if (text == null || text.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Vui lòng cung cấp văn bản (text)");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // Reproduce the behavior of the google-tts-api library
            String encodedText = URLEncoder.encode(text, StandardCharsets.UTF_8.toString());
            String audioUrl = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" + lang + "&q=" + encodedText;
            
            response.put("success", true);
            response.put("originalText", text);
            response.put("language", lang);
            response.put("audioUrl", audioUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi tạo giọng đọc");
            return ResponseEntity.internalServerError().body(response);
        }
    }
}