
package com.doan.content_service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtAuthenticationInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;

    public JwtAuthenticationInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }


@Override
public boolean preHandle(
        HttpServletRequest request,
        HttpServletResponse response,
        Object handler) throws Exception {

    String method = request.getMethod();
    String path = request.getRequestURI();

    boolean readVisitLog =
            HttpMethod.GET.matches(method) && path.equals("/visits/recent");
    boolean confirmCashPayment =
            HttpMethod.POST.matches(method)
                    && path.matches("/payments/[^/]+/confirm-cash");
    boolean readPendingCashPayments =
            HttpMethod.GET.matches(method) && path.equals("/payments/cash/pending");
    boolean writeRequest =
            HttpMethod.POST.matches(method)
            || HttpMethod.PUT.matches(method)
            || HttpMethod.PATCH.matches(method)
            || HttpMethod.DELETE.matches(method);

    if (!writeRequest && !readVisitLog && !readPendingCashPayments) {
        return true;
    }

    // Các endpoint quản lý nội dung hiện có.
    boolean manageContent =
            path.equals("/contents")
            || path.matches("/contents/[^/]+(/translations/[^/]+)?");

    if (!manageContent && !readVisitLog
            && !confirmCashPayment && !readPendingCashPayments) {
        return true;
    }

    String authorization = request.getHeader("Authorization");

    if (authorization == null
            || !authorization.startsWith("Bearer ")
            || authorization.substring(7).trim().isEmpty()) {
        writeError(response, 401,
                "Thieu JWT token trong header Authorization");
        return false;
    }

    String token = authorization.substring(7).trim();

    try {
        Claims claims = jwtService.validateTokenAndGetClaims(token);

        String userId = claims.getSubject();
        String role = claims.get("role", String.class);
        String username = claims.get("username", String.class);

        boolean adminOnly =
                readVisitLog || confirmCashPayment || readPendingCashPayments;
        boolean allowedRole = adminOnly
                ? "ADMIN".equals(role)
                : ("ADMIN".equals(role) || "PROVIDER".equals(role));

        if (userId == null || userId.isBlank() || !allowedRole) {
            writeError(response, 403,
                    readVisitLog
                            ? "Chi ADMIN moi duoc xem lich su truy cap"
                            : confirmCashPayment
                                    ? "Chi ADMIN moi duoc xac nhan thanh toan tien mat"
                                    : readPendingCashPayments
                                            ? "Chi ADMIN moi duoc xem giao dich tien mat"
                            : "Tai khoan khong co quyen quan ly noi dung");
            return false;
        }

        request.setAttribute("userId", userId);
        request.setAttribute("username", username);
        request.setAttribute("role", role);

        return true;

    } catch (JwtException | IllegalArgumentException e) {
        writeError(response, 401,
                "JWT token khong hop le hoac da het han");
        return false;
    }
}


    private void writeError(
            HttpServletResponse response,
            int status,
            String message) throws Exception {

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"message\":\"" + message + "\"}"
        );
    }
}
