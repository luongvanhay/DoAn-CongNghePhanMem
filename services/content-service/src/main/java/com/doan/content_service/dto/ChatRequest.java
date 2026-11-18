package com.doan.content_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank @Size(max = 1000) String question,
        @Size(max = 8) String language,
        @Size(max = 128) String placeId) {
}
