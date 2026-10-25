package com.doan.auth_service.config;

import com.doan.auth_service.model.User;
import com.doan.auth_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger logger =
            LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;

    public AdminBootstrapRunner(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.username:}") String username,
            @Value("${app.bootstrap-admin.password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean usernameProvided = username != null && !username.isBlank();
        boolean passwordProvided = password != null && !password.isBlank();

        if (!usernameProvided && !passwordProvided) {
            return;
        }

        if (!usernameProvided || !passwordProvided) {
            throw new IllegalStateException(
                    "Cần cấu hình cả ADMIN_USERNAME và ADMIN_PASSWORD để tạo Admin ban đầu");
        }

        String normalizedUsername = username.trim();
        if (password.length() < 8) {
            throw new IllegalStateException(
                    "ADMIN_PASSWORD phải có ít nhất 8 ký tự");
        }

        if (userRepository.existsByUsername(normalizedUsername)) {
            logger.info(
                    "Không tạo Admin bootstrap vì username '{}' đã tồn tại",
                    normalizedUsername);
            return;
        }

        User admin = new User(
                normalizedUsername,
                passwordEncoder.encode(password),
                User.Role.ADMIN);
        userRepository.save(admin);
        logger.info(
                "Đã tạo tài khoản Admin bootstrap '{}'",
                normalizedUsername);
    }
}
