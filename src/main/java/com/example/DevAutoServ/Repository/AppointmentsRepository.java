package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.Model.Appointment;

import java.util.Map;

public interface AppointmentsRepository {
    Map<String, Object> CreateAppointment(Appointment appointment);

    Map<String, Object> ConfirmAppointment(Long id);

    Map<String, Object> RescheduleAppointment(
            Long id, Appointment appointment);

    Map<String, Object> CancelAppointment(Long id);

    Map<String, Object> CompleteAppointment(Long id);
}
