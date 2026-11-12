package com.example.DevAutoServ.Repository;


import com.example.DevAutoServ.Model.ScheduledServiceAppointmentsModel;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;

public interface AppointmentsRepository {
    Map<String, Object> CreateAppointment(
            ScheduledServiceAppointmentsModel scheduledServiceAppointmentsModel
    );

/*    Map<String, Object> AssignTechnicianAndSchedule(
            Long appointmentId,
            Long technicianId,
            LocalDateTime scheduledDate
    );*/

    Map<String, Object> RescheduleAppointment(
            Long appointmentId,
            LocalDateTime newScheduledDate,
            LocalTime scheduledTime
    );

    Map<String, Object> AcceptAppointment(Long id);

}
