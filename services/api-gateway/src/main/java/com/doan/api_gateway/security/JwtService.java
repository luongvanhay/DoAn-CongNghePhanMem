
package com.doan.api_gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

@Service
public class JwtService {

    private final SecretKey secretKey;

    public JwtService(Environment environment) {
        String secret = environment.getProperty("JWT_SECRET");

        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "Chua cau hinh bien moi truong JWT_SECRET cho API Gateway"
            );
        }

        byte[] keyBytes = Decoders.BASE64.decode(secret);

        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET phai co it nhat 32 byte"
            );
        }

        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
