
package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Repository.AuthRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;

@Service
public class AuthServices implements AuthRepository {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-expiration}")
    private Long expiration;

    @Value("${jwt.refresh-expiration}")
    private Long refreshExpiration;

    // Existing key for ID encryption/decryption
    @Value("${secretKey}")
    private String secretKey;

    private SecretKey key;

    // INITIALIZE JWT SIGNING KEY
    @PostConstruct
    public void init() {

        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException(
                    "JWT secret is missing."
            );
        }

        if (expiration == null || expiration <= 0
                || refreshExpiration == null
                || refreshExpiration <= 0) {
            throw new IllegalArgumentException(
                    "JWT expiration values must be positive."
            );
        }

        final byte[] decodedSecret;

        try {
            decodedSecret = Decoders.BASE64.decode(secret);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(
                    "JWT secret must be a valid Base64-encoded key.",
                    e
            );
        }

        // Require at least 256 bits for HMAC signing.
        if (decodedSecret.length < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must decode to at least 32 bytes."
            );
        }

        this.key = Keys.hmacShaKeyFor(decodedSecret);
    }

    // GENERATE ACCESS TOKEN
    @Override
    public String generateAccessToken(String username) {

        return generateToken(
                username,
                expiration,
                "access"
        );
    }

    // GENERATE REFRESH TOKEN
    @Override
    public String generateRefreshToken(String username) {

        return generateToken(
                username,
                refreshExpiration,
                "refresh"
        );
    }

    // COMMON TOKEN GENERATION
    private String generateToken(
            String username,
            long expirationMs,
            String tokenType) {

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Email/username cannot be empty."
            );
        }

        Date now = new Date();

        Date expiryDate = new Date(
                now.getTime() + expirationMs
        );

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiryDate)
                .claim("tokenType", tokenType)
                .signWith(key)
                .compact();
    }

    // REFRESH ACCESS TOKEN
    @Override
    public String refreshAccessToken(String refreshToken) {

        if (!isRefreshTokenValid(refreshToken)) {
            throw new IllegalArgumentException(
                    "Invalid or expired refresh token."
            );
        }

        String username = getUsernameFromToken(refreshToken);

        return generateAccessToken(username);
    }

    // EXTRACT JWT CLAIMS
    @Override
    public Jws<Claims> getClaims(String token) {

        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }

    @Override
    public String getUsernameFromToken(String token) {

        return getClaims(token)
                .getPayload()
                .getSubject();
    }

    @Override
    public String getTokenType(String token) {

        return getClaims(token)
                .getPayload()
                .get("tokenType", String.class);
    }

    // VALIDATE TOKEN
    @Override
    public boolean isTokenValid(String token) {

        try {
            Claims claims = getClaims(token).getPayload();

            Date expiryDate = claims.getExpiration();

            return expiryDate != null
                    && expiryDate.after(new Date());

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public boolean isAccessTokenValid(String token) {

        try {
            return isTokenValid(token)
                    && "access".equals(getTokenType(token));

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public boolean isRefreshTokenValid(String token) {

        try {
            return isTokenValid(token)
                    && "refresh".equals(getTokenType(token));

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // ENCRYPT ID
    @Override
    public String IdEncrypt(String data)
            throws InvalidKeyException,
            NoSuchPaddingException,
            NoSuchAlgorithmException {

        try {
            if (secretKey == null || secretKey.length() < 16) {
                throw new IllegalArgumentException(
                        "ID encryption key must contain at least 16 characters."
                );
            }

            String paddedKey = secretKey.substring(0, 16);

            SecretKeySpec keySpec = new SecretKeySpec(
                    paddedKey.getBytes(StandardCharsets.UTF_8),
                    "AES"
            );

            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);

            byte[] encryptedBytes = cipher.doFinal(
                    String.valueOf(data)
                            .getBytes(StandardCharsets.UTF_8)
            );

            return Base64.getEncoder()
                    .encodeToString(encryptedBytes);

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "ID encryption failed.",
                    ex
            );
        }
    }

    // DECRYPT ID
    @Override
    public String IdDecrypt(String encryptedText)
            throws NoSuchPaddingException,
            NoSuchAlgorithmException,
            InvalidKeyException,
            IllegalBlockSizeException,
            BadPaddingException {

        try {
            if (secretKey == null || secretKey.length() < 16) {
                throw new IllegalArgumentException(
                        "ID encryption key must contain at least 16 characters."
                );
            }

            String paddedKey = secretKey.substring(0, 16);

            SecretKeySpec keySpec = new SecretKeySpec(
                    paddedKey.getBytes(StandardCharsets.UTF_8),
                    "AES"
            );

            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec);

            byte[] decodedBytes = Base64.getDecoder()
                    .decode(encryptedText);

            byte[] decryptedBytes = cipher.doFinal(decodedBytes);

            return new String(
                    decryptedBytes,
                    StandardCharsets.UTF_8
            );

        } catch (IllegalBlockSizeException | BadPaddingException ex) {
            throw ex;

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "ID decryption failed.",
                    ex
            );
        }
    }
}
