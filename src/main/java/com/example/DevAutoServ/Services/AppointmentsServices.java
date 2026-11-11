package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;

import com.example.DevAutoServ.Repository.AppointmentsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AppointmentsServices implements AppointmentsRepository {

    private final JdbcTemplate jdbcTemplate;
    private final StatusServices statusServices;

    private final CommonQueryServicesModel queries =
            new CommonQueryServicesModel();

    public AppointmentsServices(
            JdbcTemplate jdbcTemplate,
            StatusServices statusServices
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.statusServices = statusServices;
    }

    // ADMIN ASSIGNS TECHNICIAN AND SETS ACTUAL APPOINTMENT DATE/TIME

    @Transactional
    public Map<String, Object> AssignTechnicianAndSchedule(
            Long appointmentId,
            Long technicianId,
            LocalDateTime scheduledDate
    ) {

        if (appointmentId == null || appointmentId <= 0) {
            return Result(false, "Valid appointment ID is required.");
        }

        if (technicianId == null || technicianId <= 0) {
            return Result(false, "Technician is required.");
        }

        if (scheduledDate == null) {
            return Result(false, "Appointment date and time are required.");
        }

        if (!scheduledDate.isAfter(LocalDateTime.now())) {
            return Result(false,
                    "Appointment date and time must be in the future.");
        }

        Map<String, Object> appointment;

        try {
            appointment = jdbcTemplate.queryForMap(
                    """
                    SELECT
                        a.id,
                        a.service_request_id,
                        a.status_id,
                        s.code AS appointment_status
                    FROM dev_autoserve.appointments a
                    INNER JOIN dev_autoserve.statuses s
                        ON s.id = a.status_id
                    WHERE a.id = ?
                      AND a.is_active = 1
                    FOR UPDATE
                    """,
                    appointmentId
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return Result(false, "Appointment not found.");
        }

        Long serviceRequestId =
                ((Number) appointment.get("service_request_id")).longValue();

        // Service request must be approved before technician assignment.
        String requestStatus = jdbcTemplate.queryForObject(
                """
                SELECT s.code
                FROM dev_autoserve.service_requests sr
                INNER JOIN dev_autoserve.statuses s
                    ON s.id = sr.status_id
                WHERE sr.id = ?
                  AND sr.is_active = 1
                FOR UPDATE
                """,
                String.class,
                serviceRequestId
        );

        if (!"APPROVED".equals(requestStatus)) {
            return Result(false,
                    "The service request must be APPROVED before assigning a technician.");
        }

        // Appointment must not be cancelled or completed.
        String appointmentStatus =
                (String) appointment.get("appointment_status");

        if ("CANCELLED".equals(appointmentStatus)
                || "COMPLETED".equals(appointmentStatus)) {
            return Result(false,
                    "Cancelled or completed appointments cannot be scheduled.");
        }

        // Verify technician has the TECHNICIAN role.
        Integer technicianCount = jdbcTemplate.queryForObject(
                queries.IsTechnicianValid,
                Integer.class,
                technicianId
        );

        if (technicianCount == null || technicianCount == 0) {
            return Result(false,
                    "Selected user is not an active technician.");
        }

        Integer confirmedStatusId =
                statusServices.GetStatusId("APPOINTMENT", "CONFIRMED");

        if (confirmedStatusId == null) {
            throw new IllegalStateException(
                    "APPOINTMENT/CONFIRMED status was not found."
            );
        }

        // Set technician, actual date/time and confirmed status.
        jdbcTemplate.update(
                """
                UPDATE dev_autoserve.appointments
                SET
                    technician_id = ?,
                    scheduled_date = ?,
                    status_id = ?,
                    is_appointed = 1
                WHERE id = ?
                  AND is_active = 1
                """,
                technicianId,
                java.sql.Timestamp.valueOf(scheduledDate),
                confirmedStatusId,
                appointmentId
        );

        Map<String, Object> response = Result(
                true,
                "Technician assigned and appointment scheduled successfully."
        );

        response.put("appointmentId", appointmentId);
        response.put("serviceRequestId", serviceRequestId);
        response.put("technicianId", technicianId);
        response.put("scheduledDate", scheduledDate);
        response.put("appointmentStatus", "CONFIRMED");

        return response;
    }

    // RESCHEDULE APPOINTMENT

    @Transactional
    public Map<String, Object> RescheduleAppointment(
            Long appointmentId,
            LocalDateTime newScheduledDate
    ) {

        if (appointmentId == null || appointmentId <= 0
                || newScheduledDate == null) {
            return Result(false, "Appointment ID and date are required.");
        }

        if (!newScheduledDate.isAfter(LocalDateTime.now())) {
            return Result(false,
                    "New appointment date must be in the future.");
        }

        Map<String, Object> appointment;

        try {
            appointment = jdbcTemplate.queryForMap(
                    """
                    SELECT
                        a.id,
                        a.technician_id,
                        s.code AS appointment_status
                    FROM dev_autoserve.appointments a
                    INNER JOIN dev_autoserve.statuses s
                        ON s.id = a.status_id
                    WHERE a.id = ?
                      AND a.is_active = 1
                    FOR UPDATE
                    """,
                    appointmentId
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return Result(false, "Appointment not found.");
        }

        String currentStatus =
                (String) appointment.get("appointment_status");

        if (!statusServices.IsValidAppointmentTransition(
                currentStatus,
                "RESCHEDULED"
        )) {
            return Result(false,
                    "This appointment cannot be rescheduled.");
        }

        Integer rescheduledStatusId =
                statusServices.GetStatusId("APPOINTMENT", "RESCHEDULED");

        if (rescheduledStatusId == null) {
            throw new IllegalStateException(
                    "APPOINTMENT/RESCHEDULED status was not found."
            );
        }

        jdbcTemplate.update(
                """
                UPDATE dev_autoserve.appointments
                SET
                    scheduled_date = ?,
                    status_id = ?
                WHERE id = ?
                  AND is_active = 1
                """,
                java.sql.Timestamp.valueOf(newScheduledDate),
                rescheduledStatusId,
                appointmentId
        );

        return Result(true, "Appointment rescheduled successfully.");
    }

    private Map<String, Object> Result(
            boolean success,
            String message
    ) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }
}