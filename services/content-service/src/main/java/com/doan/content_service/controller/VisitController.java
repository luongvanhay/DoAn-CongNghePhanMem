package com.doan.content_service.controller;

import com.doan.content_service.model.Visit;
import com.doan.content_service.repository.VisitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/visits")
public class VisitController {

    private static final Pattern ID_PATTERN =
            Pattern.compile("^[A-Za-z0-9-]{8,64}$");
    private static final Pattern LANGUAGE_PATTERN =
            Pattern.compile("^[a-zA-Z0-9-]{0,10}$");

    private final VisitRepository repository;

    public VisitController(VisitRepository repository) {
        this.repository = repository;
    }

    // Ghi nhận một lượt truy cập
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> record(
            @RequestBody Map<String, String> body) {

        String visitorId = body == null ? null : body.get("visitorId");
        String sessionId = body == null ? null : body.get("sessionId");
        String source = body == null ? null : body.get("source");
        String language = body == null ? null : body.get("language");

        if (visitorId == null || !ID_PATTERN.matcher(visitorId).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "visitorId khong hop le");
        }

        if (sessionId == null || !ID_PATTERN.matcher(sessionId).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "sessionId khong hop le");
        }

        if (source == null || !source.equals("qr") && !source.equals("direct")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "source khong hop le");
        }

        if (language == null || !LANGUAGE_PATTERN.matcher(language).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "language khong hop le");
        }

        Visit visit = repository.findFirstBySessionId(sessionId)
                .orElseGet(() -> new Visit(visitorId, sessionId, source, language));
        visit.updateDetails(source, language);
        repository.save(visit);
        return Map.of("status", "ok");
    }

    // Danh sách chi tiết chỉ dành cho Admin; quyền được kiểm tra ở JWT interceptor.
    @GetMapping("/recent")
    public List<Visit> recent() {
        return repository.findTop100ByOrderByVisitedAtDesc();
    }

    // Thống kê (giờ Việt Nam)
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        LocalDateTime startOfToday =
                LocalDate.now(Visit.VN_ZONE).atStartOfDay();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalVisits", repository.count());
        result.put("uniqueVisitors", repository.countUniqueVisitors());
        result.put("visitsToday",
                repository.countByVisitedAtGreaterThanEqual(startOfToday));
        result.put("uniqueVisitorsToday",
                repository.countUniqueVisitorsSince(startOfToday));
        return result;
    }
}