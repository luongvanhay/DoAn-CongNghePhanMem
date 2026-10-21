
package com.doan.api_gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtAuthenticationFilter implements HandlerInterceptor {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) throws Exception {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Chỉ bảo vệ các thao tác quản lý nội dung.
        boolean manageContent =
                path.equals("/content/contents")
                || path.matches("/content/contents/\\d+");

        boolean writeMethod =
                HttpMethod.POST.matches(method)
                || HttpMethod.PUT.matches(method)
                || HttpMethod.PATCH.matches(method)
                || HttpMethod.DELETE.matches(method);

        if (!manageContent || !writeMethod) {
            return true;
        }

        String authorization = request.getHeader("Authorization");

        if (authorization == null
                || !authorization.startsWith("Bearer ")
                || authorization.substring(7).trim().isEmpty()) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Thiếu JWT token trong header Authorization");
            return false;
        }

        String token = authorization.substring(7).trim();

        try {
            Claims claims = jwtService.validateToken(token);
            String role = claims.get("role", String.class);

            if (!"PROVIDER".equals(role) && !"ADMIN".equals(role)) {
                writeError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Bạn không có quyền quản lý nội dung");
                return false;
            }

            request.setAttribute("userId", claims.getSubject());
            request.setAttribute("username",
                    claims.get("username", String.class));
            request.setAttribute("role", role);

            return true;

        } catch (JwtException | IllegalArgumentException e) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "JWT token không hợp lệ hoặc đã hết hạn");
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
