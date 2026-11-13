package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.QueryHandlerServices;
import com.example.DevAutoServ.Services.ReportsServices;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/user")
public class UserController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private QueryHandlerServices queryHandlerServices;
    private  final UserRepository userRepository;
    private  final AuthServices authServices;
    private  final ReportsServices reportsServices;
     CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  UserController(UserRepository userRepository,
                           AuthServices authServices, ReportsServices reportsServices){
        this.userRepository = userRepository;
        this.authServices = authServices;
        this.reportsServices = reportsServices;
    }

    @PostMapping("/add")
    public Map<String, Object> AddUser(@RequestBody User userModel, HttpServletResponse responses){
        return userRepository.AddUser(userModel, responses);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LogIn logIn){
        return userRepository.Login(logIn);
    }

    @PutMapping("/edit/{id}")
    public Map<String, Object> EditUser(        @PathVariable Long id,
                                                @RequestBody User userModel,
                                                @RequestHeader(value = "Authorization", required = false)
                                                        String authorization) {
        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }
        String loggedInUsername =
                tokenResponse.get("username").toString();

        userModel.setId(id);

        Map<String, Object> getUserRole = authServices.CheckUserRole(loggedInUsername);
        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }

        String userRole = getUserRole.get("userRole").toString();


        // ADMIN can update any user
        if (
                userRole.equalsIgnoreCase(ProjectCodes.RoleEnum.ADMIN.name())
                &&
                authServices.CheckthePermission(
                            ProjectCodes.PermissionEnum.USER_UPDATE_ALL.name(),
                            ProjectCodes.RoleEnum.ADMIN.name()
                    )) {
                userModel.setId(id);
                return userRepository.EditUser(
                        userModel,
                        loggedInUsername
                );

        }

        // CUSTOMER and TECHNICIAN can update only themselves
        if (userRole.equalsIgnoreCase(
                ProjectCodes.RoleEnum.CUSTOMER.name())
                || userRole.equalsIgnoreCase(
                ProjectCodes.RoleEnum.TECHNICIAN.name())) {

            // Check PROFILE_UPDATE permission for the user's role
            boolean hasPermission = authServices.CheckthePermission(
                    ProjectCodes.PermissionEnum.PROFILE_UPDATE.name(),
                    userRole
            );

            if (!hasPermission) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "You do not have permission to update your profile");
                return response;
            }

            // Find the ID of the logged-in user
            Long loggedInUserId = queryHandlerServices.GetUserId
                    (commonQueryServicesModel.GetUserId,loggedInUsername);


            // Check ownership
            if (!loggedInUserId.equals(id)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "You can only update your own profile");
                return response;
            }

            userModel.setId(loggedInUserId);

            return userRepository.EditUser(
                    userModel,
                    loggedInUsername
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied");

        return response;

    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deleteUser(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        // 1. Verify access token
        Map<String, Object> tokenResponse =
                authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }

        String loggedInUsername =
                tokenResponse.get("username").toString();

        // 2. Get logged-in user's role
        Map<String, Object> getUserRole =
                authServices.CheckUserRole(loggedInUsername);

        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }

        String userRole = getUserRole.get("userRole").toString();

        // 3. ADMIN can delete any user
        if (userRole.equalsIgnoreCase(
                ProjectCodes.RoleEnum.ADMIN.name())) {

            boolean hasPermission = authServices.CheckthePermission(
                    ProjectCodes.PermissionEnum.USER_DELETE.name(),
                    ProjectCodes.RoleEnum.ADMIN.name()
            );

            if (!hasPermission) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "You do not have permission to delete users");
                return response;
            }

            return userRepository.deleteUser(id);
        }

        // 4. CUSTOMER can delete only their own profile
        if (userRole.equalsIgnoreCase(
                ProjectCodes.RoleEnum.CUSTOMER.name())) {

            boolean hasPermission = authServices.CheckthePermission(
                    ProjectCodes.PermissionEnum.PROFILE_DELETE.name(),
                    ProjectCodes.RoleEnum.CUSTOMER.name()
            );

            if (!hasPermission) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "You do not have permission to delete your profile");
                return response;
            }

            // Get logged-in user's ID
            Long loggedInUserId = queryHandlerServices.GetUserId(
                    commonQueryServicesModel.GetUserId,
                    loggedInUsername
            );

            // Check ownership
            if (!loggedInUserId.equals(id)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "You can only delete your own profile");
                return response;
            }

            return userRepository.deleteUser(loggedInUserId);
        }

        // 5. TECHNICIAN and other roles are denied
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Access denied");

        return response;
    }

    @GetMapping("/user-list")
    public Map<String, Object> GetUserList(
            @RequestParam String queryString,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {
        // 1. Verify access token
        Map<String, Object> tokenResponse =
                authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }

        String loggedInUsername =
                tokenResponse.get("username").toString();

        // 2. Get logged-in user's role
        Map<String, Object> getUserRole =
                authServices.CheckUserRole(loggedInUsername);

        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }

        String userRole = getUserRole.get("userRole").toString();


        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.USER_VIEW_ALL.name(),
                userRole
        );

        if (!hasPermission) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "You do not have permission to delete users");
            return response;
        }


        return reportsServices.fetchDeta(ProjectCodes.SPTableName.GET_USERS_WITH_PAGINATION.name(), queryString );
    }
}
