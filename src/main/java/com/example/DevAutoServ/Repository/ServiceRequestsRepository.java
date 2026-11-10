package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.Model.ServiceRequestModel;

import java.util.Map;

public interface ServiceRequestsRepository {
    Map<String, Object> createServiceRequests(ServiceRequestModel serviceRequestModel);
    Map<String, Object> EditServiceRequests(ServiceRequestModel serviceRequestModel);
    Map<String, Object> DeleteServiceRequests(Long id);
}
