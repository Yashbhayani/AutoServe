
package com.example.DevAutoServ.Repository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

public interface AuthRepository {

    // Generate access token using email/username.
    // JWT includes tokenType = "access" and an expiration claim.
    String generateAccessToken(String username);

    // Generate refresh token using email/username.
    // JWT includes tokenType = "refresh" and an expiration claim.
    String generateRefreshToken(String username);

    // Extract username/email from token.
    String getUsernameFromToken(String token);

    // Extract token type: "access" or "refresh".
    String getTokenType(String token);

    // Parse JWT claims, including expiration.
    Jws<Claims> getClaims(String token);

    // Validate token and expiration.
    boolean isTokenValid(String token);

    // Validate access token type and expiration.
    boolean isAccessTokenValid(String token);

    // Validate refresh token type and expiration.
    boolean isRefreshTokenValid(String token);

    // Generate a new access token from a valid refresh token.
    String refreshAccessToken(String refreshToken);

    // Existing ID encryption methods.
    String IdEncrypt(String data)
            throws InvalidKeyException,
            NoSuchPaddingException,
            NoSuchAlgorithmException;

    String IdDecrypt(String encryptedText)
            throws NoSuchPaddingException,
            NoSuchAlgorithmException,
            InvalidKeyException,
            IllegalBlockSizeException,
            BadPaddingException;
}
