
package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Services.AppointmentsServices;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.StatusServices;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/appointments")
public class AppointmentsController {

    private final Logger logger =
            LoggerFactory.getLogger(this.getClass());

    private final AppointmentsServices appointmentsServices;
    private final AuthServices authServices;
    private final StatusServices statusServices;

    public AppointmentsController(
            AppointmentsServices appointmentsServices,
            AuthServices authServices,
            StatusServices statusServices
    ) {
        this.appointmentsServices = appointmentsServices;
        this.authServices = authServices;
        this.statusServices = statusServices;
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

    @PutMapping("/assign/{id}")
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
    }

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

            return appointmentsServices.RescheduleAppointment(
                    id,
                    newScheduledDate
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
}
