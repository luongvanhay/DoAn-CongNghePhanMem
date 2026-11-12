
package com.doan.auth_service;

import com.doan.auth_service.dto.PoiOwnerApplicationRequest;
import com.doan.auth_service.dto.PoiOwnerReviewRequest;
import com.doan.auth_service.dto.RegisterRequest;
import com.doan.auth_service.model.PoiOwnerApplication;
import com.doan.auth_service.model.User;
import com.doan.auth_service.repository.UserRepository;
import com.doan.auth_service.security.JwtService;
import com.doan.auth_service.service.PoiOwnerApplicationService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.Map;

@RestController
@RequestMapping("/auth/poi-owner")
public class PoiOwnerApplicationController {

    private final PoiOwnerApplicationService applicationService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PoiOwnerApplicationController(
            PoiOwnerApplicationService applicationService,
            JwtService jwtService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.applicationService = applicationService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Người dùng đăng ký hồ sơ POI, chờ Admin duyệt
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

    // Admin tạo tài khoản POI trực tiếp, không cần chờ duyệt
    @PostMapping("/admin-create")
    public ResponseEntity<Map<String, Object>> adminCreatePoiOwner(
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization,
            @RequestBody RegisterRequest request) {

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
                    Map.of("message", "Chỉ Admin mới được tạo tài khoản POI")
            );
        }

        if (request.getUsername() == null
                || request.getUsername().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Username không được để trống")
            );
        }

        if (request.getPassword() == null
                || request.getPassword().length() < 8) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Mật khẩu phải có ít nhất 8 ký tự")
            );
        }

        String username = request.getUsername().trim();

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "Username đã tồn tại")
            );
        }

        User user = new User(
                username,
                passwordEncoder.encode(request.getPassword()),
                User.Role.PROVIDER
        );

        // Tài khoản do Admin tạo được xác minh ngay
        user.setPoiOwnerVerified(true);

        try {
            User savedUser = userRepository.save(user);

            return ResponseEntity.status(201).body(
                    Map.of(
                            "message", "Tạo tài khoản POI thành công",
                            "id", savedUser.getId(),
                            "username", savedUser.getUsername(),
                            "role", savedUser.getRole().name(),
                            "poiOwnerVerified", savedUser.isPoiOwnerVerified()
                    )
            );

        } catch (DuplicateKeyException e) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "Username đã tồn tại")
            );
        }
    }

    // Admin xem danh sách hồ sơ POI đang chờ duyệt
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

        String adminId = claims.getSubject();
        String role = claims.get("role", String.class);

        if (adminId == null
                || adminId.isBlank()
                || !"ADMIN".equals(role)) {

            return ResponseEntity.status(403).body(
                    Map.of("message", "Chỉ Admin mới được xem danh sách hồ sơ")
            );
        }

        return ResponseEntity.ok(
                applicationService.getPendingApplications()
        );
    }

    @GetMapping("/applications/approved")
    public ResponseEntity<?> getApprovedApplications(
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {
        Claims claims;
        try {
            claims = validateAdminToken(authorization);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(
                    Map.of("message", e.getMessage()));
        }

        String adminId = claims.getSubject();
        String role = claims.get("role", String.class);
        if (adminId == null || adminId.isBlank() || !"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "Chi Admin moi duoc xem danh sach ho so"));
        }

        return ResponseEntity.ok(applicationService.getApprovedApplications());
    }

    // Admin duyệt hoặc từ chối hồ sơ POI
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

    // Kiểm tra chữ ký và thời hạn JWT
   private Claims validateAdminToken(String authorization) {
    if (authorization == null
            || !authorization.startsWith("Bearer ")
            || authorization.substring(7).trim().isEmpty()) {
        throw new IllegalArgumentException("Vui lòng đăng nhập");
    }

    String token = authorization.substring(7).trim();

    try {
        return jwtService.validateTokenAndGetClaims(token);
    } catch (JwtException e) {
        throw new IllegalArgumentException(
                "JWT không hợp lệ hoặc đã hết hạn"
        );
    }
}

// API nội bộ để kiểm tra trạng thái xác minh POI Owner
@GetMapping("/internal/verification/{userId}")
public ResponseEntity<Map<String, Object>> checkPoiOwnerVerification(
        @PathVariable String userId,
        @RequestHeader(value = "X-Internal-Secret", required = false)
        String internalSecret) {

    String expectedSecret = System.getenv("INTERNAL_API_SECRET");

    if (expectedSecret == null
            || expectedSecret.isBlank()
            || internalSecret == null
            || !java.security.MessageDigest.isEqual(
                    expectedSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    internalSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of("message", "Không được phép truy cập API nội bộ")
        );
    }

    return userRepository.findById(userId)
            .map(user -> ResponseEntity.ok(
                    Map.<String, Object>of(
                            "userId", user.getId(),
                            "role", user.getRole().name(),
                            "poiOwnerVerified", user.isPoiOwnerVerified()
                    )
            ))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("message", "Không tìm thấy tài khoản")
            ));
}
}
