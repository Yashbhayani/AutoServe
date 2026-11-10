package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.ServiceRequestModel;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.QueryHandlerServices;
import com.example.DevAutoServ.Services.ServiceRequestsServices;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/service-requests")
public class ServiceRequestsController {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private QueryHandlerServices queryHandlerServices;
    private  final ServiceRequestsServices serviceRequestsServices;
    private  final AuthServices authServices;
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();


    public  ServiceRequestsController(ServiceRequestsServices serviceRequestsServices,
                           AuthServices authServices){
        this.serviceRequestsServices = serviceRequestsServices;
        this.authServices = authServices;
    }

    private Map<String, Object> Result(boolean success, String message) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }

    @PostMapping("/create")
    public Map<String, Object> createServiceRequests(
            @RequestBody ServiceRequestModel serviceRequestModel,
            @RequestHeader(value = "Authorization", required = false) String authorization){
        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }
        String loggedInUsername =
                tokenResponse.get("username").toString();
        if (loggedInUsername == null || loggedInUsername.isBlank()) {
            return Result(false, "Logged-in user is required.");
        }


        if (serviceRequestModel.getVehicleId() == null) {
            return Result(false, "Please select a vehicle.");
        }

        if (serviceRequestModel.getServiceTypeList() == null ||
                serviceRequestModel.getServiceTypeList().isEmpty()) {
            return Result(false, "Please select at least one service type.");
        }

            // 2. Validate description
            if (serviceRequestModel.getDescription() != null &&
                    serviceRequestModel.getDescription().length() > 65535) {

                return Result(false, "Description is too long.");
            }
        Map<String, Object> getUserRole = authServices.CheckUserRole(loggedInUsername);
        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }

        String userRole = getUserRole.get("userRole").toString();


        // Find the ID of the logged-in user
        Long loggedInUserId = queryHandlerServices.GetUserId
                (commonQueryServicesModel.GetUserId,loggedInUsername);

        if(serviceRequestModel.getCustomerId() == null){
            serviceRequestModel.setCustomerId(loggedInUserId);
        }

        // Permission As par UserRole
        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.APPOINTMENT_CREATE.name(),
                userRole
        );

        return serviceRequestsServices.createServiceRequests(serviceRequestModel);
    }

    
}
