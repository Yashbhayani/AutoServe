package com.example.DevAutoServ.Model;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class ScheduledServiceAppointmentsModel {
    private Long serviceRequestId;
    private Long technicianId;
    private LocalDateTime scheduledDate;
    private LocalTime scheduledTime;

    public ScheduledServiceAppointmentsModel() {
    }

    public ScheduledServiceAppointmentsModel(Long serviceRequestId, Long technicianId, LocalDateTime scheduledDate, LocalTime scheduledTime) {
        this.serviceRequestId = serviceRequestId;
        this.technicianId = technicianId;
        this.scheduledDate = scheduledDate;
        this.scheduledTime = scheduledTime;
    }

    public Long getServiceRequestId() {
        return serviceRequestId;
    }

    public void setServiceRequestId(Long serviceRequestId) {
        this.serviceRequestId = serviceRequestId;
    }

    public Long getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(Long technicianId) {
        this.technicianId = technicianId;
    }

    public LocalDateTime getScheduledDate() {
        return scheduledDate;
    }

    public void setScheduledDate(LocalDateTime scheduledDate) {
        this.scheduledDate = scheduledDate;
    }

    public LocalTime getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(LocalTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }
}
