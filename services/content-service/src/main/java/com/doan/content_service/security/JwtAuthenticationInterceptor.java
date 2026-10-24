
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

    boolean writeRequest =
            HttpMethod.POST.matches(method)
            || HttpMethod.PUT.matches(method)
            || HttpMethod.PATCH.matches(method)
            || HttpMethod.DELETE.matches(method);

    if (!writeRequest) {
        return true;
    }

    // Endpoint xác nhận đã thu tiền mặt.
    boolean confirmCash =
            HttpMethod.POST.matches(method)
            && path.matches("/payments/[^/]+/confirm-cash");

    // Các endpoint quản lý nội dung hiện có.
    boolean manageContent =
            path.equals("/contents")
            || path.matches("/contents/[^/]+(/translations/[^/]+)?");

    if (!confirmCash && !manageContent) {
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

        boolean allowedRole = confirmCash
                ? "ADMINSTAFF".equals(role)
                : ("ADMIN".equals(role) || "PROVIDER".equals(role));

        if (userId == null || userId.isBlank() || !allowedRole) {
            writeError(response, 403,
                    confirmCash
                            ? "Chi ADMINSTAFF moi duoc xac nhan tien mat"
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
