package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Model.Appointment;
import com.example.DevAutoServ.Repository.AppointmentsRepository;
import com.example.DevAutoServ.Repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/appointments")
public class AppointmentsController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private  final AppointmentsRepository appointmentsRepository;

    public  AppointmentsController(AppointmentsRepository appointmentsRepository){
        this.appointmentsRepository = appointmentsRepository;
    }

    @PostMapping
    public Map<String, Object> CreateAppointment(
            @RequestBody Appointment appointment) {
        return appointmentsRepository.CreateAppointment(appointment);
    }

    @PutMapping("/{id}/confirm")
    public Map<String, Object> ConfirmAppointment(
            @PathVariable Long id) {
        return appointmentsRepository.ConfirmAppointment(id);
    }

    @PutMapping("/{id}/reschedule")
    public Map<String, Object> RescheduleAppointment(
            @PathVariable Long id,
            @RequestBody Appointment appointment) {
        return appointmentsRepository.RescheduleAppointment(
                id, appointment);
    }

    @PutMapping("/{id}/cancel")
    public Map<String, Object> CancelAppointment(
            @PathVariable Long id) {
        return appointmentsRepository.CancelAppointment(id);
    }

    @PutMapping("/{id}/complete")
    public Map<String, Object> CompleteAppointment(
            @PathVariable Long id) {
        return appointmentsRepository.CompleteAppointment(id);
    }
}
