package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;

import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.ScheduledServiceAppointmentsModel;
import com.example.DevAutoServ.Repository.AppointmentsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AppointmentsServices implements AppointmentsRepository {

    private final JdbcTemplate jdbcTemplate;
    private final StatusServices statusServices;
    private final QueryHandlerServices queryHandlerServices;
    private final CommonQueryServicesModel queries =
            new CommonQueryServicesModel();

    public AppointmentsServices(
            JdbcTemplate jdbcTemplate,
            StatusServices statusServices,
            QueryHandlerServices queryHandlerServices
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.statusServices = statusServices;
        this.queryHandlerServices = queryHandlerServices;
    }

    @Transactional
    public  Map<String, Object> CreateAppointment(
            ScheduledServiceAppointmentsModel scheduledServiceAppointmentsModel){

        int ServiceTypeID = queryHandlerServices.GetServicsType(queries.GetServiceTypeID, ProjectCodes.AppointmentStatus.SCHEDULED.name());

        if(ServiceTypeID <= 0){
            return Result(false, "Service is required.");
        }


        //
        KeyHolder keyHolderUserRole = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps = connection.prepareStatement(
                    queries.CreateAppoinment,
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, scheduledServiceAppointmentsModel.getServiceRequestId());
            ps.setLong(2, scheduledServiceAppointmentsModel.getTechnicianId());


            if (scheduledServiceAppointmentsModel.getScheduledDate() == null) {
                ps.setNull(3, Types.TIMESTAMP);
            } else {
                ps.setTimestamp(
                        3,
                        Timestamp.valueOf(scheduledServiceAppointmentsModel.getScheduledDate())
                );
            }

            if (scheduledServiceAppointmentsModel.getScheduledTime() == null) {
                ps.setNull(4, Types.TIME);
            } else {
                ps.setTime(
                        4,
                        Time.valueOf(scheduledServiceAppointmentsModel.getScheduledTime())
                );
            }

            ps.setInt(5, ServiceTypeID);

            return ps;

        }, keyHolderUserRole);
        Map<String, Object> response = Result(
                true,
                "appointment scheduled successfully."
        );

        return response;
    }

    // ADMIN ASSIGNS TECHNICIAN AND SETS ACTUAL APPOINTMENT DATE/TIME
/*
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
                    queries.ATechSchdappointment,
                    appointmentId
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return Result(false, "Appointment not found.");
        }

        Long serviceRequestId =
                ((Number) appointment.get("service_request_id")).longValue();

        // Service request must be approved before technician assignment.
        String requestStatus = jdbcTemplate.queryForObject(
                queries.ATechSchdrequestStatus,
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
                queries.ATechSchdupdate,
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
*/

    // RESCHEDULE APPOINTMENT

    @Transactional
    public Map<String, Object> RescheduleAppointment(
            Long appointmentId,
            LocalDateTime newScheduledDate,
            LocalTime newLocalTime
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
                    queries.RescheduleAppointment,
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
                queries.RescheduleAppointmentUpdate,
                java.sql.Timestamp.valueOf(newScheduledDate),
                java.sql.Time.valueOf(newLocalTime),
                rescheduledStatusId,
                appointmentId
        );

        return Result(true, "Appointment rescheduled successfully.");
    }

    @Override
    public Map<String, Object> AcceptAppointment(Long id) {

        Map<String, Object> appointment;
        try {
            appointment = jdbcTemplate.queryForMap(
                    queries.getGetServiceAndTechID,
                    id
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return Result(false, "Appointment not found.");
        }

        Long service_request_id =
                (Long) appointment.get("service_request_id");
        Long technician_id = (Long)  appointment.get("technician_id");

        int ServiceTypeID = queryHandlerServices.GetServicsType(queries.GetServiceTypeID, ProjectCodes.WORKORDER.IN_PROGRESS.name());

        if(ServiceTypeID <= 0){
            return Result(false, "Service is required.");
        }

        //Insert Work Orders
        KeyHolder keyHolderUserRole = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps = connection.prepareStatement(
                    queries.InsertWorkOrders,
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, service_request_id);
            ps.setLong(2, technician_id);
            ps.setLong(3, ServiceTypeID);
            return ps;

        }, keyHolderUserRole);
        Map<String, Object> response = Result(
                true,
                "appointment accept successfully."
        );
            return response;
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