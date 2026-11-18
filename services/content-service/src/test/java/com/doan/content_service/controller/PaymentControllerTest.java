package com.doan.content_service.controller;

import com.doan.content_service.model.PaymentTransaction;
import com.doan.content_service.repository.PaymentTransactionRepository;
import com.doan.content_service.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PaymentControllerTest {

    private static final String TEST_HASH_SECRET = "test-vnpay-sandbox-secret";

    @Test
    void createsVnpayPaymentUrlWithAvailableMethodsAndMatchingSignature() throws GeneralSecurityException {
<<<<<<< Updated upstream
        PaymentTransactionRepository repository = mock(PaymentTransactionRepository.class);
        when(repository.save(any(PaymentTransaction.class)))
=======
        PaymentTransactionRepository paymentRepository = mock(PaymentTransactionRepository.class);
        when(paymentRepository.save(any(PaymentTransaction.class)))
>>>>>>> Stashed changes
                .thenAnswer(invocation -> invocation.getArgument(0));

        VnpayService vnpayService = new VnpayService();
        ReflectionTestUtils.setField(
<<<<<<< Updated upstream
                vnpayService, "paymentUrl",
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        ReflectionTestUtils.setField(vnpayService, "tmnCode", "TESTCODE");
        ReflectionTestUtils.setField(vnpayService, "hashSecret", TEST_HASH_SECRET);
        ReflectionTestUtils.setField(
                vnpayService, "returnUrl",
                "http://localhost:3000/payments/vnpay/return");

        PaymentController controller = new PaymentController(repository, vnpayService);
        ReflectionTestUtils.setField(
                controller, "frontendReturnUrl", "http://localhost:5173/payment");
=======
                vnpayService, "paymentUrl", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        ReflectionTestUtils.setField(vnpayService, "tmnCode", "TESTCODE");
        ReflectionTestUtils.setField(vnpayService, "hashSecret", TEST_HASH_SECRET);
        ReflectionTestUtils.setField(
                vnpayService, "returnUrl", "http://localhost:3001/payments/vnpay-return");

        PaymentController controller = new PaymentController(paymentRepository, vnpayService);
>>>>>>> Stashed changes
        HttpServletRequest httpRequest = mock(HttpServletRequest.class);
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");

        PaymentController.CreatePaymentRequest request = new PaymentController.CreatePaymentRequest();
        request.setAmount(50_000L);
        request.setMethod("VNPAY");

        ResponseEntity<?> response = controller.createPayment(request, httpRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        String paymentUrl = (String) body.get("paymentUrl");
        Map<String, String> params = parseQuery(paymentUrl.substring(paymentUrl.indexOf('?') + 1));

        assertThat(params).doesNotContainKey("vnp_BankCode");
        assertThat(params.get("vnp_Amount")).isEqualTo("5000000");

        String suppliedHash = params.remove("vnp_SecureHash");
        String hashData = params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
        assertThat(suppliedHash).isEqualTo(hmacSha512(TEST_HASH_SECRET, hashData));
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> params = new TreeMap<>();
        for (String pair : query.split("&")) {
            String[] parts = pair.split("=", 2);
            params.put(
                    URLDecoder.decode(parts[0], StandardCharsets.UTF_8),
                    URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        return params;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String hmacSha512(String key, String data) throws GeneralSecurityException {
        Mac hmac = Mac.getInstance("HmacSHA512");
        hmac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        return HexFormat.of().formatHex(hmac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
}
