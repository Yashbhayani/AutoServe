package com.example.DevAutoServ.Repository;


import java.time.LocalDateTime;
import java.util.Map;

public interface AppointmentsRepository {
    Map<String, Object> AssignTechnicianAndSchedule(
            Long appointmentId,
            Long technicianId,
            LocalDateTime scheduledDate
    );

    Map<String, Object> RescheduleAppointment(
            Long appointmentId,
            LocalDateTime newScheduledDate
    );

}
