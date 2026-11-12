package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.*;
import java.util.HashMap;
import java.util.Map;
import java.sql.Statement;
import java.util.*;


/*CALL dev_autoserve.GetUsersWithPagination(
    '{"page_number":1,"page_size":10}'
);*/

@Service
public class UserServices implements UserRepository {
    @Autowired
    private  QueryHandlerServices queryHandlerServices;
    private JdbcTemplate jdbcTemplate;
    private PasswordServices passwordServices;
    private AuthServices authServices;
    public String SpResult = null;

    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  UserServices(AuthServices authServices,
                         QueryHandlerServices queryHandlerServices,
                         JdbcTemplate jdbcTemplate,
                         PasswordServices passwordServices){
        this.authServices = authServices;
        this.queryHandlerServices  = queryHandlerServices;
        this.jdbcTemplate = jdbcTemplate;
        this.passwordServices = passwordServices;
    }



    @Override
    public Map<String, Object> AddUser(User userModel, HttpServletResponse responses) {

        Map<String, Object> response = new HashMap<>();

        try {

            String Query  =queryHandlerServices.CheckDublicatResult(commonQueryServicesModel.CheckDublicateMail,userModel.getEmail().toLowerCase());
            if ("TRUE".equalsIgnoreCase(Query)) {
                response.put("success", false);
                response.put("message", "Email address already exists");
                return response;
            }

           String EncryptedPass = passwordServices.EncryptPassword(userModel.getPasswordHash());

            System.out.println(EncryptedPass.toString());
            KeyHolder keyHolderForUser = new GeneratedKeyHolder();

            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(commonQueryServicesModel.InsertUser, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, userModel.getEmail().replaceAll("@.*", "").toLowerCase());
                ps.setString(2, userModel.getEmail().toLowerCase());
                ps.setString(3, userModel.getFirst_name());
                ps.setString(4, userModel.getLast_name());
                ps.setString(5, userModel.getPhone());
                ps.setString(6, userModel.getDriving_license_number().toLowerCase());
                ps.setString(7, EncryptedPass);//userModel.getPasswordHash()
                ps.setBoolean(8, userModel.getIsEmailVerified());
                ps.setBoolean(9, userModel.getIsPhoneVerified());
                ps.setBoolean(10, userModel.getIsActive());
                return ps;
            }, keyHolderForUser);
            Long generatedId = keyHolderForUser.getKey().longValue();

            if(generatedId <= 1){
                response.put("success", true);
                response.put("message", "Data Not Added!");
            }

            short roleId = queryHandlerServices.GetRole(
                    commonQueryServicesModel.GetRole,
                    ProjectCodes.RoleEnum.CUSTOMER.name()
            );

            KeyHolder keyHolderUserRole = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(commonQueryServicesModel.InsertUserRole, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, generatedId);
                ps.setShort(2, roleId);
                return ps;
            }, keyHolderUserRole);

            Long UserRoleID = keyHolderUserRole.getKey().longValue();
            if(UserRoleID <= 1){
                response.put("success", false);
                response.put("message", "Data Not Added!");
            }

            String username = userModel.getEmail().trim().toLowerCase();

            String accessToken =
                    authServices.generateAccessToken(username);

            String refreshToken =
                    authServices.generateRefreshToken(username);

            // Save token hash and expiration in refresh_tokens
            saveRefreshToken(generatedId, refreshToken);



            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("access-token", accessToken);
            response.put("refresh-token", refreshToken);
            response.put("expiresIn", 900);



        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }

        return response;
    }

    @Override
    public Map<String, Object> Login(LogIn logIn) {
        Map<String, Object> response = new HashMap<>();

        try {

            String email = logIn.getEmail().trim().toLowerCase();

            List<Map<String, Object>> users =
                    jdbcTemplate.queryForList(
                            commonQueryServicesModel.LoginUser,
                            email                    );

            if (users.isEmpty()) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return response;
            }


            Map<String, Object> user = users.get(0);

            String storedHash = (String) user.get("password_hash");
            Object activeValue = user.get("is_active");

            boolean active = activeValue instanceof Boolean
                    ? (Boolean) activeValue
                    : activeValue instanceof Number
                    && ((Number) activeValue).intValue() == 1;

            if (!passwordServices.MatchPassword(
                    logIn.getPasswordHash(), storedHash)) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return response;
            }

            if (!active) {
                response.put("success", false);
                response.put("message", "Account is inactive");
                return response;
            }

            // Use the full email as the JWT subject

            String accessToken =
                    authServices.generateAccessToken(email);

            String refreshToken =
                    authServices.generateRefreshToken(email);

            // Save the refresh token session in the database
            Number userIdValue = (Number) user.get("id");
            Long userId = userIdValue.longValue();

            saveRefreshToken(userId, refreshToken);

            user.remove("password_hash");

            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", user);
            response.put("access-token", accessToken);
            response.put("refresh-token", refreshToken);
            response.put("expiresIn", 900);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed");
        }

        return response;
    }

    @Override
    public Map<String, Object> EditUser(User userModel, String Authusername) {
        Map<String, Object> response = new HashMap<>();

        try {



            int rows = jdbcTemplate.update(
                    commonQueryServicesModel.EditUser,
                    userModel.getFirst_name(),
                    userModel.getLast_name(),
                    userModel.getPhone(),
                    userModel.getDriving_license_number(),
                    userModel.getId()
            );

            if (rows == 0) {
                response.put("success", false);
                response.put("message", "User not found");
            } else {
                response.put("success", true);
                response.put("message", "User updated successfully");
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update user");
        }

        return response;
    }

    @Override
    public Map<String, Object> deleteUser(Long id) {
        Map<String, Object> response = new HashMap<>();

        try {
            int rows = jdbcTemplate.update(
                    commonQueryServicesModel.DeleteUser,
                    id
            );

            if (rows > 0) {
                response.put("success", true);
                response.put("message", "User deactivated successfully");
            } else {
                response.put("success", false);
                response.put("message", "User not found or already inactive");
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to deactivate user");
        }

        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> RefreshAccessToken(String refreshToken) {

        Map<String, Object> response = new HashMap<>();

        try {
            if (refreshToken == null
                    || refreshToken.isBlank()
                    || !authServices.isRefreshTokenValid(refreshToken)
                    || !isRefreshTokenActive(refreshToken)) {

                response.put("success", false);
                response.put("message", "Invalid, expired, or revoked refresh token");
                return response;
            }

            String tokenHash = hashRefreshToken(refreshToken);

            Long userId = jdbcTemplate.queryForObject(
                    """
                    SELECT user_id
                    FROM refresh_tokens
                    WHERE token_hash = ?
                      AND is_active = TRUE
                      AND expires_at > CURRENT_TIMESTAMP(3)
                    """,
                    Long.class,
                    tokenHash
            );

            String username =
                    authServices.getUsernameFromToken(refreshToken);

            // Deactivate the old token; do not delete its record
            if (deactivateRefreshToken(refreshToken) == 0) {
                response.put("success", false);
                response.put("message", "Refresh token has already been revoked");
                return response;
            }

            String newAccessToken =
                    authServices.generateAccessToken(username);

            String newRefreshToken =
                    authServices.generateRefreshToken(username);

            saveRefreshToken(userId, newRefreshToken);

            response.put("success", true);
            response.put("access-token", newAccessToken);
            response.put("refresh-token", newRefreshToken);
            response.put("expiresIn", 900);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Unable to refresh session");
        }

        return response;
    }

    public Map<String, Object> Logout(String refreshToken) {

        Map<String, Object> response = new HashMap<>();

        if (refreshToken == null
                || refreshToken.isBlank()
                || !authServices.isRefreshTokenValid(refreshToken)) {

            response.put("success", false);
            response.put("message", "Invalid refresh token");
            return response;
        }

        int rows = deactivateRefreshToken(refreshToken);

        response.put("success", rows > 0);
        response.put(
                "message",
                rows > 0
                        ? "Logged out successfully"
                        : "Refresh token is already inactive"
        );

        return response;
    }

    // Store only the SHA-256 hash, never the original JWT
    private String hashRefreshToken(String refreshToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    refreshToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "Unable to hash refresh token", e
            );
        }
    }

    // Save a refresh token in the database
    private void saveRefreshToken(Long userId, String refreshToken) {

        String tokenHash = hashRefreshToken(refreshToken);

        Timestamp expiresAt = new Timestamp(
                authServices.getTokenExpiration(refreshToken).getTime()
        );

        String query = """
            INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, is_active)
            VALUES (?, ?, ?, TRUE)
            """;

        jdbcTemplate.update(
                query,
                userId,
                tokenHash,
                expiresAt
        );
    }

    // Check whether a refresh token is active in the database
    private boolean isRefreshTokenActive(String refreshToken) {

        String tokenHash = hashRefreshToken(refreshToken);

        String query = """
            SELECT COUNT(*)
            FROM refresh_tokens
            WHERE token_hash = ?
              AND is_active = TRUE
              AND expires_at > CURRENT_TIMESTAMP(3)
            """;

        Integer count = jdbcTemplate.queryForObject(
                query,
                Integer.class,
                tokenHash
        );

        return count != null && count > 0;
    }

    // Deactivate a refresh token without deleting its record
    private int deactivateRefreshToken(String refreshToken) {

        String tokenHash = hashRefreshToken(refreshToken);

        String query = """
            UPDATE refresh_tokens
            SET is_active = FALSE
            WHERE token_hash = ?
              AND is_active = TRUE
            """;

        return jdbcTemplate.update(query, tokenHash);
    }


}
