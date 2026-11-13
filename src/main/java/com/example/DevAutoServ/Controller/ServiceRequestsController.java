package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.ServiceRequestModel;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.*;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

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
    private final StatusServices statusServices;
    private final ReportsServices reportsServices;
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();


    public  ServiceRequestsController(ServiceRequestsServices serviceRequestsServices,
                                      AuthServices authServices,
                                      StatusServices statusServices, ReportsServices reportsServices){
        this.serviceRequestsServices = serviceRequestsServices;
        this.authServices = authServices;
        this.statusServices = statusServices;
        this.reportsServices = reportsServices;
    }

    private Map<String, Object> Result(boolean success, String message) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }

    private boolean HasPermission(
            String permission,
            String role) {

        return authServices.CheckthePermission(permission, role);
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


        // Permission As par UserRole
        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.SERVICE_REQUEST_CREATE.name(),
                userRole
        );

        if (!hasPermission) {
            return Result(false,
                    "You do not have permission to create service requests.");
        }

        // Find the ID of the logged-in user
        Long loggedInUserId = queryHandlerServices.GetUserId
                (commonQueryServicesModel.GetUserId,loggedInUsername);

        if(serviceRequestModel.getCustomerId() == null
                &&  userRole.toLowerCase().equalsIgnoreCase(ProjectCodes.RoleEnum.ADMIN.name())){
            serviceRequestModel.setCustomerId(loggedInUserId);
        }

        return serviceRequestsServices.createServiceRequests(serviceRequestModel);
    }


    // EDIT SERVICE REQUEST
    @PutMapping("/update/{id}")
    public Map<String, Object> EditServiceRequests(

            @PathVariable Long id,

            @RequestBody ServiceRequestModel serviceRequestModel,

            @RequestHeader(
                    value = "Authorization",
                    required = false
            )
            String authorization
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

            // 4. Check permission
            boolean hasPermission = authServices.CheckthePermission(
                    ProjectCodes.PermissionEnum.SERVICE_REQUEST_UPDATE.name(),
                    userRole
            );

            if (!hasPermission) {
                return Result(false,
                        "You do not have permission to edit service requests.");
            }

            if(!userRole.toLowerCase().equals(ProjectCodes.RoleEnum.ADMIN.name().toLowerCase())){

                Long customerID = queryHandlerServices.GetUserId(commonQueryServicesModel.GetUserId,loggedInUsername);

                if (customerID == null) {
                    return Result(false, "Logged-in user was not found.");
                }


                // 3. Check whether service request exists and is active
                if (!queryHandlerServices.IsServiceRequestValid(commonQueryServicesModel.IsServiceRequestValid,id, customerID)) {
                    return Result(false,
                            "Service request is not available or has already been deleted.");
                }
            }

            serviceRequestModel.setId(id);

            // 5. Update service request
            return serviceRequestsServices.EditServiceRequests(
                    serviceRequestModel
            );

        } catch (Exception exception) {

            logger.error("Error while updating service request", exception);

            return Result(false,
                    "Something went wrong while updating the service request.");
        }
    }


    // DELETE SERVICE REQUEST
    @DeleteMapping("/delete/{id}")
    public Map<String, Object> DeleteServiceRequests(

            @PathVariable Long id,

            @RequestHeader(
                    value = "Authorization",
                    required = false
            )
            String authorization
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

            // 4. Check permission
            boolean hasPermission = authServices.CheckthePermission(
                    ProjectCodes.PermissionEnum.SERVICE_REQUEST_DELETE.name(),
                    userRole
            );

            if (!hasPermission) {
                return Result(false,
                        "You do not have permission to delete service requests.");
            }

            if(!(userRole.toLowerCase().equals(ProjectCodes.RoleEnum.ADMIN.name().toLowerCase()))) {

                Long customerID = queryHandlerServices.GetUserId(commonQueryServicesModel.GetUserId, loggedInUsername);

                if (customerID == null) {
                    return Result(false, "Logged-in user was not found.");
                }

                // 3. Check whether service request exists and is active
                if (!queryHandlerServices.IsServiceRequestValid(
                        commonQueryServicesModel.IsServiceRequestValid,
                        id,
                        customerID)) {
                    return Result(false,
                            "Service request is not available or has already been deleted.");
                }
            }

            // 5. Delete service request
            return serviceRequestsServices.DeleteServiceRequests(
                    id
            );

        } catch (Exception exception) {

            logger.error("Error while deleting service request", exception);

            return Result(false,
                    "Something went wrong while deleting the service request.");
        }
    }



    @GetMapping("/get")
    public Map<String, Object> GetUserList(
            @RequestParam String queryString,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {
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


            if(!userRole.toLowerCase().equals(ProjectCodes.RoleEnum.ADMIN.name().toLowerCase())){

                Long customerID = queryHandlerServices.GetUserId(commonQueryServicesModel.GetUserId,loggedInUsername);

                if (customerID == null) {
                    return Result(false, "Logged-in user was not found.");
                }

                return reportsServices.fetchDeta(ProjectCodes.SPTableName.GET_SERVICE_REQUESTS_WITH_PAGINATION.name(), queryString);
            }

            Long customerID = queryHandlerServices.GetUserId(commonQueryServicesModel.GetUserId,loggedInUsername);

            // Convert queryString into JSON
            ObjectMapper objectMapper = new ObjectMapper();

            Map<String, Object> queryJson = objectMapper.readValue(
                    queryString,
                    new TypeReference<Map<String, Object>>() {}
            );

            // Add Customer ID
            queryJson.put("customer_id", customerID);

            // Convert JSON back into String
            String finalQueryString = objectMapper.writeValueAsString(queryJson);

            // 4. Check permission
            if(userRole.equalsIgnoreCase(ProjectCodes.RoleEnum.CUSTOMER.name())){
                return reportsServices.fetchDeta(ProjectCodes.SPTableName.GET_CUSTOMER_SERVICE_REQUESTS_WITH_PAGINATION.name(), finalQueryString);
            }

            return Result(false, "Service request is not authorization by this User.");

        } catch (Exception exception) {

            logger.error("Error while updating service request", exception);

            return Result(false,
                    "Something went wrong while updating the service request.");
        }
    }


//AsignTech
/*
    PUT /api/service-requests/status/15?status=UNDER_REVIEW
    PUT /api/service-requests/status/15?status=REJECTED
    PUT /api/service-requests/status/15?status=IN_PROGRESS
    PUT /api/service-requests/status/15?status=COMPLETED
    PUT /api/service-requests/status/15?status=CANCELLED
    */

/*    @PutMapping("/status/{id}")
    public Map<String, Object> UpdateServiceRequestStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        try {

            Map<String, Object> auth =
                    authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(auth.get("success"))) {
                return auth;
            }

            String username = auth.get("username").toString();
            String role = auth.get("userRole").toString();

            if (status == null || status.isBlank()) {
                return Result(false, "Status is required.");
            }

            status = status.trim().toUpperCase();

            String permission;

            switch (status) {

                // ADMIN: review request
                case "UNDER_REVIEW":

                    if (!role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        return Result(false,
                                "Only Admin can review service requests.");
                    }

                    permission = ProjectCodes.PermissionEnum
                            .SERVICE_REQUEST_REVIEW.name();

                    break;

                // ADMIN: approve request
                case "APPROVED":

                    if (!role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        return Result(false,
                                "Only Admin can approve service requests.");
                    }

                    permission = ProjectCodes.PermissionEnum
                            .SERVICE_REQUEST_APPROVE.name();

                    break;

                // ADMIN: reject request
                case "REJECTED":

                    if (!role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        return Result(false,
                                "Only Admin can reject service requests.");
                    }

                    permission = ProjectCodes.PermissionEnum
                            .SERVICE_REQUEST_REJECT.name();

                    break;

                // CUSTOMER: cancel own
                // ADMIN: cancel any
                case "CANCELLED":

                    if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.CUSTOMER.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .SERVICE_REQUEST_UPDATE.name();

                    } else if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .SERVICE_MANAGE.name();

                    } else {

                        return Result(false,
                                "You cannot cancel this service request.");
                    }

                    break;

                // TECHNICIAN: start work
                // ADMIN: manage service workflow
                case "IN_PROGRESS":

                    if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.TECHNICIAN.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .JOB_UPDATE_ASSIGNED.name();

                    } else if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .SERVICE_MANAGE.name();

                    } else {

                        return Result(false,
                                "Only an assigned Technician or Admin can start service work.");
                    }

                    break;

                // TECHNICIAN: complete work
                // ADMIN: manage service workflow
                case "COMPLETED":

                    if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.TECHNICIAN.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .JOB_UPDATE_ASSIGNED.name();

                    } else if (role.equalsIgnoreCase(
                            ProjectCodes.RoleEnum.ADMIN.name())) {

                        permission = ProjectCodes.PermissionEnum
                                .SERVICE_MANAGE.name();

                    } else {

                        return Result(false,
                                "Only an assigned Technician or Admin can complete service work.");
                    }

                    break;

                default:

                    return Result(false,
                            "Invalid service request status.");
            }

            // Check role permission
            if (!HasPermission(permission, role)) {
                return Result(false,
                        "You do not have permission to perform this status update.");
            }

            // Update status
            return statusServices.UpdateServiceRequestStatus(
                    id,
                    status,
                    username,
                    role
            );

        } catch (Exception exception) {

            logger.error(
                    "Service request status update failed.",
                    exception
            );

            return Result(false,
                    "Something went wrong while updating service request status.");
        }
    }*/

}
