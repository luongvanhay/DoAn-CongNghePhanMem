
package com.doan.content_service.controller;

import com.doan.content_service.dto.ContentRequest;
import com.doan.content_service.dto.TranslationRequest;
import com.doan.content_service.model.Content;
import com.doan.content_service.model.ContentTranslation;
import com.doan.content_service.repository.ContentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

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


// Danh sách POI đang hoạt động, dành cho bản đồ công khai.
@GetMapping("/contents")
public List<Content> getAllContents() {
    return repository.findAll().stream()
            .filter(c -> Boolean.TRUE.equals(c.getActive()))
            .filter(c -> c.getLatitude() != null
                    && c.getLongitude() != null)
            .toList();
}

@GetMapping("/contents/mine")
public List<Content> getMyContents(HttpServletRequest httpRequest) {
    checkCanManageContent(httpRequest);
    String userId = getUserId(httpRequest);
    return repository.findByCreatedBy(userId);
}

    @GetMapping("/contents/{id}")
    public Content getById(@PathVariable String id) {
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

    checkCanManageContent(httpRequest);

    String userId = getUserId(httpRequest);

    Content content = new Content();
    applyRequest(content, request);
    content.setCreatedBy(userId);

    return repository.save(content);
}


    @PutMapping("/contents/{id}")
    public Content update(
            @PathVariable String id,
            @Valid @RequestBody ContentRequest request,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        checkCanManageContent(httpRequest);
        applyRequest(content, request);

        // Khong thay doi createdBy khi cap nhat.
        return repository.save(content);
    }

    @DeleteMapping("/contents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable String id,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        checkCanManageContent(httpRequest);
        repository.delete(content);
    }

    // Thêm hoặc cập nhật MỘT bản dịch (mã ngôn ngữ lấy từ URL).
    @PutMapping("/contents/{id}/translations/{lang}")
    public Content upsertTranslation(
            @PathVariable String id,
            @PathVariable String lang,
            @Valid @RequestBody TranslationRequest request,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        checkCanManageContent(httpRequest);

        String code = normalizeLanguage(lang);

        if (code.equals(content.getSourceLanguage())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Đây là ngôn ngữ gốc, hãy sửa trực tiếp nội dung chính");
        }

        List<ContentTranslation> list =
                new ArrayList<>(content.getTranslations());
        list.removeIf(t -> code.equals(t.getLanguageCode()));
        list.add(toTranslation(code, request));
        content.setTranslations(list);

        return repository.save(content);
    }

    // Xóa MỘT bản dịch.
    @DeleteMapping("/contents/{id}/translations/{lang}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTranslation(
            @PathVariable String id,
            @PathVariable String lang,
            HttpServletRequest httpRequest) {

        Content content = findContent(id);
        checkOwnerOrAdmin(content, httpRequest);
        checkCanManageContent(httpRequest);

        String code = normalizeLanguage(lang);

        List<ContentTranslation> list =
                new ArrayList<>(content.getTranslations());

        if (!list.removeIf(t -> code.equals(t.getLanguageCode()))) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Không tìm thấy bản dịch");
        }

        content.setTranslations(list);
        repository.save(content);
    }

    private Content findContent(String id) {
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


private String getRole(HttpServletRequest request) {
    Object roleValue = request.getAttribute("role");

    if (roleValue == null) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Không xác định được vai trò người dùng");
    }

    return roleValue.toString()
        .replaceFirst("^ROLE_", "")
        .trim()
        .toUpperCase(java.util.Locale.ROOT);
}

private void checkCanManageContent(HttpServletRequest request) {
    getUserId(request);
    String role = getRole(request);

    if ("ADMIN".equals(role)) {
        return;
    }

    if (!"PROVIDER".equals(role)) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tài khoản không có quyền quản lý địa điểm");
    }

    Object verifiedValue =
            request.getAttribute("poiOwnerVerified");

    if (!Boolean.TRUE.equals(verifiedValue)) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tài khoản POI chưa được Admin xác minh");
    }
}

private void checkOwnerOrAdmin(
        Content content,
        HttpServletRequest request) {

    String role = getRole(request);
    String userId = getUserId(request);

    if ("ADMIN".equals(role)) {
        return;
    }

    if (!"PROVIDER".equals(role)) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Tài khoản không có quyền quản lý địa điểm");
    }

    if (!userId.equals(content.getCreatedBy())) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn chỉ được quản lý địa điểm do mình tạo");
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

        // null = giữ nguyên bản dịch hiện có
        if (request.getTranslations() != null) {
            List<ContentTranslation> list = new ArrayList<>();

            for (TranslationRequest item : request.getTranslations()) {
                list.add(toTranslation(
                        normalizeLanguage(item.getLanguageCode()), item));
            }

            content.setTranslations(list);
        }

        validateTranslations(content);
    }

    private static final Pattern LANGUAGE_PATTERN =
            Pattern.compile("^[a-z]{2,3}(-[a-z0-9]{2,8})?$");

    private String normalizeLanguage(String value) {
        String code = value == null ? "" : value.trim().toLowerCase();

        if (!LANGUAGE_PATTERN.matcher(code).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã ngôn ngữ không hợp lệ (ví dụ: en, zh, zh-cn)");
        }

        return code;
    }

    private ContentTranslation toTranslation(
            String code, TranslationRequest request) {

        return new ContentTranslation(
                code,
                request.getTitle().trim(),
                request.getDescription().trim(),
                request.getAudioUrl() == null
                        || request.getAudioUrl().isBlank()
                        ? null : request.getAudioUrl().trim());
    }

    // Không trùng ngôn ngữ giữa các bản dịch và không trùng ngôn ngữ gốc.
    private void validateTranslations(Content content) {
        Set<String> seen = new HashSet<>();

        for (ContentTranslation t : content.getTranslations()) {
            String code = t.getLanguageCode();

            if (code.equals(content.getSourceLanguage())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Bản dịch '" + code
                                + "' trùng với ngôn ngữ gốc của nội dung");
            }

            if (!seen.add(code)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Ngôn ngữ '" + code + "' bị khai báo nhiều lần");
            }
        }
    }

}
