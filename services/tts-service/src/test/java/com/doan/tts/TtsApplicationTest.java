package com.doan.tts;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

class TtsApplicationTest {
    @TempDir
    Path audioDirectory;

    @Test
    void servesPreparedAudioForMatchingPlaceAndLanguage() throws Exception {
        byte[] preparedAudio = new byte[] {1, 2, 3, 4};
        Files.write(audioDirectory.resolve("poi-123-vi.mp3"), preparedAudio);
        TtsApplication application = new TtsApplication();
        ReflectionTestUtils.setField(application, "audioDirectory", audioDirectory.toString());

        ResponseEntity<byte[]> response = application.getAudio(Map.of(
                "placeId", "poi-123",
                "lang", "vi",
                "text", "Prepared narration"));

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.parseMediaType("audio/mpeg"));
        assertThat(response.getBody()).containsExactly(preparedAudio);
    }

    @Test
    void splitsLongTextWithinProviderChunkLimit() {
        String text = "word ".repeat(100);

        assertThat(TtsApplication.splitText(text))
                .allSatisfy(chunk -> assertThat(chunk.codePointCount(0, chunk.length())).isLessThanOrEqualTo(180))
                .extracting(String::length)
                .hasSizeGreaterThan(1);
    }
}
