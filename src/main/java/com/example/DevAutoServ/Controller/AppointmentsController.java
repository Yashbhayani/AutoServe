
package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.ScheduledServiceAppointmentsModel;
import com.example.DevAutoServ.Model.ServiceRequestModel;
import com.example.DevAutoServ.Repository.AppointmentsRepository;
import com.example.DevAutoServ.Services.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.web.bind.annotation.*;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/appointments")
public class AppointmentsController  {

    private final Logger logger =
            LoggerFactory.getLogger(this.getClass());

    private final AppointmentsServices appointmentsServices;
    private final AuthServices authServices;
    private final StatusServices statusServices;
    private final QueryHandlerServices queryHandlerServices;
    private final ReportsServices reportsServices;

    CommonQueryServicesModel query = new CommonQueryServicesModel();

    public AppointmentsController(
            AppointmentsServices appointmentsServices,
            AuthServices authServices,
            StatusServices statusServices, QueryHandlerServices queryHandlerServices, ReportsServices reportsServices
    ) {
        this.appointmentsServices = appointmentsServices;
        this.authServices = authServices;
        this.statusServices = statusServices;
        this.queryHandlerServices = queryHandlerServices;
        this.reportsServices = reportsServices;
    }

    // ---------------------------------------------------------
    // COMMON RESPONSE
    // ---------------------------------------------------------

    private Map<String, Object> response(
            boolean success,
            String message
    ) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("message", message);
        return result;
    }

    // ---------------------------------------------------------
    // VERIFY TOKEN + ROLE + PERMISSION
    // ---------------------------------------------------------

    private Map<String, Object> authorize(
            String authorization,
            String permissionCode
    ) {

        try {

            if (authorization == null || authorization.isBlank()) {
                return response(false, "Authorization token is required.");
            }

            Map<String, Object> tokenResponse =
                    authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
                return response(false, "Invalid or expired token.");
            }

            Object usernameObject = tokenResponse.get("username");

            if (usernameObject == null) {
                return response(false, "Username not found in token.");
            }

            String loggedInUsername = usernameObject.toString();

            Map<String, Object> roleResponse =
                    authServices.CheckUserRole(loggedInUsername);

            if (!Boolean.TRUE.equals(roleResponse.get("success"))) {
                return response(false, "Unable to identify user role.");
            }

            Object roleObject = roleResponse.get("userRole");

            if (roleObject == null) {
                return response(false, "User role not found.");
            }

            String userRole = roleObject.toString().toUpperCase();

            boolean hasPermission =
                    authServices.CheckthePermission(
                            permissionCode,
                            userRole
                    );

            if (!hasPermission) {
                return response(
                        false,
                        "You do not have permission to perform this action."
                );
            }

            Map<String, Object> result =
                    response(true, "Authorized.");

            result.put("username", loggedInUsername);
            result.put("userRole", userRole);

            return result;

        } catch (Exception e) {

            logger.error(
                    "Authorization error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to verify authorization.");
        }
    }

    // ---------------------------------------------------------
    // ROLE-BASED APPOINTMENT STATUS AUTHORIZATION
    // ---------------------------------------------------------

    private Map<String, Object> authorizeAppointmentStatus(
            String authorization,
            String newStatus
    ) {

        String status = newStatus.toUpperCase();

        String permissionCode;

        Map<String, Object> tokenResponse;

        try {

            if (authorization == null || authorization.isBlank()) {
                return response(false, "Authorization token is required.");
            }

            tokenResponse = authServices.VerifyToken(authorization);

            if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
                return response(false, "Invalid or expired token.");
            }

            Object usernameObject = tokenResponse.get("username");

            if (usernameObject == null) {
                return response(false, "Username not found in token.");
            }

            String username = usernameObject.toString();

            Map<String, Object> roleResponse =
                    authServices.CheckUserRole(username);

            if (!Boolean.TRUE.equals(roleResponse.get("success"))) {
                return response(false, "Unable to identify user role.");
            }

            Object roleObject = roleResponse.get("userRole");

            if (roleObject == null) {
                return response(false, "User role not found.");
            }

            String role = roleObject.toString().toUpperCase();

            // Determine permission according to role and action.

            if ("CANCELLED".equals(status)) {

                if (ProjectCodes.RoleEnum.CUSTOMER.name().equals(role)) {

                    permissionCode =
                            ProjectCodes.PermissionEnum
                                    .APPOINTMENT_DELETE_OWN.name();

                } else if (ProjectCodes.RoleEnum.ADMIN.name().equals(role)) {

                    permissionCode =
                            ProjectCodes.PermissionEnum
                                    .APPOINTMENT_CANCEL.name();

                } else {

                    return response(
                            false,
                            "Only customers and administrators can cancel appointments."
                    );
                }

            } else if ("COMPLETED".equals(status)) {

                if (ProjectCodes.RoleEnum.TECHNICIAN.name().equals(role)) {

                    permissionCode =
                            ProjectCodes.PermissionEnum
                                    .JOB_UPDATE_ASSIGNED.name();

                } else if (ProjectCodes.RoleEnum.ADMIN.name().equals(role)) {

                    permissionCode =
                            ProjectCodes.PermissionEnum
                                    .APPOINTMENT_COMPLETE.name();

                } else {

                    return response(
                            false,
                            "Only assigned technicians and administrators can complete appointments."
                    );
                }

            } else {

                return response(false, "Unsupported appointment status.");
            }

            boolean hasPermission =
                    authServices.CheckthePermission(
                            permissionCode,
                            role
                    );

            if (!hasPermission) {
                return response(
                        false,
                        "You do not have permission to perform this action."
                );
            }

            Map<String, Object> result =
                    response(true, "Authorized.");

            result.put("username", username);
            result.put("userRole", role);

            return result;

        } catch (Exception e) {

            logger.error(
                    "Appointment status authorization error: {}",
                    e.getMessage(),
                    e
            );

            return response(
                    false,
                    "Unable to verify appointment authorization."
            );
        }
    }

    // ---------------------------------------------------------
    // ASSIGN TECHNICIAN + SCHEDULE APPOINTMENT
    //
    // PUT: /api/appointments/assign/{id}
    // ADMIN ONLY
    // ---------------------------------------------------------

    @PostMapping("/create")
    public  Map<String, Object> CreateAppointments(
            @RequestBody ScheduledServiceAppointmentsModel scheduledServiceAppointmentsModel,
            @RequestHeader(
            value = "Authorization",
            required = false
    ) String authorization)
    {
        try{

            Map<String, Object> authResponse = authorize(
                    authorization,
                    ProjectCodes.PermissionEnum
                            .APPOINTMENT_CREATE.name()
            );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }

/*            LocalDateTime appointmentDateTime;

            try {

                appointmentDateTime =
                        LocalDateTime.parse(scheduledServiceAppointmentsModel.getScheduledDate());

            } catch (Exception e) {

                return response(
                        false,
                        "Invalid date format. Use yyyy-MM-ddTHH:mm:ss."
                );
            }*/
            return appointmentsServices.CreateAppointment(scheduledServiceAppointmentsModel);
        }catch (Exception e){
            logger.error(
                    "Assign technician error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to assign technician.");
        }

    }

/*    @PutMapping("/assign/{id}")
    public Map<String, Object> AssignTechnicianAndSchedule(
            @PathVariable Long id,
            @RequestParam Long technicianId,
            @RequestParam String scheduledDate,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization
    ) {

        try {

            Map<String, Object> authResponse = authorize(
                    authorization,
                    ProjectCodes.PermissionEnum
                            .APPOINTMENT_ASSIGN_TECHNICIAN.name()
            );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }

            LocalDateTime appointmentDateTime;

            try {

                appointmentDateTime =
                        LocalDateTime.parse(scheduledDate);

            } catch (Exception e) {

                return response(
                        false,
                        "Invalid date format. Use yyyy-MM-ddTHH:mm:ss."
                );
            }

            return appointmentsServices.AssignTechnicianAndSchedule(
                    id,
                    technicianId,
                    appointmentDateTime
            );

        } catch (Exception e) {

            logger.error(
                    "Assign technician error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to assign technician.");
        }
    }*/

    // ---------------------------------------------------------
    // RESCHEDULE APPOINTMENT
    //
    // PUT: /api/appointments/reschedule/{id}
    // ADMIN ONLY
    // ---------------------------------------------------------

    @PutMapping("/reschedule/{id}")
    public Map<String, Object> RescheduleAppointment(
            @PathVariable Long id,
            @RequestParam String scheduledDate,
            @RequestParam String scheduledTime,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization
    ) {

        try {

            Map<String, Object> authResponse = authorize(
                    authorization,
                    ProjectCodes.PermissionEnum
                            .APPOINTMENT_RESCHEDULE.name()
            );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }

            LocalDateTime newScheduledDate;

            try {

                newScheduledDate =
                        LocalDateTime.parse(scheduledDate);

            } catch (Exception e) {

                return response(
                        false,
                        "Invalid date format. Use yyyy-MM-ddTHH:mm:ss."
                );
            }

            LocalTime newLocalTime;
            try {

                newLocalTime =
                        LocalTime.parse(scheduledTime);

            } catch (Exception e) {

                return response(
                        false,
                        "Invalid date format. Use yyyy-MM-ddTHH:mm:ss."
                );
            }

            return appointmentsServices.RescheduleAppointment(
                    id,
                    newScheduledDate,
                    newLocalTime
            );

        } catch (Exception e) {

            logger.error(
                    "Reschedule appointment error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to reschedule appointment.");
        }
    }

    // ---------------------------------------------------------
    // CANCEL APPOINTMENT
    //
    // PUT: /api/appointments/cancel/{id}
    //
    // CUSTOMER: Cancel own appointment
    // ADMIN: Cancel any appointment
    // ---------------------------------------------------------

    @PutMapping("/cancel/{id}")
    public Map<String, Object> CancelAppointment(
            @PathVariable Long id,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization
    ) {

        try {

            Map<String, Object> authResponse =
                    authorizeAppointmentStatus(
                            authorization,
                            "CANCELLED"
                    );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }

            String username =
                    authResponse.get("username").toString();

            String role =
                    authResponse.get("userRole").toString();

            return statusServices.UpdateAppointmentStatus(
                    id,
                    "CANCELLED",
                    username,
                    role
            );

        } catch (Exception e) {

            logger.error(
                    "Cancel appointment error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to cancel appointment.");
        }
    }


    @PutMapping("/accept/{id}")
    public Map<String, Object> AcceptAppointment(
            @PathVariable Long id,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization
    ) {

        try {

            Map<String, Object> authResponse = authorize(
                    authorization,
                    ProjectCodes.PermissionEnum
                            .APPOINTMENT_RESCHEDULE.name()
            );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }


            return appointmentsServices.AcceptAppointment(
                    id
            );

        } catch (Exception e) {

            logger.error(
                    "Reschedule appointment error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to reschedule appointment.");
        }
    }


    // ---------------------------------------------------------
    // COMPLETE APPOINTMENT
    //
    // PUT: /api/appointments/complete/{id}
    //
    // TECHNICIAN: Complete assigned appointment
    // ADMIN: Complete appointment
    // ---------------------------------------------------------

    @PutMapping("/complete/{id}")
    public Map<String, Object> CompleteAppointment(
            @PathVariable Long id,
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorization
    ) {

        try {

            Map<String, Object> authResponse =
                    authorizeAppointmentStatus(
                            authorization,
                            "COMPLETED"
                    );

            if (!Boolean.TRUE.equals(authResponse.get("success"))) {
                return authResponse;
            }

            String username =
                    authResponse.get("username").toString();

            String role =
                    authResponse.get("userRole").toString();

            return statusServices.UpdateAppointmentStatus(
                    id,
                    "COMPLETED",
                    username,
                    role
            );

        } catch (Exception e) {

            logger.error(
                    "Complete appointment error: {}",
                    e.getMessage(),
                    e
            );

            return response(false, "Unable to complete appointment.");
        }
    }

    @GetMapping("/get")
    public Map<String, Object> GetAppointmentList(
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
                return response(false, "Username not found in token.");
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
                return response(false, "User role not found.");
            }

            String userRole = roleObject.toString();


            if(!userRole.toLowerCase().equals(ProjectCodes.RoleEnum.ADMIN.name().toLowerCase())){

                Long customerID = queryHandlerServices.GetUserId(query.GetUserId,loggedInUsername);

                if (customerID == null) {
                    return response(false, "Logged-in user was not found.");
                }

                return reportsServices.fetchDeta(ProjectCodes.SPTableName.GET_APPOINTMENTS_WITH_PAGINATION.name(), queryString);
            }

            Long customerID = queryHandlerServices.GetUserId(query.GetUserId,loggedInUsername);

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
                return reportsServices.fetchDeta(ProjectCodes.SPTableName.GET_CUSTOMER_APPOINTMENTS_WITH_PAGINATION.name(), finalQueryString);
            }

            return response(false, "Service request is not authorization by this User.");

        } catch (Exception exception) {

            logger.error("Error while updating service request", exception);

            return response(false,
                    "Something went wrong while updating the service request.");
        }
    }

}
