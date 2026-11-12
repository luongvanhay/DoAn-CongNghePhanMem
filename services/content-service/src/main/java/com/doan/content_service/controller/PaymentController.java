
package com.doan.content_service.controller;

import com.doan.content_service.model.PaymentTransaction;
import com.doan.content_service.repository.PaymentTransactionRepository;
import com.doan.content_service.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentTransactionRepository paymentRepository;
    private final VnpayService vnpayService;
    private final SecureRandom random = new SecureRandom();
    private static final long TICKET_PRICE = 50000L;

    @Value("${payment.frontend-return-url:http://localhost:5173/payment}")
    private String frontendReturnUrl;

    public PaymentController(
            PaymentTransactionRepository paymentRepository,
            VnpayService vnpayService) {
        this.paymentRepository = paymentRepository;
        this.vnpayService = vnpayService;
    }

    // Tạo giao dịch thanh toán
    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestBody CreatePaymentRequest request,
            HttpServletRequest httpRequest) {

        if (request.getAmount() == null
        || request.getAmount() != TICKET_PRICE) {
    return ResponseEntity.badRequest()
            .body(message("Giá vé là 50.000 đồng/lượt"));
}

        String method = request.getMethod() == null
                ? "" : request.getMethod().trim().toUpperCase(java.util.Locale.ROOT);

        if (!method.equals("VNPAY")
        && !method.equals("CASH")
        && !method.equals("PAYOO")) {
    return ResponseEntity.badRequest()
            .body(message(
                    "Phương thức phải là PAYOO, CASH hoặc VNPAY"));
}
        if (method.equals("VNPAY") && !vnpayService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(message(
                            "Chưa cấu hình VNPay. Hãy thêm VNPAY_TMN_CODE và "
                                    + "VNPAY_HASH_SECRET vào .env."));
        }

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setTransactionCode(
                "TX-" + UUID.randomUUID().toString()
                        .replace("-", "").substring(0, 12).toUpperCase());
        transaction.setAmount(TICKET_PRICE);
        transaction.setMethod(method);
        transaction.setLanguage(normalizeLanguage(request.getLanguage()));
        transaction.setSource("qr".equals(request.getSource()) ? "qr" : null);
        if (request.getSessionId() != null
                && request.getSessionId().matches("^[A-Za-z0-9-]{8,64}$")) {
            transaction.setSessionId(request.getSessionId());
        }
        transaction.setStatus("PENDING");
        transaction.setAccessGranted(false);
        transaction.setCreatedAt(LocalDateTime.now());

        // Mã nhận quyền chỉ tạo cho phương thức tiền mặt.
        if (method.equals("CASH")) {
            transaction.setClaimCode(generateClaimCode());
        }

        String paymentUrl = method.equals("VNPAY")
                ? vnpayService.createPaymentUrl(
                        transaction.getTransactionCode(),
                        transaction.getAmount(),
                        httpRequest.getRemoteAddr())
                : null;
        PaymentTransaction saved = paymentRepository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("transactionCode", saved.getTransactionCode());
        response.put("amount", saved.getAmount());
        response.put("method", saved.getMethod());
        response.put("status", saved.getStatus());
        response.put("accessGranted", saved.isAccessGranted());
        if (paymentUrl != null) {
            response.put("paymentUrl", paymentUrl);
            response.put("expiresAt", Instant.now().plusSeconds(15 * 60L).toString());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/stats")
    public Map<String, Long> paymentStats() {
        List<PaymentTransaction> paidTransactions =
                paymentRepository.findByStatus("PAID");
        long totalIncome = paidTransactions.stream()
                .map(PaymentTransaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();
        return Map.of(
                "totalIncome", totalIncome,
                "paidTransactions", (long) paidTransactions.size());
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

    @GetMapping("/cash/pending")
    public List<Map<String, Object>> getPendingCashPayments() {
        return paymentRepository
                .findByMethodAndStatusOrderByCreatedAtDesc("CASH", "PENDING")
                .stream()
                .map(transaction -> {
                    Map<String, Object> payment = new HashMap<>();
                    payment.put("transactionCode", transaction.getTransactionCode());
                    payment.put("amount", transaction.getAmount());
                    payment.put("createdAt", transaction.getCreatedAt() == null
                            ? "" : transaction.getCreatedAt().toString());
                    payment.put("language", transaction.getLanguage() == null
                            ? "vi" : transaction.getLanguage());
                    return payment;
                })
                .toList();
    }

    @GetMapping("/vnpay/return")
    public ResponseEntity<Void> vnpayReturn(
            @RequestParam MultiValueMap<String, String> parameters) {
        String transactionCode = parameters.getFirst("vnp_TxnRef");
        boolean paid = transactionCode != null
                && vnpayService.hasValidSignature(parameters)
                && processVnpayPaymentResult(parameters, transactionCode);

        UriComponentsBuilder redirectBuilder =
                UriComponentsBuilder.fromUriString(frontendReturnUrl)
                        .queryParam("transactionCode",
                                transactionCode == null ? "" : transactionCode)
                        .queryParam("paymentResult", paid ? "verified" : "failed");
        if (transactionCode != null) {
            paymentRepository.findByTransactionCode(transactionCode)
                    .ifPresent(transaction -> {
                        if (transaction.getLanguage() != null) {
                            redirectBuilder.queryParam("lang", transaction.getLanguage());
                        }
                        if ("qr".equals(transaction.getSource())) {
                            redirectBuilder.queryParam("source", "qr");
                        }
                    });
        }
        URI redirect = redirectBuilder.build().encode().toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
    }

    @GetMapping("/vnpay/ipn")
    public Map<String, String> vnpayIpn(
            @RequestParam MultiValueMap<String, String> parameters) {
        if (!vnpayService.hasValidSignature(parameters)) {
            return vnpayResponse("97", "Invalid signature");
        }

        String transactionCode = parameters.getFirst("vnp_TxnRef");
        if (transactionCode == null || transactionCode.isBlank()) {
            return vnpayResponse("01", "Order not found");
        }
        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(transactionCode);
        if (optional.isEmpty()) {
            return vnpayResponse("01", "Order not found");
        }

        PaymentTransaction transaction = optional.get();
        if (!"VNPAY".equals(transaction.getMethod())) {
            return vnpayResponse("01", "Order method mismatch");
        }
        String amount = parameters.getFirst("vnp_Amount");
        if (amount == null
                || !amount.equals(Long.toString(transaction.getAmount() * 100))) {
            return vnpayResponse("04", "Invalid amount");
        }

        if (!"PAID".equals(transaction.getStatus())) {
            if (isSuccessfulVnpayPayment(parameters)) {
                transaction.setStatus("PAID");
                transaction.setPaidAt(LocalDateTime.now());
                transaction.setAccessGranted(true);
            } else if ("PENDING".equals(transaction.getStatus())) {
                transaction.setStatus("FAILED");
            }
            paymentRepository.save(transaction);
        }
        return vnpayResponse("00", "Confirm Success");
    }

    private boolean processVnpayPaymentResult(
            MultiValueMap<String, String> parameters,
            String transactionCode) {
        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(transactionCode);
        if (optional.isEmpty()) {
            return false;
        }

        PaymentTransaction transaction = optional.get();
        String amount = parameters.getFirst("vnp_Amount");
        if (!"VNPAY".equals(transaction.getMethod())
                || amount == null
                || !amount.equals(Long.toString(transaction.getAmount() * 100))) {
            return false;
        }

        if (isSuccessfulVnpayPayment(parameters)) {
            transaction.setStatus("PAID");
            transaction.setPaidAt(LocalDateTime.now());
            transaction.setAccessGranted(true);
            paymentRepository.save(transaction);
            return true;
        }
        if ("PENDING".equals(transaction.getStatus())) {
            transaction.setStatus("FAILED");
            paymentRepository.save(transaction);
        }
        return false;
    }

    private boolean isSuccessfulVnpayPayment(
            MultiValueMap<String, String> parameters) {
        return "00".equals(parameters.getFirst("vnp_ResponseCode"))
                && "00".equals(parameters.getFirst("vnp_TransactionStatus"));
    }

    private Map<String, String> vnpayResponse(String code, String message) {
        return Map.of("RspCode", code, "Message", message);
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

    // Thanh toán Payoo Demo (mô phỏng, không kết nối Payoo thật)
    @PostMapping("/{transactionCode}/payoo-demo/complete")
    public ResponseEntity<?> completePayooDemoPayment(
            @PathVariable String transactionCode,
            @RequestBody PayooDemoRequest request) {

        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(transactionCode);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(message("Không tìm thấy giao dịch"));
        }

        PaymentTransaction transaction = optional.get();

        // Chỉ được cập nhật giao dịch Payoo Demo.
        if (!"PAYOO".equals(transaction.getMethod())) {
            return ResponseEntity.badRequest()
                    .body(message("Giao dịch này không phải Payoo Demo"));
        }

        // Giao dịch đã xử lý thì không được xử lý lại.
        if (!"PENDING".equals(transaction.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(message("Giao dịch không còn ở trạng thái chờ thanh toán"));
        }

        if (request == null || request.getResult() == null) {
            return ResponseEntity.badRequest()
                    .body(message("Thiếu kết quả thanh toán"));
        }

        String result = request.getResult().trim()
                .toUpperCase(java.util.Locale.ROOT);

        if ("SUCCESS".equals(result)) {
            transaction.setStatus("PAID");
            transaction.setPaidAt(LocalDateTime.now());
            transaction.setAccessGranted(true);
        } else if ("CANCEL".equals(result)) {
            transaction.setStatus("FAILED");
            transaction.setAccessGranted(false);
        } else {
            return ResponseEntity.badRequest()
                    .body(message("Kết quả phải là SUCCESS hoặc CANCEL"));
        }

        PaymentTransaction saved = paymentRepository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("transactionCode", saved.getTransactionCode());
        response.put("method", saved.getMethod());
        response.put("status", saved.getStatus());
        response.put("accessGranted", saved.isAccessGranted());
        response.put(
                "message",
                "SUCCESS".equals(result)
                        ? "Thanh toán Payoo Demo thành công"
                        : "Đã hủy giao dịch Payoo Demo"
        );

        return ResponseEntity.ok(response);
    }

    // Request nhận kết quả từ giao diện Payoo Demo.
    public static class PayooDemoRequest {
        private String result;

        public String getResult() {
            return result;
        }

        public void setResult(String result) {
            this.result = result;
        }
    }

    private String generateClaimCode() {
        String code;
        do {
            code = String.format("%06d", random.nextInt(1_000_000));
        } while (paymentRepository.findByClaimCode(code).isPresent());

        return code;
    }

    private String normalizeLanguage(String language) {
        return language != null && language.matches("[a-z]{2}(-[A-Z]{2})?")
                ? language : "vi";
    }

    private Map<String, String> message(String value) {
        Map<String, String> response = new HashMap<>();
        response.put("message", value);
        return response;
    }

    public static class CreatePaymentRequest {
        private Long amount;
        private String method;
        private String language;
        private String source;
        private String sessionId;

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

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getSessionId() {
            return sessionId;
        }

        public void setSessionId(String sessionId) {
            this.sessionId = sessionId;
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
