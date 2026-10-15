
package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Repository.AuthRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.BadPaddingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

@Service
public class AuthServices implements AuthRepository {

//    @Value("${jwt.secret}")
//    private String secret;
//
//    @Value("${jwt.access-expiration}")
//    private Long expiration;
//
//    @Value("${jwt.refresh-expiration}")
//    private Long refreshExpiration;
//
//    // Retained for compatibility with your existing ID encryption.
//    // Move this key to an environment variable in production.
//    private final String secretKey = "F{21d70M586kv`+TL+-x";
//
//    private SecretKey key;
//
//    @PostConstruct
//    public void init() {
//        if (secret == null || secret.isBlank()) {
//            throw new IllegalArgumentException(
//                    "JWT secret is missing."
//            );
//        }
//
//        if (expiration == null || expiration <= 0
//                || refreshExpiration == null
//                || refreshExpiration <= 0) {
//            throw new IllegalArgumentException(
//                    "JWT expiration values must be positive."
//            );
//        }
//
//        // JWT_SECRET must be Base64-encoded and contain
//        // at least 32 random bytes for HS256.
//        this.key = Keys.hmacShaKeyFor(
//                Decoders.BASE64.decode(secret)
//        );
//    }
//
//    @Override
//    public String refreshAccessToken(String refreshToken) {
//
//        if (!isRefreshTokenValid(refreshToken)) {
//            throw new IllegalArgumentException(
//                    "Invalid or expired refresh token"
//            );
//        }
//
//        String username = getUsernameFromToken(refreshToken);
//
//        return generateAccessToken(
//                username,
//                getIpv4FromToken(refreshToken),
//                getIpv6FromToken(refreshToken),
//                getBrowserFromToken(refreshToken),
//                getOsFromToken(refreshToken),
//                getDeviceFromToken(refreshToken)
//        );
//    }
//
//
//    public String generateAccessToken(
//            String username,
//            String ipv4,
//            String ipv6,
//            String browser,
//            String os,
//            String device) {
//
//        return generateToken(
//                username,
//                ipv4,
//                ipv6,
//                browser,
//                os,
//                device,
//                expiration,
//                "access"
//        );
//    }
//
//
//    public String generateRefreshToken(
//            String username,
//            String ipv4,
//            String ipv6,
//            String browser,
//            String os,
//            String device) {
//
//        return generateToken(
//                username,
//                ipv4,
//                ipv6,
//                browser,
//                os,
//                device,
//                refreshExpiration,
//                "refresh"
//        );
//    }
//
//
//    private String generateToken(
//            String username,
//            String ipv4,
//            String ipv6,
//            String browser,
//            String os,
//            String device,
//            long expirationMs,
//            String tokenType) {
//
//        Date now = new Date();
//        Date expiryDate = new Date(
//                now.getTime() + expirationMs
//        );
//
//        return Jwts.builder()
//                .subject(username)
//                .issuedAt(now)
//                .expiration(expiryDate)
//                .claim("tokenType", tokenType)
//                .claim("ipv4", ipv4)
//                .claim("ipv6", ipv6)
//                .claim("browser", browser)
//                .claim("os", os)
//                .claim("device", device)
//                .signWith(key)
//                .compact();
//    }
//
//
//    public Jws<Claims> getClaims(String token) {
//        return Jwts.parser()
//                .verifyWith(key)
//                .build()
//                .parseSignedClaims(token);
//    }
//
//    public String getUsernameFromToken(String token) {
//        return getClaims(token).getPayload().getSubject();
//    }
//
//    public String getIpv4FromToken(String token) {
//        return getClaims(token).getPayload()
//                .get("ipv4", String.class);
//    }
//
//    public String getIpv6FromToken(String token) {
//        return getClaims(token).getPayload()
//                .get("ipv6", String.class);
//    }
//
//    public String getBrowserFromToken(String token) {
//        return getClaims(token).getPayload()
//                .get("browser", String.class);
//    }
//
//    public String getOsFromToken(String token) {
//        return getClaims(token).getPayload()
//                .get("os", String.class);
//    }
//
//    public String getDeviceFromToken(String token) {
//        return getClaims(token).getPayload()
//                .get("device", String.class);
//    }
//
//    public String getTokenType(String token) {
//        return getClaims(token).getPayload()
//                .get("tokenType", String.class);
//    }
//
//
//    public boolean isTokenValid(String token) {
//        try {
//            Claims claims = getClaims(token).getPayload();
//
//            Date expiryDate = claims.getExpiration();
//
//            return expiryDate != null
//                    && expiryDate.after(new Date());
//
//        } catch (JwtException | IllegalArgumentException e) {
//            return false;
//        }
//    }
//
//    public boolean isAccessTokenValid(String token) {
//        try {
//            return isTokenValid(token)
//                    && "access".equals(getTokenType(token));
//        } catch (JwtException | IllegalArgumentException e) {
//            return false;
//        }
//    }
//
//    public boolean isRefreshTokenValid(String token) {
//        try {
//            return isTokenValid(token)
//                    && "refresh".equals(getTokenType(token));
//        } catch (JwtException | IllegalArgumentException e) {
//            return false;
//        }
//    }
//
//
//    @Override
//    public String IdEncrypt(long bookid)
//            throws InvalidKeyException,
//            NoSuchPaddingException,
//            NoSuchAlgorithmException {
//
//        try {
//            String paddedKey = secretKey.substring(0, 16);
//
//            SecretKeySpec keySpec = new SecretKeySpec(
//                    paddedKey.getBytes(StandardCharsets.UTF_8),
//                    "AES"
//            );
//
//            Cipher cipher = Cipher.getInstance("AES");
//            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
//
//            byte[] encryptedBytes = cipher.doFinal(
//                    String.valueOf(bookid)
//                            .getBytes(StandardCharsets.UTF_8)
//            );
//
//            return Base64.getEncoder()
//                    .encodeToString(encryptedBytes);
//
//        } catch (Exception ex) {
//            throw new IllegalStateException(
//                    "ID encryption failed.", ex
//            );
//        }
//    }
//
//    @Override
//    public String IdDecrypt(String encryptedText)
//            throws NoSuchPaddingException,
//            NoSuchAlgorithmException,
//            InvalidKeyException,
//            IllegalBlockSizeException,
//            BadPaddingException {
//
//        try {
//            String paddedKey = secretKey.substring(0, 16);
//
//            SecretKeySpec keySpec = new SecretKeySpec(
//                    paddedKey.getBytes(StandardCharsets.UTF_8),
//                    "AES"
//            );
//
//            Cipher cipher = Cipher.getInstance("AES");
//            cipher.init(Cipher.DECRYPT_MODE, keySpec);
//
//            byte[] decodedBytes = Base64.getDecoder()
//                    .decode(encryptedText);
//
//            byte[] decryptedBytes = cipher.doFinal(decodedBytes);
//
//            return new String(
//                    decryptedBytes,
//                    StandardCharsets.UTF_8
//            );
//
//        } catch (IllegalBlockSizeException
//                 | BadPaddingException ex) {
//            throw ex;
//        } catch (Exception ex) {
//            throw new IllegalStateException(
//                    "ID decryption failed.", ex
//            );
//        }
//    }
}
