
package com.doan.content_service.controller;

import com.doan.content_service.dto.ContentRequest;
import com.doan.content_service.model.Content;
import com.doan.content_service.repository.ContentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
public class ContentController {

    private final ContentRepository repository;

    public ContentController(ContentRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "content-service", "status", "ok");
    }

    @GetMapping("/contents")
    public List<Content> getAll() {
        return repository.findAll();
    }

    @GetMapping("/contents/{id}")
    public Content getById(@PathVariable Long id) {
        return findContent(id);
    }

    // Tim cac POI dang hoat dong trong ban kinh yeu cau.
    @GetMapping("/contents/nearby")
    public List<Content> getNearby(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "1500") Double radius) {

        if (latitude == null || latitude < -90 || latitude > 90
                || longitude == null || longitude < -180 || longitude > 180
                || radius == null || !Double.isFinite(radius)
                || radius <= 0 || radius > 100000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Toa do hoac ban kinh khong hop le");
        }

        return repository.findAll().stream()
                .filter(c -> Boolean.TRUE.equals(c.getActive()))
                .filter(c -> c.getLatitude() != null
                        && c.getLongitude() != null)
                .filter(c -> distanceMeters(
                        latitude, longitude,
                        c.getLatitude(), c.getLongitude()) <= radius)
                .sorted(
                        Comparator.comparing(
                                (Content c) -> c.getAudioPriority() == null
                                        ? 0 : c.getAudioPriority(),
                                Comparator.reverseOrder())
                        .thenComparingDouble(c -> distanceMeters(
                                latitude, longitude,
                                c.getLatitude(), c.getLongitude())))
                .toList();
    }

    @PostMapping("/contents")
    @ResponseStatus(HttpStatus.CREATED)
    public Content create(
            @Valid @RequestBody ContentRequest request,
            HttpServletRequest httpRequest) {

        String userId = getUserId(httpRequest);

        Content content = new Content();
        applyRequest(content, request);
        content.setCreatedBy(userId);

        return repository.save(content);
    }

    @PutMapping("/contents/{id}")
    public Content update(
            @PathVariable Long id,
            @Valid @RequestBody ContentRequest request,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        applyRequest(content, request);

        // Khong thay doi createdBy khi cap nhat.
        return repository.save(content);
    }

    @DeleteMapping("/contents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        repository.delete(content);
    }

    private Content findContent(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Khong tim thay noi dung"));
    }

    private String getUserId(HttpServletRequest request) {
        Object value = request.getAttribute("userId");

        if (value == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua xac thuc nguoi thao tac");
        }

        return value.toString();
    }

    private void checkOwnerOrAdmin(
            Content content, HttpServletRequest request) {

        Object roleValue = request.getAttribute("role");
        String userId = getUserId(request);

        boolean isAdmin = roleValue != null
                && "ADMIN".equalsIgnoreCase(
                        roleValue.toString().replace("ROLE_", ""));

        if (!isAdmin && (content.getCreatedBy() == null
                || !content.getCreatedBy().equals(userId))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ban chi duoc sua hoac xoa noi dung do minh tao");
        }
    }

    private double distanceMeters(
            double lat1, double lon1,
            double lat2, double lon2) {

        double earthRadius = 6371000.0;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(
                Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadius * c;
    }

    private void applyRequest(
            Content content, ContentRequest request) {

        content.setTitle(request.getTitle().trim());
        content.setBody(request.getBody().trim());

        content.setLocation(
                request.getLocation() == null
                        ? null : request.getLocation().trim());

        content.setSourceLanguage(
                request.getSourceLanguage().trim().toLowerCase());

        content.setLatitude(request.getLatitude());
        content.setLongitude(request.getLongitude());
        content.setTriggerRadius(request.getTriggerRadius());

        content.setImageUrl(
                request.getImageUrl() == null
                        ? null : request.getImageUrl().trim());

        content.setAudioPriority(request.getAudioPriority());
        content.setActive(request.getActive());
    }
}
