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

import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;

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
            if("TRUE".equals(Query)){
                response.put("success", true);
                response.put("message", "Email Address Already adeed!");
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
                ps.setString(7, userModel.getPasswordHash());
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
                response.put("success", true);
                response.put("message", "Data Not Added!");
            }

            response.put("success", true);
            response.put("message", "User data received");

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
            List<Map<String, Object>> users =
                    jdbcTemplate.queryForList(
                            commonQueryServicesModel.LoginUser,
                            logIn.getEmail()
                    );

            if (users.isEmpty()) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return response;
            }


            Map<String, Object> user = users.get(0);

            String storedHash = (String) user.get("password_hash");
            Boolean active = (Boolean) user.get("is_active");

            if (!passwordServices.MatchPassword(
                    logIn.getPasswordHash(), storedHash)) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return response;
            }

            if (!Boolean.TRUE.equals(active)) {
                response.put("success", false);
                response.put("message", "Account is inactive");
                return response;
            }

            user.remove("password_hash");

            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", user);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed");
        }

        return response;
    }

    @Override
    public Map<String, Object> EditUser(User userModel) {
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

}
