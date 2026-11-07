package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.QueryHandlerServices;
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
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  UserController(UserRepository userRepository,
                           AuthServices authServices){
        this.userRepository = userRepository;
        this.authServices = authServices;
    }

    @PostMapping("/add")
    public Map<String, Object> AddUser(@RequestBody User userModel, HttpServletResponse responses){
        return userRepository.AddUser(userModel, responses);
    }

    @GetMapping("/login")
    public Map<String, Object> login(@RequestBody LogIn logIn){
        return userRepository.Login(logIn);
    }

    @PutMapping("/edit")
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
                            ProjectCodes.PermissionEnum.PROFILE_UPDATE.name(),
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

            // Find the ID of the logged-in user
            Long loggedInUserId = queryHandlerServices.GetUserId
                    (commonQueryServicesModel.GetUserId,loggedInUsername);

            // Prevent updating another user's details
            if (!loggedInUserId.equals(id)) {

                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message",
                        "You are not authorized to update this user");

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
    public Map<String, Object> deleteUser(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false)
                                          String authorization) {
        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }





            return userRepository.deleteUser(id);
    }

    @GetMapping("/user-list")
    public Map<String, Object> GetUserList(
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {



        return null;
    }
}
