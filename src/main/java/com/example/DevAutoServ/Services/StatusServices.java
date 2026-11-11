package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Repository.StatusServicesRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
public class StatusServices implements StatusServicesRepository {

    private final JdbcTemplate jdbcTemplate;
    private final CommonQueryServicesModel queries =
            new CommonQueryServicesModel();

    private final Map<String, Set<String>> serviceRequestTransitions =
            Map.of(
                    "SUBMITTED", Set.of("UNDER_REVIEW", "CANCELLED"),
                    "UNDER_REVIEW", Set.of("APPROVED", "REJECTED", "CANCELLED"),
                    "APPROVED", Set.of("IN_PROGRESS", "CANCELLED"),
                    "IN_PROGRESS", Set.of("COMPLETED"),
                    "REJECTED", Set.of(),
                    "COMPLETED", Set.of(),
                    "CANCELLED", Set.of()
            );

    private final Map<String, Set<String>> appointmentTransitions =
            Map.of(
                    "SCHEDULED", Set.of("CONFIRMED", "RESCHEDULED", "CANCELLED"),
                    "CONFIRMED", Set.of("RESCHEDULED", "CANCELLED", "COMPLETED"),
                    "RESCHEDULED", Set.of("CONFIRMED", "CANCELLED", "COMPLETED"),
                    "CANCELLED", Set.of(),
                    "COMPLETED", Set.of()
            );

    public StatusServices(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Integer GetStatusId(String tableCode, String statusCode) {

        var results = jdbcTemplate.query(
                queries.GetStatusId,
                (rs, rowNum) -> rs.getInt("id"),
                tableCode,
                statusCode
        );

        return results.isEmpty() ? null : results.get(0);
    }

    public String GetStatusCode(Integer statusId) {

        var results = jdbcTemplate.query(
                queries.GetStatusCode,
                (rs, rowNum) -> rs.getString("code"),
                statusId
        );

        return results.isEmpty() ? null : results.get(0);
    }

    public boolean IsValidServiceRequestTransition(
            String currentStatus,
            String newStatus
    ) {
        return serviceRequestTransitions
                .getOrDefault(currentStatus, Set.of())
                .contains(newStatus);
    }

    public boolean IsValidAppointmentTransition(
            String currentStatus,
            String newStatus
    ) {
        return appointmentTransitions
                .getOrDefault(currentStatus, Set.of())
                .contains(newStatus);
    }

    @Transactional
    public Map<String, Object> UpdateServiceRequestStatus(
            Long serviceRequestId,
            String newStatus,
            String username,
            String userRole
    ) {

        try {

            // 1. Validate input
            if (serviceRequestId == null || newStatus == null
                    || newStatus.isBlank()
                    || username == null || username.isBlank()
                    || userRole == null || userRole.isBlank()) {

                return Result(false, "Required information is missing.");
            }

            newStatus = newStatus.trim().toUpperCase();
            userRole = userRole.trim().toUpperCase();

            // 2. Get authenticated user's ID
            Long userId = jdbcTemplate.queryForObject(
                    queries.GetUserId,
                    Long.class,
                    username
            );

            if (userId == null) {
                return Result(false, "User not found.");
            }

            // 3. Get service request and lock its row
            Map<String, Object> request = jdbcTemplate.queryForMap(
                    queries.GetServiceRequestForStatusUpdate,
                    serviceRequestId
            );

            Long customerId = ((Number) request.get("customer_id")).longValue();

            String currentStatus =
                    request.get("status_code").toString();

            // 4. Validate role, ownership and assignment
            switch (newStatus) {

                case "UNDER_REVIEW":
                case "APPROVED":
                case "REJECTED":

                    if (!"ADMIN".equals(userRole)) {
                        return Result(false,
                                "Only Admin can review, approve or reject service requests.");
                    }

                    break;

                case "CANCELLED":

                    if ("CUSTOMER".equals(userRole)) {

                        if (!userId.equals(customerId)) {
                            return Result(false,
                                    "You can cancel only your own service request.");
                        }

                        if (!"SUBMITTED".equals(currentStatus)) {
                            return Result(false,
                                    "You can cancel only submitted service requests.");
                        }

                    } else if (!"ADMIN".equals(userRole)) {

                        return Result(false,
                                "You do not have permission to cancel this service request.");
                    }

                    break;

                case "IN_PROGRESS":
                case "COMPLETED":

                    if ("TECHNICIAN".equals(userRole)) {

                        Integer assignedCount = jdbcTemplate.queryForObject(
                                queries.IsAssignedTechnician,
                                Integer.class,
                                serviceRequestId,
                                userId
                        );

                        if (assignedCount == null || assignedCount == 0) {
                            return Result(false,
                                    "You are not assigned to this service request.");
                        }

                    } else if (!"ADMIN".equals(userRole)) {

                        return Result(false,
                                "Only an assigned Technician or Admin can update this status.");
                    }

                    break;

                default:

                    return Result(false,
                            "Invalid service request status.");
            }

            // 5. Validate status transition
            if (!IsValidServiceRequestTransition(
                    currentStatus,
                    newStatus
            )) {

                return Result(false,
                        "Invalid service request status transition: "
                                + currentStatus + " to " + newStatus);
            }

            // 6. Validate appointment before starting work
            if ("IN_PROGRESS".equals(newStatus)
                    || "COMPLETED".equals(newStatus)) {

                Map<String, Object> appointment =
                        jdbcTemplate.queryForMap(
                                queries.GetAppointmentForServiceRequest,
                                serviceRequestId
                        );

                String appointmentStatus =
                        appointment.get("status_code").toString();

                Object technicianValue = appointment.get("technician_id");

                if (technicianValue == null) {
                    return Result(false,
                            "A technician must be assigned before starting or completing work.");
                }

                if (!"CONFIRMED".equals(appointmentStatus)
                        && !"RESCHEDULED".equals(appointmentStatus)
                        && !"COMPLETED".equals(appointmentStatus)) {

                    return Result(false,
                            "Appointment must be confirmed before service work can proceed.");
                }

                if ("COMPLETED".equals(newStatus)
                        && !"IN_PROGRESS".equals(currentStatus)) {

                    return Result(false,
                            "Service request must be in progress before completion.");
                }
            }

            // 7. Get new service request status ID dynamically
            Integer newStatusId = GetStatusId(
                    "SERVICE_REQUEST",
                    newStatus
            );

            if (newStatusId == null) {
                return Result(false,
                        "Service request status does not exist.");
            }

            // 8. Update service request status
            jdbcTemplate.update(
                    queries.UpdateServiceRequestStatus,
                    newStatusId,
                    serviceRequestId
            );

            // 9. Cancel linked appointment when request is rejected/cancelled
            if ("REJECTED".equals(newStatus)
                    || "CANCELLED".equals(newStatus)) {

                Integer cancelledStatusId = GetStatusId(
                        "APPOINTMENT",
                        "CANCELLED"
                );

                if (cancelledStatusId == null) {
                    throw new IllegalStateException(
                            "APPOINTMENT/CANCELLED status not found."
                    );
                }

                jdbcTemplate.update(
                        queries.CancelLinkedAppointment,
                        cancelledStatusId,
                        serviceRequestId
                );
            }

            return Result(true,
                    "Service request status updated successfully.");

        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {

            return Result(false,
                    "Service request or appointment not found.");

        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException ex) {

            return Result(false,
                    "Unexpected multiple records found.");

        }
    }

    @Transactional
    public Map<String, Object> UpdateAppointmentStatus(
            Long appointmentId,
            String newStatus,
            String username,
            String userRole
    ) {

        try {

            // 1. Validate input
            if (appointmentId == null
                    || newStatus == null
                    || newStatus.isBlank()
                    || username == null
                    || username.isBlank()
                    || userRole == null
                    || userRole.isBlank()) {

                return Result(false, "Required information is missing.");
            }

            newStatus = newStatus.trim().toUpperCase();
            userRole = userRole.trim().toUpperCase();

            // 2. Get authenticated user's ID
            Long userId = jdbcTemplate.queryForObject(
                    queries.GetUserId,
                    Long.class,
                    username
            );

            if (userId == null) {
                return Result(false, "User not found.");
            }

            // 3. Get appointment and lock its row
            Map<String, Object> appointment = jdbcTemplate.queryForMap(
                    queries.GetAppointmentForStatusUpdate,
                    appointmentId
            );

            Long serviceRequestId =
                    ((Number) appointment.get("service_request_id")).longValue();

            Long customerId =
                    ((Number) appointment.get("customer_id")).longValue();

            Object technicianValue = appointment.get("technician_id");

            Long technicianId = technicianValue == null
                    ? null
                    : ((Number) technicianValue).longValue();

            String currentStatus =
                    appointment.get("status_code").toString();

            String requestStatus =
                    appointment.get("request_status").toString();

            // 4. Validate role, ownership and assignment
            switch (newStatus) {

                case "CONFIRMED":
                case "RESCHEDULED":

                    if (!"ADMIN".equals(userRole)) {
                        return Result(false,
                                "Only Admin can confirm or reschedule appointments.");
                    }

                    if (technicianId == null) {
                        return Result(false,
                                "Assign a technician before confirming the appointment.");
                    }

                    break;

                case "CANCELLED":

                    if ("CUSTOMER".equals(userRole)) {

                        if (!userId.equals(customerId)) {
                            return Result(false,
                                    "You can cancel only your own appointment.");
                        }

                    } else if (!"ADMIN".equals(userRole)) {

                        return Result(false,
                                "You do not have permission to cancel this appointment.");
                    }

                    break;

                case "COMPLETED":

                    if ("TECHNICIAN".equals(userRole)) {

                        if (technicianId == null
                                || !technicianId.equals(userId)) {

                            return Result(false,
                                    "You are not assigned to this appointment.");
                        }

                    } else if (!"ADMIN".equals(userRole)) {

                        return Result(false,
                                "Only the assigned Technician or Admin can complete this appointment.");
                    }

                    if (!"IN_PROGRESS".equals(requestStatus)) {
                        return Result(false,
                                "Service request must be in progress before completing the appointment.");
                    }

                    break;

                default:

                    return Result(false,
                            "Invalid appointment status.");
            }

            // 5. Validate appointment transition
            if (!IsValidAppointmentTransition(
                    currentStatus,
                    newStatus
            )) {

                return Result(false,
                        "Invalid appointment status transition: "
                                + currentStatus + " to " + newStatus);
            }

            // 6. Get appointment status ID dynamically
            Integer newStatusId = GetStatusId(
                    "APPOINTMENT",
                    newStatus
            );

            if (newStatusId == null) {
                return Result(false,
                        "Appointment status does not exist.");
            }

            // 7. Update appointment status
            jdbcTemplate.update(
                    queries.UpdateAppointmentStatus,
                    newStatusId,
                    newStatus,
                    appointmentId
            );

            // 8. Synchronize service request status
            if ("COMPLETED".equals(newStatus)) {

                Integer completedRequestStatusId = GetStatusId(
                        "SERVICE_REQUEST",
                        "COMPLETED"
                );

                if (completedRequestStatusId == null) {
                    throw new IllegalStateException(
                            "SERVICE_REQUEST/COMPLETED status not found."
                    );
                }

                jdbcTemplate.update(
                        queries.UpdateServiceRequestStatus,
                        completedRequestStatusId,
                        serviceRequestId
                );
            }

            if ("CANCELLED".equals(newStatus)) {

                // Cancel the linked service request only if it is not terminal
                if ("SUBMITTED".equals(requestStatus)
                        || "UNDER_REVIEW".equals(requestStatus)
                        || "APPROVED".equals(requestStatus)) {

                    Integer cancelledRequestStatusId = GetStatusId(
                            "SERVICE_REQUEST",
                            "CANCELLED"
                    );

                    if (cancelledRequestStatusId == null) {
                        throw new IllegalStateException(
                                "SERVICE_REQUEST/CANCELLED status not found."
                        );
                    }

                    jdbcTemplate.update(
                            queries.UpdateServiceRequestStatus,
                            cancelledRequestStatusId,
                            serviceRequestId
                    );
                }
            }

            return Result(true,
                    "Appointment status updated successfully.");

        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {

            return Result(false,
                    "Appointment or related record not found.");

        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException ex) {

            return Result(false,
                    "Unexpected multiple records found.");
        }
    }


    private Map<String, Object> Result(
            boolean success,
            String message
    ) {
        return Map.of(
                "success", success,
                "message", message
        );
    }
}