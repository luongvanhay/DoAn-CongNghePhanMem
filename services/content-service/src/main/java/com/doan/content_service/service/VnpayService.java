package com.doan.content_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class VnpayService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    @Value("${payment.vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String paymentUrl;

    @Value("${payment.vnpay.tmn-code:}")
    private String tmnCode;

    @Value("${payment.vnpay.hash-secret:}")
    private String hashSecret;

    @Value("${payment.vnpay.return-url:http://localhost:3000/payments/vnpay/return}")
    private String returnUrl;

    public boolean isConfigured() {
        return !tmnCode.isBlank() && !hashSecret.isBlank();
    }

    public String createPaymentUrl(
            String transactionCode,
            long amount,
            String clientIpAddress) {
        if (!isConfigured()) {
            throw new IllegalStateException("Chưa cấu hình tài khoản VNPay.");
        }

        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        Map<String, String> parameters = new TreeMap<>();
        parameters.put("vnp_Version", "2.1.0");
        parameters.put("vnp_Command", "pay");
        parameters.put("vnp_TmnCode", tmnCode);
        parameters.put("vnp_Amount", Long.toString(amount * 100));
        parameters.put("vnp_CurrCode", "VND");
        parameters.put("vnp_TxnRef", transactionCode);
        parameters.put("vnp_OrderInfo", "Thanh toan ve tham quan " + transactionCode);
        parameters.put("vnp_OrderType", "other");
        parameters.put("vnp_Locale", "vn");
        parameters.put("vnp_BankCode", "VNPAYQR");
        parameters.put("vnp_ReturnUrl", returnUrl);
        parameters.put("vnp_IpAddr", normalizeIpAddress(clientIpAddress));
        parameters.put("vnp_CreateDate", VNPAY_DATE.format(now));
        parameters.put("vnp_ExpireDate", VNPAY_DATE.format(now.plusMinutes(15)));

        String query = toQueryString(parameters);
        return paymentUrl + "?" + query
                + "&vnp_SecureHash=" + hmacSha512(hashSecret, query);
    }

    public boolean hasValidSignature(MultiValueMap<String, String> requestParameters) {
        String receivedHash = requestParameters.getFirst("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank() || hashSecret.isBlank()) {
            return false;
        }

        Map<String, String> parameters = new TreeMap<>();
        requestParameters.forEach((key, values) -> {
            if (!key.equals("vnp_SecureHash")
                    && !key.equals("vnp_SecureHashType")
                    && values != null
                    && !values.isEmpty()) {
                parameters.put(key, values.get(0));
            }
        });

        byte[] expected = hmacSha512(hashSecret, toQueryString(parameters))
                .getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(
                expected, receivedHash.getBytes(StandardCharsets.US_ASCII));
    }

    private static String toQueryString(Map<String, String> parameters) {
        return parameters.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String normalizeIpAddress(String address) {
        if (address == null || address.isBlank()
                || address.equals("::1")
                || address.equals("0:0:0:0:0:0:0:1")) {
            return "127.0.0.1";
        }
        return address;
    }

    private static String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(
                    key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] digest = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexadecimal = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                hexadecimal.append(String.format("%02x", value & 0xff));
            }
            return hexadecimal.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể ký yêu cầu VNPay", exception);
        }
    }
}
