
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
}
