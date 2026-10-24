
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

import java.util.Map;

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
                User.Role.PROVIDER
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
}
