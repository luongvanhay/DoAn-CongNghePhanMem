package com.doan.content_service.controller;

import com.doan.content_service.model.PaymentTransaction;
import com.doan.content_service.repository.PaymentTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentTransactionRepository paymentRepository;
    private final SecureRandom random = new SecureRandom();
    private static final long TICKET_PRICE = 50000L;
    private static final long VNPAY_EXPIRE_MINUTES = 15;

    @Value("${vnp.payUrl}")
    private String vnpPayUrl;

    @Value("${vnp.tmnCode}")
    private String vnpTmnCode;

    @Value("${vnp.hashSecret}")
    private String vnpHashSecret;

    @Value("${vnp.returnUrl}")
    private String vnpReturnUrl;

    @Value("${vnp.frontendReturnUrl}")
    private String vnpFrontendReturnUrl;

    public PaymentController(PaymentTransactionRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    // Tạo giao dịch thanh toán (Hỗ trợ CASH, PAYOO và VNPAY)
    @PostMapping
    public ResponseEntity<?> createPayment(@RequestBody CreatePaymentRequest request) {

        if (request.getAmount() == null || !request.getAmount().equals(TICKET_PRICE)) {
            return ResponseEntity.badRequest()
                    .body(message("Giá vé là 50.000 đồng/lượt"));
        }

        String method = request.getMethod() == null
                ? "" : request.getMethod().trim().toUpperCase();

        if (!method.equals("PAYOO") && !method.equals("CASH") && !method.equals("VNPAY")) {
            return ResponseEntity.badRequest()
                    .body(message("Phương thức phải là PAYOO, CASH hoặc VNPAY"));
        }

        PaymentTransaction transaction = new PaymentTransaction();
        String txnRef = "TX-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        transaction.setTransactionCode(txnRef);
        transaction.setAmount(TICKET_PRICE);
        transaction.setMethod(method);
        transaction.setStatus("PENDING");
        transaction.setAccessGranted(false);
        transaction.setCreatedAt(LocalDateTime.now());

        Map<String, Object> response = new HashMap<>();
        response.put("transactionCode", transaction.getTransactionCode());
        response.put("amount", transaction.getAmount());
        response.put("method", transaction.getMethod());
        response.put("status", transaction.getStatus());
        response.put("accessGranted", transaction.isAccessGranted());

        // Nếu là CASH, tạo Claim code
        if (method.equals("CASH")) {
            transaction.setClaimCode(generateClaimCode());
        }
        // Nếu là VNPAY, tiến hành sinh ra paymentUrl của VNPay
        else if (method.equals("VNPAY")) {
            try {
                String paymentUrl = generateVNPayUrl(txnRef, TICKET_PRICE);
                response.put("paymentUrl", paymentUrl);
                response.put("expiresInSeconds", VNPAY_EXPIRE_MINUTES * 60);
            } catch (IllegalStateException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(message("Vui lòng kiểm tra TMN Code và Hash Secret thuộc cùng merchant VNPay Sandbox."));
            } catch (GeneralSecurityException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(message("Không thể tạo chữ ký thanh toán VNPay."));
            }
        }

        paymentRepository.save(transaction);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Endpoint nhận kết quả trả về từ VNPay (Return URL) - dành cho trình duyệt của khách
    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> vnpayReturn(@RequestParam Map<String, String> queryParams)
            throws GeneralSecurityException {
        String transactionCode = queryParams.get("vnp_TxnRef");
        VNPayResult result = processVNPayResult(queryParams);

        String status;
        if (result.rspCode().equals("97") || result.rspCode().equals("04")) {
            status = "invalid";
        } else if (result.paid()) {
            status = "success";
        } else {
            status = "failed";
        }
        return redirectToPaymentResult(status, transactionCode);
    }

    // IPN: VNPay gọi trực tiếp server-to-server khi khách thanh toán xong.
    // Cần cấu hình IPN URL (địa chỉ public, ví dụ ngrok) trong trang quản trị VNPay Sandbox.
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<Map<String, String>> vnpayIpn(@RequestParam Map<String, String> queryParams) {
        try {
            VNPayResult result = processVNPayResult(queryParams);
            Map<String, String> body = new LinkedHashMap<>();
            body.put("RspCode", result.rspCode());
            body.put("Message", result.message());
            return ResponseEntity.ok(body);
        } catch (GeneralSecurityException e) {
            Map<String, String> body = new LinkedHashMap<>();
            body.put("RspCode", "99");
            body.put("Message", "Unknown error");
            return ResponseEntity.ok(body);
        }
    }

    // Logic dùng chung cho Return URL và IPN: kiểm tra chữ ký, số tiền, rồi cập nhật giao dịch.
    private VNPayResult processVNPayResult(Map<String, String> queryParams)
            throws GeneralSecurityException {
        if (!isValidVNPaySignature(queryParams)) {
            return new VNPayResult("97", "Invalid signature", false);
        }

        Optional<PaymentTransaction> optional =
                paymentRepository.findByTransactionCode(queryParams.get("vnp_TxnRef"));
        if (optional.isEmpty()) {
            return new VNPayResult("01", "Order not found", false);
        }

        PaymentTransaction transaction = optional.get();
        String vnpAmount = queryParams.get("vnp_Amount");
        if (!"VNPAY".equals(transaction.getMethod())
                || vnpAmount == null
                || !String.valueOf(transaction.getAmount() * 100).equals(vnpAmount)) {
            return new VNPayResult("04", "Invalid amount", false);
        }

        if (!"PENDING".equals(transaction.getStatus())) {
            return new VNPayResult("02", "Order already confirmed",
                    "PAID".equals(transaction.getStatus()));
        }

        String transactionStatus = queryParams.get("vnp_TransactionStatus");
        boolean success = "00".equals(queryParams.get("vnp_ResponseCode"))
                && (transactionStatus == null || "00".equals(transactionStatus));

        if (success) {
            transaction.setStatus("PAID");
            transaction.setAccessGranted(true);
            transaction.setPaidAt(LocalDateTime.now());
        } else {
            transaction.setStatus("FAILED");
        }
        paymentRepository.save(transaction);
        return new VNPayResult("00", "Confirm Success", success);
    }

    private record VNPayResult(String rspCode, String message, boolean paid) {}

    // Tra cứu trạng thái giao dịch
    @GetMapping("/{transactionCode}")
    public ResponseEntity<?> getPayment(@PathVariable String transactionCode) {
        Optional<PaymentTransaction> optional = paymentRepository.findByTransactionCode(transactionCode);

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
    public ResponseEntity<?> claimAccess(@RequestBody ClaimRequest request) {
        if (request.getClaimCode() == null || request.getClaimCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(message("Vui lòng nhập Claim code"));
        }

        String claimCode = request.getClaimCode().trim().toUpperCase();

        Optional<PaymentTransaction> claimed = paymentRepository.claimAccess(claimCode, LocalDateTime.now());

        if (claimed.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Cấp quyền truy cập thành công");
            response.put("transactionCode", claimed.get().getTransactionCode());
            response.put("accessGranted", true);

            return ResponseEntity.ok(response);
        }

        Optional<PaymentTransaction> optional = paymentRepository.findByClaimCode(claimCode);

        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(message("Claim code không hợp lệ"));
        }

        PaymentTransaction transaction = optional.get();

        if (!"CASH".equals(transaction.getMethod())) {
            return ResponseEntity.badRequest()
                    .body(message("Claim code không áp dụng cho giao dịch này"));
        }

        if (transaction.getClaimUsedAt() != null || transaction.isAccessGranted()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(message("Claim code đã được sử dụng"));
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(message("Giao dịch chưa được xác nhận thanh toán"));
    }

    // Nhân viên xác nhận đã thu tiền mặt
    @PostMapping("/{transactionCode}/confirm-cash")
    public ResponseEntity<?> confirmCashPayment(@PathVariable String transactionCode) {
        Optional<PaymentTransaction> updated = paymentRepository.markCashPaid(transactionCode, LocalDateTime.now());

        if (updated.isPresent()) {
            PaymentTransaction saved = updated.get();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đã xác nhận thu tiền");
            response.put("transactionCode", saved.getTransactionCode());
            response.put("status", saved.getStatus());
            response.put("claimCode", saved.getClaimCode());

            return ResponseEntity.ok(response);
        }

        Optional<PaymentTransaction> optional = paymentRepository.findByTransactionCode(transactionCode);

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

    // Hàm phụ trợ tạo URL VNPay
    private String generateVNPayUrl(String txnRef, long amount) throws GeneralSecurityException {
        if (vnpTmnCode == null || vnpTmnCode.isBlank()
                || vnpHashSecret == null || vnpHashSecret.isBlank()) {
            throw new IllegalStateException("VNPay Sandbox credentials are not configured.");
        }

        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String orderType = "other";
        long vnpAmount = amount * 100; // VNPay tính bằng VND * 100
        String vnp_IpAddr = "127.0.0.1";

        Map<String, String> vnp_Params = new TreeMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnpTmnCode.trim());
        vnp_Params.put("vnp_Amount", String.valueOf(vnpAmount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", txnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan ve tham quan: " + txnRef);
        vnp_Params.put("vnp_OrderType", orderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", vnpReturnUrl.trim());
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        vnp_Params.put("vnp_CreateDate", now.format(formatter));
        vnp_Params.put("vnp_ExpireDate", now.plusMinutes(VNPAY_EXPIRE_MINUTES).format(formatter));

        String hashData = buildVNPayQuery(vnp_Params);
        String secureHash = hmacSHA512(vnpHashSecret.trim(), hashData);
        return vnpPayUrl.trim() + "?" + hashData + "&vnp_SecureHash=" + secureHash;
    }

    private String hmacSHA512(String key, String data) throws GeneralSecurityException {
        Mac hmac512 = Mac.getInstance("HmacSHA512");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
        hmac512.init(secretKey);
        byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(2 * result.length);
        for (byte b : result) {
            sb.append(String.format("%02x", b & 0xff));
        }
        return sb.toString();
    }

    private boolean isValidVNPaySignature(Map<String, String> queryParams)
            throws GeneralSecurityException {
        String providedHash = queryParams.get("vnp_SecureHash");
        if (providedHash == null || providedHash.isBlank()) {
            return false;
        }

        Map<String, String> signedParams = new TreeMap<>();
        queryParams.forEach((name, value) -> {
            if (name.startsWith("vnp_")
                    && !name.equals("vnp_SecureHash")
                    && !name.equals("vnp_SecureHashType")) {
                signedParams.put(name, value);
            }
        });
        String expectedHash = hmacSHA512(vnpHashSecret.trim(), buildVNPayQuery(signedParams));
        return MessageDigest.isEqual(
                expectedHash.getBytes(StandardCharsets.US_ASCII),
                providedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    private String buildVNPayQuery(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty())
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8)
                        + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
    }

    private ResponseEntity<Void> redirectToPaymentResult(
            String status, String transactionCode) {
        URI location = UriComponentsBuilder.fromUriString(vnpFrontendReturnUrl)
                .queryParam("status", status)
                .queryParam("transactionCode", transactionCode == null ? "" : transactionCode)
                .build()
                .encode()
                .toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(location).build();
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