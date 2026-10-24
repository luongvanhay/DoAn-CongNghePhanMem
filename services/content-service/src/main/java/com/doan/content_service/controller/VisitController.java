package com.doan.content_service.controller;

import com.doan.content_service.model.Visit;
import com.doan.content_service.repository.VisitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/visits")
public class VisitController {

    private static final Pattern ID_PATTERN =
            Pattern.compile("^[A-Za-z0-9-]{8,64}$");

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

        if (visitorId == null || !ID_PATTERN.matcher(visitorId).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "visitorId khong hop le");
        }

        repository.save(new Visit(visitorId));
        return Map.of("status", "ok");
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