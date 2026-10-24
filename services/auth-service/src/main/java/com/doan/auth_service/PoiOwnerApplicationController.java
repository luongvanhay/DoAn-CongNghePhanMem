
package com.doan.auth_service;

import com.doan.auth_service.dto.PoiOwnerApplicationRequest;
import com.doan.auth_service.dto.PoiOwnerReviewRequest;
import com.doan.auth_service.model.PoiOwnerApplication;
import com.doan.auth_service.security.JwtService;
import com.doan.auth_service.service.PoiOwnerApplicationService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth/poi-owner")
public class PoiOwnerApplicationController {

    private final PoiOwnerApplicationService applicationService;
    private final JwtService jwtService;

    public PoiOwnerApplicationController(
            PoiOwnerApplicationService applicationService,
            JwtService jwtService) {
        this.applicationService = applicationService;
        this.jwtService = jwtService;
    }

    // Đăng ký hồ sơ POI Owner
    @PostMapping("/applications")
    public ResponseEntity<Map<String, Object>> register(
            @RequestBody PoiOwnerApplicationRequest request) {
        try {
            PoiOwnerApplication application =
                    applicationService.register(request);

            return ResponseEntity.status(201).body(
                    Map.of(
                            "message", "Đăng ký thành công, đang chờ Admin duyệt",
                            "applicationId", application.getId(),
                            "userId", application.getUserId(),
                            "businessName", application.getBusinessName(),
                            "status", application.getStatus().name()
                    )
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", e.getMessage())
            );
        }
    }

    // Admin lấy danh sách hồ sơ đang chờ duyệt
    @GetMapping("/applications/pending")
    public ResponseEntity<?> getPendingApplications(
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization) {

        Claims claims;
        try {
            claims = validateAdminToken(authorization);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(
                    Map.of("message", e.getMessage())
            );
        }

        if (!"ADMIN".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "Chỉ Admin mới được xem danh sách hồ sơ")
            );
        }

        return ResponseEntity.ok(
                applicationService.getPendingApplications()
        );
    }

    // Admin duyệt hoặc từ chối hồ sơ
    @PostMapping("/applications/{id}/review")
    public ResponseEntity<Map<String, Object>> review(
            @PathVariable String id,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization,
            @RequestBody PoiOwnerReviewRequest request) {

        Claims claims;
        try {
            claims = validateAdminToken(authorization);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(
                    Map.of("message", e.getMessage())
            );
        }

        String adminId = claims.getSubject();
        String role = claims.get("role", String.class);

        if (adminId == null
                || adminId.isBlank()
                || !"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "Chỉ Admin mới được duyệt hồ sơ")
            );
        }

        try {
            PoiOwnerApplication application =
                    applicationService.review(
                            id,
                            request.isApproved(),
                            request.getRejectionReason(),
                            adminId
                    );

            String message =
                    application.getStatus()
                            == PoiOwnerApplication.ApplicationStatus.APPROVED
                    ? "Đã duyệt hồ sơ POI Owner"
                    : "Đã từ chối hồ sơ POI Owner";

            return ResponseEntity.ok(
                    Map.of(
                            "message", message,
                            "applicationId", application.getId(),
                            "status", application.getStatus().name(),
                            "reviewedBy", application.getReviewedBy()
                    )
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", e.getMessage())
            );
        }
    }

    // Kiểm tra chữ ký, thời hạn và lấy thông tin JWT
    private Claims validateAdminToken(String authorization) {
        if (authorization == null
                || !authorization.startsWith("Bearer ")
                || authorization.substring(7).trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng đăng nhập");
        }

        try {
            return jwtService.validateTokenAndGetClaims(
                    authorization.substring(7).trim()
            );
        } catch (JwtException | IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "JWT không hợp lệ hoặc đã hết hạn"
            );
        }
    }
}
