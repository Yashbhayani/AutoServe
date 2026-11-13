
package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Repository.AuthRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import javax.management.ObjectName;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

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
    private  QueryHandlerServices queryHandlerServices;
    private final JdbcTemplate jdbcTemplate;

    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public AuthServices(QueryHandlerServices queryHandlerServices,JdbcTemplate jdbcTemplate) { this.queryHandlerServices=queryHandlerServices;this.jdbcTemplate=jdbcTemplate; }

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
                .id(java.util.UUID.randomUUID().toString())
                .subject(username)
            .claim("credentialVersion",credentialVersion(username))
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
            if (!isTokenValid(token) || !"access".equals(getTokenType(token))) return false;
            Claims claims=getClaims(token).getPayload();
            String issuedVersion=claims.get("credentialVersion",String.class);
            String currentVersion=credentialVersion(claims.getSubject());
            return java.util.Objects.equals(issuedVersion,currentVersion);

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public boolean isRefreshTokenValid(String token) {

        try {
            if (!isTokenValid(token) || !"refresh".equals(getTokenType(token))) return false;
            Claims claims=getClaims(token).getPayload();
            String issuedVersion=claims.get("credentialVersion",String.class);
            String currentVersion=credentialVersion(claims.getSubject());
            return java.util.Objects.equals(issuedVersion,currentVersion);

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private String credentialVersion(String username) {
        var rows=jdbcTemplate.queryForList("""
            SELECT COALESCE(e.version,'') AS version
            FROM dev_autoserve.users u LEFT JOIN dev_autoserve.as_auth_epoch e ON e.user_id=u.id
            WHERE u.email=? OR u.username=? ORDER BY CASE WHEN u.email=? THEN 0 ELSE 1 END LIMIT 1
            """,username,username,username);
        return rows.isEmpty()?"":String.valueOf(rows.get(0).get("version"));
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

    @Override
    public Date getTokenExpiration(String token) {
        return getClaims(token)
                .getPayload()
                .getExpiration();
    }

    @Override
    public Map<String, Object> VerifyToken(String authorization) {

        Map<String, Object> response = new HashMap<>();

        try {

            if (authorization == null || authorization.isBlank()) {
                response.put("success", false);
                response.put("message", "Authorization header is required");
                return response;
            }

            if (!authorization.startsWith("Bearer ")) {
                response.put("success", false);
                response.put("message", "Invalid authorization header format");
                return response;
            }

            String token = authorization.substring(7).trim();

            if (token.isEmpty()) {
                response.put("success", false);
                response.put("message", "Access token is required");
                return response;
            }

            if (!isAccessTokenValid(token)) {
                response.put("success", false);
                response.put("message", "Invalid or expired access token");
                return response;
            }

            String username = getUsernameFromToken(token);

            response.put("success", true);
            response.put("message", "Token verified successfully");
            response.put("username", username);

            return response;

        } catch (Exception e) {

            response.put("success", false);
            response.put("message", "Token verification failed");

            return response;
        }

    }



    public Map<String, Object> CheckUserRole(String username) {

        Map<String, Object> response = new HashMap<>();

        try {

            if (username == null || username.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Username is required");
                return response;
            }

            // Get user role from database
            String userRole = queryHandlerServices.GetUserRole(
                    commonQueryServicesModel.GetUserRole,
                    username.trim()
            );

            // Check whether role exists
            if (userRole == null || userRole.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "User role not found");
                return response;
            }

            response.put("success", true);
            response.put("message", "User role retrieved successfully");
            response.put("userRole", userRole.toLowerCase());

        } catch (EmptyResultDataAccessException e) {

            response.put("success", false);
            response.put("message", "No role assigned to this user");

        } catch (Exception e) {

            response.put("success", false);
            response.put("message", "Unable to retrieve user role");
        }

        return response;
    }


    public  boolean CheckthePermission (String PermissionName, String Role ){

        // 4. Check whether the user has ADMIN permission
        boolean hasPermission = queryHandlerServices.CheckRolePermission(
                commonQueryServicesModel.CheckRolePermission,
                PermissionName,
                Role
        );

        return hasPermission;

    }

}
