package com.example.DevAutoServ.Model;

import java.time.LocalDateTime;
import java.util.List;

public class Appointment {

    private Long id;
    private Long vehicleId;
    private List<String> serviceRequest;
    private LocalDateTime scheduledDate;
    private Long technicianId;
    private Integer statusId;

    public Appointment() {
    }

    public Appointment(Long id, List<String> serviceRequest,
                       Long vehicleId,
                       LocalDateTime scheduledDate, Long technicianId,
                       Integer statusId) {
        this.id = id;
        this.vehicleId =  vehicleId;
        this.serviceRequest = serviceRequest;
        this.scheduledDate = scheduledDate;
        this.technicianId = technicianId;
        this.statusId = statusId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public List<String> getServiceRequest() {
        return serviceRequest;
    }

    public void setServiceRequest(List<String> serviceRequest) {
        this.serviceRequest = serviceRequest;
    }

    public LocalDateTime getScheduledDate() {
        return scheduledDate;
    }

    public void setScheduledDate(LocalDateTime scheduledDate) {
        this.scheduledDate = scheduledDate;
    }

    public Long getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(Long technicianId) {
        this.technicianId = technicianId;
    }

    public Integer getStatusId() {
        return statusId;
    }

    public void setStatusId(Integer statusId) {
        this.statusId = statusId;
    }
}