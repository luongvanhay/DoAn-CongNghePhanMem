
package com.doan.auth_service;

import com.doan.auth_service.dto.LoginRequest;
import com.doan.auth_service.dto.RegisterRequest;
import com.doan.auth_service.model.User;
import com.doan.auth_service.repository.UserRepository;
import com.doan.auth_service.security.JwtService;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.util.Map;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("service", "auth-service", "status", "ok");
    }

    @GetMapping(value = "/", produces = "text/plain;charset=UTF-8")
    public String hello() {
        return "Auth Service đang hoạt động!";
    }

    @PostMapping(
            value = "/register",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, String>> register(
            @RequestBody RegisterRequest request) {

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
        User.Role.VISITOR
);
        try {

            User savedUser = userRepository.save(user);

            return ResponseEntity.status(201).body(
                    Map.of(
                            "message", "Tạo tài khoản thành công",
                            "id", savedUser.getId(),
                            "username", savedUser.getUsername(),
                            "role", savedUser.getRole().name()
                    )
            );

        } catch (DuplicateKeyException e) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "Username đã tồn tại")
            );
        }
    }

    @PostMapping(
            value = "/login",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, String>> login(
            @RequestBody LoginRequest request) {

        String loginEmail = request.getEmail();
        if (loginEmail != null && !loginEmail.isBlank()) {
            String normalizedEmail = loginEmail.trim().toLowerCase();
            if (!normalizedEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Nhập địa chỉ email hợp lệ."));
            }
            return userRepository.findByEmailIgnoreCase(normalizedEmail)
                    .filter(user -> user.getRole() == User.Role.ADMIN)
                    .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                    .filter(user -> user.getStatus() == User.AccountStatus.ACTIVE)
                    .map(user -> {
                        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.getRole().name());
                        return ResponseEntity.ok(Map.of("message", "Đăng nhập thành công", "id", user.getId(),
                                "username", user.getUsername(), "email", user.getEmail(), "role", user.getRole().name(), "token", token));
                    }).orElseGet(() -> ResponseEntity.status(401).body(Map.of("message", "Email chưa được cấp quyền Admin hoặc mật khẩu không đúng.")));
        }

        if (request.getUsername() == null
                || request.getUsername().isBlank()
                || request.getPassword() == null
                || request.getPassword().isBlank()) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Vui lòng nhập username và password"
                    )
            );
        }
System.out.println("Login username: " + request.getUsername().trim());

userRepository.findByUsername(request.getUsername().trim())
        .ifPresentOrElse(
                user -> {
                    System.out.println("User found: true");
                    System.out.println("Role: " + user.getRole());
                    System.out.println("Status: " + user.getStatus());
                    System.out.println(
                            "Password matches: "
                                    + passwordEncoder.matches(
                                            request.getPassword(),
                                            user.getPassword()
                                    )
                    );
                },
                () -> System.out.println("User found: false")
        );
        return userRepository.findByUsername(
                request.getUsername().trim()
        ).filter(user ->
                passwordEncoder.matches(
                        request.getPassword(),
                        user.getPassword()
                )
        ).filter(user ->
                user.getStatus() == User.AccountStatus.ACTIVE
        ).map(user -> {
            String token = jwtService.generateToken(
                    user.getId(),
                    user.getUsername(),
                    user.getRole().name()
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message", "Đăng nhập thành công",
                            "id", user.getId(),
                            "username", user.getUsername(),
                            "role", user.getRole().name(),
                            "token", token
                    )
            );
        }).orElseGet(() ->
                ResponseEntity.status(401).body(
                        Map.of(
                                "message",
                                "Username hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa"
                        )
                )
        );
    }

    @PostMapping(
        value = "/admin/create-staff",
        produces = MediaType.APPLICATION_JSON_VALUE
)
public ResponseEntity<Map<String, String>> createStaff(
        @RequestHeader(
                value = "Authorization",
                required = false
        ) String authorization,
        @RequestBody RegisterRequest request) {

    // Kiểm tra token
    if (authorization == null
            || !authorization.startsWith("Bearer ")) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Vui lòng đăng nhập bằng tài khoản Admin")
        );
    }

    try {
        String token = authorization.substring(7);
Claims claims = jwtService.validateTokenAndGetClaims(token);

if (!"ADMIN".equals(claims.get("role", String.class))) {
    return ResponseEntity.status(403).body(
            Map.of("message", "Chỉ Admin được tạo tài khoản Staff")
    );
}
    } catch (JwtException | IllegalArgumentException e) {
        return ResponseEntity.status(401).body(
                Map.of("message", "Token không hợp lệ hoặc đã hết hạn")
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

    // Kiểm tra enum User.Role trước khi sử dụng STAFF
    User staff = new User(
            username,
            passwordEncoder.encode(request.getPassword()),
            User.Role.ADMINSTAFF
    );

    try {
        User savedUser = userRepository.save(staff);

        return ResponseEntity.status(201).body(
                Map.of(
                        "message", "Tạo tài khoản Staff thành công",
                        "id", savedUser.getId(),
                        "username", savedUser.getUsername(),
                        "role", savedUser.getRole().name()
                )
        );
    } catch (DuplicateKeyException e) {
        return ResponseEntity.status(409).body(
                Map.of("message", "Username đã tồn tại")
        );
    }
}

@GetMapping(value = "/admin/staff", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<?> listStaff(
        @RequestHeader(value = "Authorization", required = false) String authorization) {
    if (authorization == null || !authorization.startsWith("Bearer ")
            || authorization.substring(7).isBlank()) {
        return ResponseEntity.status(401).body(Map.of("message", "Vui lòng đăng nhập Admin"));
    }

    try {
        Claims claims = jwtService.validateTokenAndGetClaims(authorization.substring(7).trim());
        if (!"ADMIN".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ Admin được xem danh sách nhân viên"));
        }
    } catch (JwtException | IllegalArgumentException exception) {
        return ResponseEntity.status(401).body(Map.of("message", "Token không hợp lệ hoặc đã hết hạn"));
    }

    List<Map<String, Object>> staff = userRepository.findByRole(User.Role.ADMINSTAFF)
            .stream()
            .map(user -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", user.getId());
                item.put("username", user.getUsername());
                item.put("status", user.getStatus() == null ? "ACTIVE" : user.getStatus().name());
                item.put("createdAt", user.getCreatedAt());
                return item;
            })
            .collect(Collectors.toList());
    return ResponseEntity.ok(staff);
}

@GetMapping(value = "/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<?> listUsers(
        @RequestHeader(value = "Authorization", required = false) String authorization) {
    ResponseEntity<?> authError = requireAdmin(authorization);
    if (authError != null) return authError;

    List<Map<String, Object>> users = userRepository.findAll().stream()
            .filter(user -> user.getRole() != User.Role.ADMIN)
            .map(user -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", user.getId());
                item.put("username", user.getUsername());
                item.put("role", user.getRole() == null ? "UNKNOWN" : user.getRole().name());
                item.put("status", user.getStatus() == null ? "ACTIVE" : user.getStatus().name());
                item.put("createdAt", user.getCreatedAt());
                item.put("poiOwnerVerified", user.isPoiOwnerVerified());
                return item;
            })
            .toList();
    return ResponseEntity.ok(users);
}

@PutMapping(value = "/admin/users/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<?> updateStaff(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @PathVariable String id,
        @RequestBody StaffUpdateRequest request) {
    ResponseEntity<?> authError = requireAdmin(authorization);
    if (authError != null) return authError;

    if (request.getUsername() == null || request.getUsername().isBlank()) {
        return ResponseEntity.badRequest().body(Map.of("message", "Username không được để trống"));
    }
    if (request.getPassword() != null && !request.getPassword().isBlank()
            && request.getPassword().length() < 8) {
        return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu phải có ít nhất 8 ký tự"));
    }

    User staff = userRepository.findById(id).orElse(null);
    if (staff == null || staff.getRole() == User.Role.ADMIN) {
        return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy tài khoản người dùng"));
    }

    String username = request.getUsername().trim();
    boolean usernameTaken = userRepository.findByUsername(username)
            .filter(existing -> !existing.getId().equals(staff.getId()))
            .isPresent();
    if (usernameTaken) {
        return ResponseEntity.status(409).body(Map.of("message", "Username đã tồn tại"));
    }

    staff.setUsername(username);
    if (request.getPassword() != null && !request.getPassword().isBlank()) {
        staff.setPassword(passwordEncoder.encode(request.getPassword()));
    }
    User saved = userRepository.save(staff);
    return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "username", saved.getUsername(),
            "status", saved.getStatus() == null ? "ACTIVE" : saved.getStatus().name(),
            "createdAt", saved.getCreatedAt() == null ? "" : saved.getCreatedAt().toString()));
}

@PatchMapping(value = "/admin/users/{id}/status", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<?> updateStaffStatus(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @PathVariable String id,
        @RequestBody StaffStatusRequest request) {
    ResponseEntity<?> authError = requireAdmin(authorization);
    if (authError != null) return authError;

    User.AccountStatus status;
    try {
        status = User.AccountStatus.valueOf(
                request.getStatus() == null ? "" : request.getStatus().trim().toUpperCase(java.util.Locale.ROOT));
    } catch (IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái phải là ACTIVE hoặc LOCKED"));
    }

    User staff = userRepository.findById(id).orElse(null);
    if (staff == null || staff.getRole() == User.Role.ADMIN) {
        return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy tài khoản người dùng"));
    }

    staff.setStatus(status);
    User saved = userRepository.save(staff);
    return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "username", saved.getUsername(),
            "status", saved.getStatus().name()));
}

private ResponseEntity<?> requireAdmin(String authorization) {
    if (authorization == null || !authorization.startsWith("Bearer ")
            || authorization.substring(7).isBlank()) {
        return ResponseEntity.status(401).body(Map.of("message", "Vui lòng đăng nhập Admin"));
    }
    try {
        Claims claims = jwtService.validateTokenAndGetClaims(authorization.substring(7).trim());
        if (!"ADMIN".equals(claims.get("role", String.class))) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ Admin được quản lý tài khoản nhân viên"));
        }
        return null;
    } catch (JwtException | IllegalArgumentException exception) {
        return ResponseEntity.status(401).body(Map.of("message", "Token không hợp lệ hoặc đã hết hạn"));
    }
}

public static class StaffUpdateRequest {
    private String username;
    private String password;
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}

public static class StaffStatusRequest {
    private String status;
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
}
