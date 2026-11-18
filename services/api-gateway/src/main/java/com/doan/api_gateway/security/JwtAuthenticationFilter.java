
package com.doan.api_gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class JwtAuthenticationFilter implements HandlerInterceptor {

    private final JwtService jwtService;
private final RestTemplate restTemplate;
private final String authServiceUrl;
private final String internalSecret;

public JwtAuthenticationFilter(
        JwtService jwtService,
        @Value("${AUTH_SERVICE_URL:http://localhost:3004}") String authServiceUrl,
        @Value("${INTERNAL_API_SECRET:}") String internalSecret) {

    this.jwtService = jwtService;
    this.restTemplate = new RestTemplate();
    this.authServiceUrl = authServiceUrl;
    this.internalSecret = internalSecret;
}

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) throws Exception {

        String path = request.getRequestURI();
        String method = request.getMethod();

        boolean manageContent =
                path.equals("/content/contents")
                || path.matches(
                        "/content/contents/[^/]+(/translations/[^/]+)?");

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
            writeError(response, 401,
                    "Thiếu JWT token trong header Authorization");
            return false;
        }

        try {
            String token = authorization.substring(7).trim();
            Claims claims = jwtService.validateToken(token);

            String userId = claims.getSubject();
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);

            if (userId == null || userId.isBlank()) {
                writeError(response, 401, "JWT không có userId hợp lệ");
                return false;
            }

            if ("ADMIN".equals(role)) {
                setUserAttributes(request, userId, username, role, true);
                return true;
            }

            if (!"PROVIDER".equals(role)) {
                writeError(response, 403,
                        "Bạn không có quyền quản lý nội dung");
                return false;
            }

            // Không thể xác minh trạng thái thì từ chối mặc định.
            if (internalSecret == null || internalSecret.isBlank()) {
                writeError(response, 503,
                        "Chưa cấu hình xác minh tài khoản POI Owner");
                return false;
            }

            String url = authServiceUrl
                    + "/auth/poi-owner/internal/verification/"
                    + userId;

            HttpHeaders headers = new HttpHeaders();
            headers.set(
                    "X-Internal-Secret",
                    internalSecret
            );

            ResponseEntity<Map> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Map body = result.getBody();

            if (body == null
                    || !userId.equals(body.get("userId"))
                    || !"PROVIDER".equals(body.get("role"))
                    || !Boolean.TRUE.equals(body.get("poiOwnerVerified"))) {
                writeError(response, 403,
                        "Tài khoản POI Owner chưa được xác minh");
                return false;
            }

            setUserAttributes(request, userId, username, role, true);
            return true;

        } catch (JwtException | IllegalArgumentException e) {
            writeError(response, 401,
                    "JWT token không hợp lệ hoặc đã hết hạn");
            return false;

        } catch (RestClientException e) {
            // Auth service không phản hồi: không cho phép ghi nội dung.
            writeError(response, 503,
                    "Không thể xác minh tài khoản. Vui lòng thử lại sau");
            return false;
        }
    }

    private void setUserAttributes(
            HttpServletRequest request,
            String userId,
            String username,
            String role,
            boolean verified) {

        request.setAttribute("userId", userId);
        request.setAttribute("username", username);
        request.setAttribute("role", role);
        request.setAttribute("poiOwnerVerified", verified);
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            String message) throws Exception {

        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");

        // Tránh lỗi JSON nếu thông báo sau này chứa ký tự đặc biệt.
        String escaped = message
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");

        response.getWriter().write(
                "{\"message\":\"" + escaped + "\"}"
        );
    }
}
