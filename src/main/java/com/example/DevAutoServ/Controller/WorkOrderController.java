package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Model.AssignPartModel;
import com.example.DevAutoServ.Services.AppointmentsServices;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.PartUsagesServices;
import com.example.DevAutoServ.Services.StatusServices;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/workorder")
public class WorkOrderController {

    private final Logger logger =
            LoggerFactory.getLogger(this.getClass());

    private final AppointmentsServices appointmentsServices;
    private final AuthServices authServices;
    private final StatusServices statusServices;
    private final PartUsagesServices partUsagesServices;
    public WorkOrderController(AppointmentsServices appointmentsServices, AuthServices authServices, StatusServices statusServices, PartUsagesServices partUsagesServices){

        this.appointmentsServices = appointmentsServices;
        this.authServices = authServices;
        this.statusServices = statusServices;
        this.partUsagesServices = partUsagesServices;
    }
    private Map<String, Object> Result(boolean success, String message) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }


    @PostMapping("/assign-parts/{id}")
    public Map<String, Object> createServiceRequests(
            @PathVariable Long id,
            @RequestBody List<AssignPartModel> parts,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ){
        try
        {
            // 1. Verify token
            Map<String, Object> tokenResponse =
                    authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
                return tokenResponse;
            }

            // 2. Get username
            Object usernameObject = tokenResponse.get("username");

            if (usernameObject == null) {
                return Result(false, "Username not found in token.");
            }

            String loggedInUsername = usernameObject.toString();

            // 3. Get user role
            Map<String, Object> getUserRole =
                    authServices.CheckUserRole(loggedInUsername);

            if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
                return getUserRole;
            }

            Object roleObject = getUserRole.get("userRole");

            if (roleObject == null) {
                return Result(false, "User role not found.");
            }

            String userRole = roleObject.toString();
            return partUsagesServices.assignParts(id, parts);



        }
        catch (Exception e){
            logger.error("Error while updating service request", e.getMessage());

            return Result(false,
                    "Something went wrong while updating the service request.");
        }
    }

    @PutMapping("/assign-parts/{id}")
    public Map<String, Object> updateParts(
            @PathVariable Long id,
            @RequestBody AssignPartModel part,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {

            // 1. Verify token
            Map<String, Object> tokenResponse =
                    authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
                return tokenResponse;
            }

            // 2. Get username
            Object usernameObject = tokenResponse.get("username");

            if (usernameObject == null) {
                return Result(false, "Username not found in token.");
            }

            String loggedInUsername = usernameObject.toString();

            // 3. Get user role
            Map<String, Object> getUserRole =
                    authServices.CheckUserRole(loggedInUsername);

            if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
                return getUserRole;
            }

            Object roleObject = getUserRole.get("userRole");

            if (roleObject == null) {
                return Result(false, "User role not found.");
            }

            String userRole = roleObject.toString();

            // 4. Update assigned part
            return partUsagesServices.updateParts(id, part);

        } catch (Exception e) {

            logger.error("Error while updating assigned parts", e);

            return Result(
                    false,
                    "Something went wrong while updating assigned parts."
            );
        }
    }

    @DeleteMapping("/assign-parts/{id}/{partId}")
    public Map<String, Object> deleteParts(
            @PathVariable Long id,
            @PathVariable Long partId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        try {

            // 1. Verify token
            Map<String, Object> tokenResponse =
                    authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
                return tokenResponse;
            }

            // 2. Get username
            Object usernameObject = tokenResponse.get("username");

            if (usernameObject == null) {
                return Result(false, "Username not found in token.");
            }

            String loggedInUsername = usernameObject.toString();

            // 3. Get user role
            Map<String, Object> getUserRole =
                    authServices.CheckUserRole(loggedInUsername);

            if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
                return getUserRole;
            }

            Object roleObject = getUserRole.get("userRole");

            if (roleObject == null) {
                return Result(false, "User role not found.");
            }

            String userRole = roleObject.toString();

            // 4. Delete assigned part
            return partUsagesServices.deleteParts(id, partId);

        } catch (Exception e) {

            logger.error("Error while deleting assigned parts", e);

            return Result(
                    false,
                    "Something went wrong while deleting assigned parts."
            );
        }
    }

}
