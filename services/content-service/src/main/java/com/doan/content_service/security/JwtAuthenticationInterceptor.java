
package com.doan.content_service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class JwtAuthenticationInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final RestTemplate restTemplate;

    @Value("${AUTH_SERVICE_URL:http://auth-service:3004}")
    private String authServiceUrl;

    @Value("${INTERNAL_API_SECRET:}")
    private String internalApiSecret;

    public JwtAuthenticationInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) throws Exception {

        String method = request.getMethod();
        String path = request.getRequestURI();

        boolean readVisitLog =
                HttpMethod.GET.matches(method)
                        && path.equals("/visits/recent");

        boolean readVisitStats =
                HttpMethod.GET.matches(method)
                        && path.equals("/visits/stats");

        boolean readActiveVisitors =
                HttpMethod.GET.matches(method)
                        && path.equals("/visits/active");

        boolean readPaymentStats =
                HttpMethod.GET.matches(method)
                        && path.equals("/payments/stats");

        boolean confirmCashPayment =
                HttpMethod.POST.matches(method)
                        && path.matches("/payments/[^/]+/confirm-cash");

        boolean readPendingCashPayments =
                HttpMethod.GET.matches(method)
                        && path.equals("/payments/cash/pending");

        boolean readVnpayPayments =
                HttpMethod.GET.matches(method)
                        && path.equals("/payments/vnpay");

        boolean writeRequest =
                HttpMethod.POST.matches(method)
                        || HttpMethod.PUT.matches(method)
                        || HttpMethod.PATCH.matches(method)
                        || HttpMethod.DELETE.matches(method);

        boolean manageContent =
                path.equals("/contents")
                        || path.equals("/contents/mine")
                        || path.matches(
                                "/contents/[^/]+(/translations/[^/]+)?");

        if (!manageContent && !readVisitLog && !readVisitStats && !readActiveVisitors
                && !readPaymentStats
                && !confirmCashPayment && !readPendingCashPayments
                && !readVnpayPayments) {
            return true;
        }

        // GET /contents/mine cũng phải có JWT.
        boolean protectedContentRead =
                HttpMethod.GET.matches(method)
                        && path.equals("/contents/mine");

        if (!writeRequest && !readVisitLog && !readVisitStats && !readActiveVisitors
                && !readPaymentStats
                && !readPendingCashPayments
                && !confirmCashPayment
                && !readVnpayPayments
                && !protectedContentRead) {
            return true;
        }

        String authorization = request.getHeader("Authorization");

        if (authorization == null
                || !authorization.startsWith("Bearer ")
                || authorization.substring(7).trim().isEmpty()) {
            writeError(response, HttpStatus.UNAUTHORIZED.value(),
                    "Thieu JWT token trong header Authorization");
            return false;
        }

        String token = authorization.substring(7).trim();

        try {
            Claims claims = jwtService.validateTokenAndGetClaims(token);

            String userId = claims.getSubject();
            String role = claims.get("role", String.class);
            String username = claims.get("username", String.class);

            boolean adminOnly = readVisitLog || readVisitStats || readActiveVisitors
                    || readPaymentStats || readVnpayPayments;
            boolean staffPaymentOperation =
                    confirmCashPayment || readPendingCashPayments;

            boolean allowedRole = adminOnly
                    ? "ADMIN".equals(role)
                    : staffPaymentOperation
                            ? ("ADMIN".equals(role)
                                || "ADMINSTAFF".equals(role))
                            : ("ADMIN".equals(role)
                                || "PROVIDER".equals(role));

            if (userId == null || userId.isBlank() || !allowedRole) {
                writeError(response, HttpStatus.FORBIDDEN.value(),
                        readVisitStats || readVisitLog || readActiveVisitors
                                || readPaymentStats
                                ? "Chi ADMIN moi duoc xem thong ke va lich su truy cap"
                                : "Tai khoan khong co quyen thuc hien thao tac");
                return false;
            }

            request.setAttribute("userId", userId);
            request.setAttribute("username", username);
            request.setAttribute("role", role);

            // ADMIN không cần xác minh quyền chủ địa điểm.
            if ("ADMIN".equals(role)) {
                request.setAttribute("poiOwnerVerified", true);
                return true;
            }

            // PROVIDER chỉ được quản lý nội dung nếu đã được duyệt.
            if (manageContent) {
                Boolean verified = checkProviderVerification(userId);

                request.setAttribute("poiOwnerVerified",
                        Boolean.TRUE.equals(verified));

                if (!Boolean.TRUE.equals(verified)) {
                    writeError(response, HttpStatus.FORBIDDEN.value(),
                            "Tai khoan chu dia diem chua duoc Admin xac minh");
                    return false;
                }
            }

            return true;

        } catch (JwtException | IllegalArgumentException e) {
            writeError(response, HttpStatus.UNAUTHORIZED.value(),
                    "JWT token khong hop le hoac da het han");
            return false;
        } catch (RestClientException e) {
            writeError(response, HttpStatus.SERVICE_UNAVAILABLE.value(),
                    "Khong the xac minh tai khoan voi auth-service");
            return false;
        }
    }

    private Boolean checkProviderVerification(String userId) {
        if (internalApiSecret == null || internalApiSecret.isBlank()) {
            throw new IllegalStateException(
                    "INTERNAL_API_SECRET chua duoc cau hinh");
        }

        String url = authServiceUrl
                + "/auth/poi-owner/internal/verification/"
                + userId;

        org.springframework.http.HttpHeaders headers =
                new org.springframework.http.HttpHeaders();
        headers.set("X-Internal-Secret", internalApiSecret);

        org.springframework.http.HttpEntity<Void> entity =
                new org.springframework.http.HttpEntity<>(headers);

        org.springframework
                .http.ResponseEntity<Map> result =
                restTemplate.exchange(
                        url,
                        HttpMethod.GET,
                        entity,
                        Map.class);

        if (!result.getStatusCode().is2xxSuccessful()
                || result.getBody() == null) {
            return false;
        }

        Object role = result.getBody().get("role");
        Object verified = result.getBody().get("poiOwnerVerified");

        return "PROVIDER".equals(role)
                && Boolean.TRUE.equals(verified);
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String message) throws Exception {

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"message\":\"" + message + "\"}");
    }
}
