package com.example.DevAutoServ.Repository;

import java.util.Map;

public interface StatusServicesRepository {
    Integer GetStatusId(String tableCode, String statusCode);

    String GetStatusCode(Integer statusId);
    boolean IsValidServiceRequestTransition(
            String currentStatus,
            String newStatus
    );

    boolean IsValidAppointmentTransition(
            String currentStatus,
            String newStatus
    );
     Map<String, Object> UpdateServiceRequestStatus(
            Long serviceRequestId,
            String newStatus,
            String username,
            String userRole
    );
    Map<String, Object> UpdateAppointmentStatus(
            Long appointmentId,
            String newStatus,
            String username,
            String userRole
    );
}
