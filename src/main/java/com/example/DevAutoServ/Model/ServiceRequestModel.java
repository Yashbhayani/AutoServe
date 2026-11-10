package com.example.DevAutoServ.Model;

import java.time.LocalDate;
import java.util.List;

public class ServiceRequestModel {
    private Long id;
    private Long customerId;
    private Long vehicleId;
    private String description;
    private List<Integer> serviceTypeList ;
    private LocalDate preferredDate;
    private Integer statusId;

    public ServiceRequestModel(Long id, Long customerId, Long vehicleId, String description, List<Integer> serviceTypeList, LocalDate preferredDate, Integer statusId) {
        this.id = id;
        this.customerId = customerId;
        this.vehicleId = vehicleId;
        this.description = description;
        this.serviceTypeList = serviceTypeList;
        this.preferredDate = preferredDate;
        this.statusId = statusId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getVehicleId() {
        return vehicleId;
    }

    public void setVehicleId(Long vehicleId) {
        this.vehicleId = vehicleId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Integer> getServiceTypeList() {
        return serviceTypeList;
    }

    public void setServiceTypeList(List<Integer> serviceTypeList) {
        this.serviceTypeList = serviceTypeList;
    }

    public LocalDate getPreferredDate() {
        return preferredDate;
    }

    public void setPreferredDate(LocalDate preferredDate) {
        this.preferredDate = preferredDate;
    }

    public Integer getStatusId() {
        return statusId;
    }

    public void setStatusId(Integer statusId) {
        this.statusId = statusId;
    }
}
