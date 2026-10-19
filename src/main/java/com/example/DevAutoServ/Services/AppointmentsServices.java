package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.Appointment;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Repository.AppointmentsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;
import java.util.PrimitiveIterator;


@Service
public class AppointmentsServices implements AppointmentsRepository {
    @Autowired
    private final JdbcTemplate jdbcTemplate;
    private final CommonQueryServicesModel queries =
            new CommonQueryServicesModel();

    private  QueryHandlerServices queryHandlerServices;
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public AppointmentsServices(JdbcTemplate jdbcTemplate, QueryHandlerServices queryHandlerServices) {
        this.jdbcTemplate = jdbcTemplate;
        this.queryHandlerServices = queryHandlerServices;
    }

    private Map<String, Object> response(
            boolean success, String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("message", message);
        return result;
    }

    @Override
    public Map<String, Object> CreateAppointment(
            Appointment appointment) {

        try {

            for(String app:appointment.getServiceRequest()){
                GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();

                int SID = queryHandlerServices.GetServicsType(commonQueryServicesModel.GetServiceTypeID, app);

                int rows = jdbcTemplate.update(connection -> {
                    PreparedStatement ps = connection.prepareStatement(
                            queries.InsertAppointment,
                            Statement.RETURN_GENERATED_KEYS);

                    ps.setLong(1, SID);

//                    if (appointment.getTechnicianId() == null) {
//                        ps.setNull(2, Types.BIGINT);
//                    } else {
//                        ps.setLong(2, appointment.getTechnicianId());
//                    }

                    ps.setTimestamp(2, Timestamp.valueOf(
                            appointment.getScheduledDate()));

                    int StatusID =   queryHandlerServices.GetServicsType(commonQueryServicesModel.GetStatusID, ProjectCodes.AppointmentStatus.SCHEDULED.name());
                    ps.setLong(3, StatusID);


                    return ps;
                }, keyHolder);

                if (rows > 0) {
                    Map<String, Object> result =
                            response(true, "Appointment scheduled successfully");
                    result.put("appointmentId",
                            keyHolder.getKey().longValue());
                    return result;
                }


            }


            return response(false, "Appointment was not created");

        } catch (Exception e) {
            return response(false, "Failed to create appointment");
        }
    }


    @Override
    public Map<String, Object> ConfirmAppointment(Long id) {
        try {
            int rows = jdbcTemplate.update(
                    queries.ConfirmAppointment, id);

            return response(rows > 0,
                    rows > 0
                            ? "Appointment confirmed successfully"
                            : "Appointment not found or cannot be confirmed");

        } catch (Exception e) {
            return response(false, "Failed to confirm appointment");
        }
    }

    @Override
    public Map<String, Object> RescheduleAppointment(
            Long id, Appointment appointment) {
        try {
         /*   if (id == null || appointment.getScheduledDate() == null) {
                return response(false,
                        "Appointment ID and new scheduled date are required");
            }

            int rows = jdbcTemplate.update(
                    queries.RescheduleAppointment,
                    Timestamp.valueOf(appointment.getScheduledDate()),
                    id);

            return response(rows > 0,
                    rows > 0
                            ? "Appointment rescheduled successfully"
                            : "Appointment not found or cannot be rescheduled");*/

            return response(false, "Failed to reschedule appointment");

        } catch (Exception e) {
            return response(false, "Failed to reschedule appointment");
        }
    }

    @Override
    public Map<String, Object> CancelAppointment(Long id) {
        try {
            int rows = jdbcTemplate.update(
                    queries.CancelAppointment, id);

            return response(rows > 0,
                    rows > 0
                            ? "Appointment cancelled successfully"
                            : "Appointment not found or cannot be cancelled");

        } catch (Exception e) {
            return response(false, "Failed to cancel appointment");
        }
    }

    @Override
    public Map<String, Object> CompleteAppointment(Long id) {
        try {
            int rows = jdbcTemplate.update(
                    queries.CompleteAppointment, id);

            return response(rows > 0,
                    rows > 0
                            ? "Appointment completed successfully"
                            : "Appointment not found or cannot be completed");

        } catch (Exception e) {
            return response(false, "Failed to complete appointment");
        }
    }
}
