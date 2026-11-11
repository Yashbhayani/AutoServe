package com.example.DevAutoServ.Model;

import java.time.LocalDateTime;
import java.time.LocalTime;


public class AppointmentModel {
    private Long id;
    private Long serviceRequestId;
    private Long technicianId;
    private LocalDateTime scheduledDate;
    private Integer statusId;
    private Boolean isActive;
    private Boolean isAppointed;
    private LocalTime scheduledTime;

    public AppointmentModel(Long id, Long serviceRequestId, Long technicianId, LocalDateTime scheduledDate, Integer statusId, Boolean isActive, Boolean isAppointed, LocalTime scheduledTime) {
        this.id = id;
        this.serviceRequestId = serviceRequestId;
        this.technicianId = technicianId;
        this.scheduledDate = scheduledDate;
        this.statusId = statusId;
        this.isActive = isActive;
        this.isAppointed = isAppointed;
        this.scheduledTime = scheduledTime;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Integer getStatusId() {
        return statusId;
    }

    public void setStatusId(Integer statusId) {
        this.statusId = statusId;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public Boolean getAppointed() {
        return isAppointed;
    }

    public void setAppointed(Boolean appointed) {
        isAppointed = appointed;
    }

    public LocalTime getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(LocalTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }
}
