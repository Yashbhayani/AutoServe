
package com.example.DevAutoServ.Repository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

public interface AuthRepository {
    // Generate access token
    String generateAccessToken(
            String username,
            String ipv4,
            String ipv6,
            String browser,
            String os,
            String device
    );

    // Generate refresh token
//    String generateRefreshToken(
//            String username,
//            String ipv4,
//            String ipv6,
//            String browser,
//            String os,
//            String device
//    );


    // Extract token information
    String getUsernameFromToken(String token);

    String getIpv4FromToken(String token);

    String getIpv6FromToken(String token);

    String getBrowserFromToken(String token);

    String getOsFromToken(String token);

    String getDeviceFromToken(String token);

    String getTokenType(String token);

    // Parse JWT claims
    Jws<Claims> getClaims(String token);

    // Validate token and token type
    boolean isTokenValid(String token);

    boolean isAccessTokenValid(String token);

    boolean isRefreshTokenValid(String token);

    // Generate a new access token from a valid refresh token
    String refreshAccessToken(String refreshToken);

    // Existing ID encryption methods
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
