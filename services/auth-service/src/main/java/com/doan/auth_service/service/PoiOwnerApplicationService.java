
package com.doan.auth_service.service;

import com.doan.auth_service.dto.PoiOwnerApplicationRequest;
import com.doan.auth_service.model.PoiOwnerApplication;
import com.doan.auth_service.model.User;
import com.doan.auth_service.repository.PoiOwnerApplicationRepository;
import com.doan.auth_service.repository.UserRepository;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class PoiOwnerApplicationService {

    private final UserRepository userRepository;
    private final PoiOwnerApplicationRepository applicationRepository;
    private final PasswordEncoder passwordEncoder;

    public PoiOwnerApplicationService(
            UserRepository userRepository,
            PoiOwnerApplicationRepository applicationRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public PoiOwnerApplication register(
            PoiOwnerApplicationRequest request) {

        validate(request);

        String username = request.getUsername().trim();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException(
                    "Username đã tồn tại");
        }

       User user = new User(
        username,
        passwordEncoder.encode(request.getPassword()),
        User.Role.PROVIDER
);

        user.setPoiOwnerVerified(false);

        try {
            User savedUser = userRepository.save(user);

            PoiOwnerApplication application =
                    new PoiOwnerApplication(
                            savedUser.getId(),
                            request.getBusinessName().trim(),
                            request.getContactName().trim(),
                            request.getPhone().trim(),
                            request.getEmail().trim(),
                            request.getAddress().trim(),
                            request.getDescription() == null
                                    ? ""
                                    : request.getDescription().trim()
                    );

            application.setStatus(
                    PoiOwnerApplication.ApplicationStatus.PENDING);

            return applicationRepository.save(application);

        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException(
                    "Username đã tồn tại");
        }
    }

    public java.util.List<PoiOwnerApplication> getPendingApplications() {
    return applicationRepository.findByStatus(
            PoiOwnerApplication.ApplicationStatus.PENDING
    );
}
public PoiOwnerApplication review(
        String applicationId,
        boolean approved,
        String rejectionReason,
        String adminId) {

    PoiOwnerApplication application =
            applicationRepository.findById(applicationId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy hồ sơ"));

    if (application.getStatus()
            != PoiOwnerApplication.ApplicationStatus.PENDING) {
        throw new IllegalArgumentException(
                "Hồ sơ này đã được xử lý");
    }

    if (!approved
            && (rejectionReason == null
                || rejectionReason.isBlank())) {
        throw new IllegalArgumentException(
                "Vui lòng nhập lý do từ chối");
    }

    User user = userRepository.findById(application.getUserId())
            .orElseThrow(() ->
                    new IllegalArgumentException(
                            "Không tìm thấy tài khoản của hồ sơ"));

    if (user.getRole() != User.Role.PROVIDER) {
    throw new IllegalArgumentException(
            "Tài khoản không có vai trò PROVIDER");
}

    application.setStatus(
            approved
                    ? PoiOwnerApplication.ApplicationStatus.APPROVED
                    : PoiOwnerApplication.ApplicationStatus.REJECTED
    );

    application.setReviewedAt(Instant.now());
    application.setReviewedBy(adminId);
    application.setRejectionReason(
            approved ? null : rejectionReason.trim()
    );

    user.setPoiOwnerVerified(approved);

    userRepository.save(user);

    return applicationRepository.save(application);
}


    private void validate(PoiOwnerApplicationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Dữ liệu đăng ký không được để trống");
        }

        require(request.getUsername(), "Username");
        require(request.getPassword(), "Mật khẩu");
        require(request.getBusinessName(), "Tên cơ sở");
        require(request.getContactName(), "Tên người liên hệ");
        require(request.getPhone(), "Số điện thoại");
        require(request.getEmail(), "Email");
        require(request.getAddress(), "Địa chỉ");

        if (request.getPassword().length() < 8) {
            throw new IllegalArgumentException(
                    "Mật khẩu phải có ít nhất 8 ký tự");
        }
    }

    private void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    field + " không được để trống");
        }
    }
}
