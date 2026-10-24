
package com.doan.content_service.controller;

import com.doan.content_service.model.PaymentTransaction;
import com.doan.content_service.repository.PaymentTransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentTransactionRepository paymentRepository;
    private final SecureRandom random = new SecureRandom();
    private static final long TICKET_PRICE = 50000L;

    public PaymentController(
            PaymentTransactionRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    // Tạo giao dịch thanh toán
    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestBody CreatePaymentRequest request) {

        if (request.getAmount() == null
        || request.getAmount() != TICKET_PRICE) {
    return ResponseEntity.badRequest()
            .body(message("Giá vé là 50.000 đồng/lượt"));
}

        String method = request.getMethod() == null
                ? "" : request.getMethod().trim().toUpperCase();

        if (!method.equals("PAYOO") && !method.equals("CASH")) {
            return ResponseEntity.badRequest()
                    .body(message("Phương thức phải là PAYOO hoặc CASH"));
        }

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setTransactionCode(
                "TX-" + UUID.randomUUID().toString()
                        .replace("-", "").substring(0, 12).toUpperCase());
        transaction.setAmount(TICKET_PRICE);
        transaction.setMethod(method);
        transaction.setStatus("PENDING");
        transaction.setAccessGranted(false);
        transaction.setCreatedAt(LocalDateTime.now());

        // Mã nhận quyền chỉ tạo cho phương thức tiền mặt.
        if (method.equals("CASH")) {
            transaction.setClaimCode(generateClaimCode());
        }

        PaymentTransaction saved = paymentRepository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("transactionCode", saved.getTransactionCode());
        response.put("amount", saved.getAmount());
        response.put("method", saved.getMethod());
        response.put("status", saved.getStatus());
        response.put("accessGranted", saved.isAccessGranted());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Tra cứu trạng thái giao dịch
    @GetMapping("/{transactionCode}")
    public ResponseEntity<?> getPayment(
            @PathVariable String transactionCode) {

        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(transactionCode);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(message("Không tìm thấy giao dịch"));
        }

        PaymentTransaction transaction = optional.get();

        Map<String, Object> response = new HashMap<>();
        response.put("transactionCode", transaction.getTransactionCode());
        response.put("amount", transaction.getAmount());
        response.put("method", transaction.getMethod());
        response.put("status", transaction.getStatus());
        response.put("accessGranted", transaction.isAccessGranted());

        return ResponseEntity.ok(response);
    }

    // Nhận Claim code để cấp quyền truy cập một lần
    @PostMapping("/claim")
    public ResponseEntity<?> claimAccess(
            @RequestBody ClaimRequest request) {

        if (request.getClaimCode() == null
                || request.getClaimCode().trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(message("Vui lòng nhập Claim code"));
        }

        String claimCode = request.getClaimCode().trim().toUpperCase();

        // Thao tác nguyên tử: chỉ một request duy nhất có thể thành công.
        Optional<PaymentTransaction> claimed =
                paymentRepository.claimAccess(
                        claimCode, LocalDateTime.now());

        if (claimed.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Cấp quyền truy cập thành công");
            response.put("transactionCode",
                    claimed.get().getTransactionCode());
            response.put("accessGranted", true);

            return ResponseEntity.ok(response);
        }

        // Không thành công: xác định lý do để trả thông báo phù hợp.
        Optional<PaymentTransaction> optional =
                paymentRepository.findByClaimCode(claimCode);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(message("Claim code không hợp lệ"));
        }

        PaymentTransaction transaction = optional.get();

        if (!"CASH".equals(transaction.getMethod())) {
            return ResponseEntity.badRequest()
                    .body(message("Claim code không áp dụng cho giao dịch này"));
        }

        if (transaction.getClaimUsedAt() != null
                || transaction.isAccessGranted()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(message("Claim code đã được sử dụng"));
        }

        // Nhân viên cần xác nhận đã thu tiền trước khi cấp quyền.
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(message("Giao dịch chưa được xác nhận thanh toán"));
    }

    // Nhân viên xác nhận đã thu tiền mặt
    @PostMapping("/{transactionCode}/confirm-cash")
    public ResponseEntity<?> confirmCashPayment(
            @PathVariable String transactionCode) {

        // Thao tác nguyên tử: PENDING -> PAID chỉ xảy ra một lần.
        Optional<PaymentTransaction> updated =
                paymentRepository.markCashPaid(
                        transactionCode, LocalDateTime.now());

        if (updated.isPresent()) {
            PaymentTransaction saved = updated.get();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đã xác nhận thu tiền");
            response.put("transactionCode", saved.getTransactionCode());
            response.put("status", saved.getStatus());
            response.put("claimCode", saved.getClaimCode());

            return ResponseEntity.ok(response);
        }

        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(transactionCode);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(message("Không tìm thấy giao dịch"));
        }

        if (!"CASH".equals(optional.get().getMethod())) {
            return ResponseEntity.badRequest()
                    .body(message("Giao dịch này không phải tiền mặt"));
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(message("Giao dịch không ở trạng thái chờ thanh toán"));
    }

    private String generateClaimCode() {
        String code;
        do {
            code = String.format("%06d", random.nextInt(1_000_000));
        } while (paymentRepository.findByClaimCode(code).isPresent());

        return code;
    }

    private Map<String, String> message(String value) {
        Map<String, String> response = new HashMap<>();
        response.put("message", value);
        return response;
    }

    public static class CreatePaymentRequest {
        private Long amount;
        private String method;

        public Long getAmount() {
            return amount;
        }

        public void setAmount(Long amount) {
            this.amount = amount;
        }

        public String getMethod() {
            return method;
        }

        public void setMethod(String method) {
            this.method = method;
        }
    }

    public static class ClaimRequest {
        private String claimCode;

        public String getClaimCode() {
            return claimCode;
        }

        public void setClaimCode(String claimCode) {
            this.claimCode = claimCode;
        }
    }
}
