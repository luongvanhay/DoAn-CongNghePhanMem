package com.doan.content_service.dto;

import java.util.List;

public record ChatResponse(String answer, List<String> sources) {
}
