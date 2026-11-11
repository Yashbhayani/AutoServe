package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Model.ServiceRequestModel;
import com.example.DevAutoServ.Repository.ServiceRequestsRepository;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ServiceRequestsServices
        implements ServiceRequestsRepository {

    private final JdbcTemplate jdbcTemplate;
    private final StatusServices statusServices;

    private final CommonQueryServicesModel queries =
            new CommonQueryServicesModel();

    public ServiceRequestsServices(
            JdbcTemplate jdbcTemplate,
            StatusServices statusServices
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.statusServices = statusServices;
    }

    // CREATE SERVICE REQUEST + AUTOMATIC APPOINTMENT

    @Override
    @Transactional
    public Map<String, Object> createServiceRequests(
            ServiceRequestModel model) {

        if (model == null) {
            return Result(false, "Service request data is required.");
        }

        if (model.getVehicleId() == null) {
            return Result(false, "Vehicle is required.");
        }

        if (model.getServiceTypeList() == null
                || model.getServiceTypeList().isEmpty()) {
            return Result(false, "Please select at least one service type.");
        }

        if (model.getDescription() == null
                || model.getDescription().isBlank()) {
            return Result(false, "Description is required.");
        }

        if (model.getDescription().length() > 5000) {
            return Result(false, "Description is too long.");
        }


        // Validate vehicle ownership.
        Integer vehicleCount = jdbcTemplate.queryForObject(
                queries.IsVehicleOwned,
                Integer.class,
                model.getVehicleId(),
                model.getCustomerId()
        );

        if (vehicleCount == null || vehicleCount == 0) {
            return Result(false,
                    "The selected vehicle does not belong to this customer.");
        }

        // Validate selected service types.
        List<Integer> serviceTypeIds =
                model.getServiceTypeList().stream()
                        .filter(id -> id != null && id > 0)
                        .distinct()
                        .toList();

        if (serviceTypeIds.isEmpty()
                || serviceTypeIds.size() != model.getServiceTypeList().size()) {
            return Result(false, "Invalid service type selection.");
        }

        for (Integer serviceTypeId : serviceTypeIds) {

            Integer count = jdbcTemplate.queryForObject(
                    queries.IsServiceTypeActive,
                    Integer.class,
                    serviceTypeId
            );

            if (count == null || count == 0) {
                return Result(false,
                        "Invalid or inactive service type: " + serviceTypeId);
            }
        }

        // Retrieve initial service request status dynamically.
        Integer submittedStatusId = statusServices.GetStatusId(
                "SERVICE_REQUEST",
                "SUBMITTED"
        );

        if (submittedStatusId == null) {
            throw new IllegalStateException(
                    "SERVICE_REQUEST/SUBMITTED status was not found."
            );
        }

        // Retrieve initial appointment status dynamically.
        Integer scheduledStatusId = statusServices.GetStatusId(
                "APPOINTMENT",
                "SCHEDULED"
        );

        if (scheduledStatusId == null) {
            throw new IllegalStateException(
                    "APPOINTMENT/SCHEDULED status was not found."
            );
        }

        // 1. Insert service request.
        KeyHolder requestKeyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps = connection.prepareStatement(
                    queries.InsertServiceRequest,
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, model.getCustomerId());
            ps.setLong(2, model.getVehicleId());
            ps.setString(3, model.getDescription());

            if (model.getPreferredDate() == null) {
                ps.setNull(4, Types.DATE);
            } else {
                ps.setDate(
                        4,
                        java.sql.Date.valueOf(model.getPreferredDate())
                );
            }

            ps.setInt(5, submittedStatusId);
            if (model.getPreferredTime() == null) {
                ps.setNull(6, Types.TIME);
            } else {
                ps.setTime(
                        6,
                        java.sql.Time.valueOf(model.getPreferredTime())
                );
            }
            return ps;

        }, requestKeyHolder);

        Number requestKey = requestKeyHolder.getKey();

        if (requestKey == null) {
            throw new IllegalStateException(
                    "Could not retrieve the created service request ID."
            );
        }

        Long serviceRequestId = requestKey.longValue();

        // 2. Insert selected service types.
        for (Integer serviceTypeId : serviceTypeIds) {

            jdbcTemplate.update(
                    queries.InsertSelectedServicesTypes,
                    serviceRequestId,
                    serviceTypeId
            );
        }

        // 3. Automatically create appointment.
        // scheduled_date = NULL until Admin schedules it.
        // technician_id = NULL until Admin assigns a technician.
        jdbcTemplate.update(
                queries.InsertAppointment,
                serviceRequestId,
                scheduledStatusId
        );

        Map<String, Object> response = Result(
                true,
                "Service request submitted and appointment created successfully."
        );

        response.put("serviceRequestId", serviceRequestId);
        response.put("appointmentStatus", "SCHEDULED");
        response.put("serviceRequestStatus", "SUBMITTED");

        return response;
    }

    // UPDATE SERVICE REQUEST

    @Override
    @Transactional
    public Map<String, Object> EditServiceRequests(ServiceRequestModel model) {

        Integer ownershipCount = jdbcTemplate.queryForObject(
                queries.IsServiceRequestOwned,
                Integer.class,
                model.getId(),
                model.getCustomerId()
        );

        if (ownershipCount == null || ownershipCount == 0) {
            return Result(false,
                    "Service request not found or access denied.");
        }

        if (model.getVehicleId() == null) {
            return Result(false, "Vehicle is required.");
        }

        if (model.getDescription() == null
                || model.getDescription().isBlank()
                || model.getDescription().length() > 5000) {
            return Result(false, "Valid description is required.");
        }

        // Only submitted requests can be edited by the customer.
        String currentStatus = jdbcTemplate.queryForObject(
                """
                SELECT s.code
                FROM dev_autoserve.service_requests sr
                INNER JOIN dev_autoserve.statuses s
                    ON s.id = sr.status_id
                WHERE sr.id = ?
                  AND sr.customer_id = ?
                  AND sr.is_active = 1
                """,
                String.class,
                model.getId(),
                model.getCustomerId()
        );

        if (!"SUBMITTED".equals(currentStatus)) {
            return Result(false,
                    "Only submitted service requests can be edited.");
        }

        Integer vehicleCount = jdbcTemplate.queryForObject(
                queries.IsVehicleOwned,
                Integer.class,
                model.getVehicleId(),
                model.getCustomerId()
        );

        if (vehicleCount == null || vehicleCount == 0) {
            return Result(false,
                    "The selected vehicle does not belong to this customer.");
        }

        List<Integer> serviceTypeIds =
                model.getServiceTypeList() == null
                        ? List.of()
                        : model.getServiceTypeList().stream()
                        .filter(typeId ->
                                typeId != null && typeId > 0)
                        .distinct()
                        .toList();

        if (serviceTypeIds.isEmpty()) {
            return Result(false,
                    "Please select at least one service type.");
        }

        if (serviceTypeIds.size() != model.getServiceTypeList().size()) {
            return Result(false, "Invalid service type selection.");
        }

        for (Integer serviceTypeId : serviceTypeIds) {

            Integer count = jdbcTemplate.queryForObject(
                    queries.IsServiceTypeActive,
                    Integer.class,
                    serviceTypeId
            );

            if (count == null || count == 0) {
                return Result(false,
                        "Invalid or inactive service type: " + serviceTypeId);
            }
        }

        // Update request details.
        jdbcTemplate.update(
                connection -> {

                    PreparedStatement ps = connection.prepareStatement(
                            queries.UpdateServiceRequests
                    );

                    ps.setLong(1, model.getVehicleId());
                    ps.setString(2, model.getDescription());

                    if (model.getPreferredDate() == null) {
                        ps.setNull(3, Types.DATE);
                    } else {
                        ps.setDate(
                                3,
                                java.sql.Date.valueOf(model.getPreferredDate())
                        );
                    }

                    ps.setLong(4, model.getId());
                    ps.setLong(5, model.getCustomerId());

                    return ps;
                }
        );

        // Deactivate previously selected services.
        jdbcTemplate.update(
                queries.DeactivateOldTypes,
                model.getId()
        );

        // Reactivate or insert selected service types.
        for (Integer serviceTypeId : serviceTypeIds) {

            jdbcTemplate.update(
                    queries.InsertSelectedServicesTypes,
                    model.getId(),
                    serviceTypeId
            );
        }

        return Result(true, "Service request updated successfully.");
    }

    // DELETE SERVICE REQUEST

    @Override
    @Transactional
    public Map<String, Object> DeleteServiceRequests(
            Long id) {

        if (id == null || id <= 0) {
            return Result(false, "Valid service request ID is required.");
        }

        Integer ownershipCount = jdbcTemplate.queryForObject(
                queries.IsServiceRequestOwned,
                Integer.class,
                id
        );

        if (ownershipCount == null || ownershipCount == 0) {
            return Result(false,
                    "Service request not found or access denied.");
        }

        String currentStatus = jdbcTemplate.queryForObject(
                """
                SELECT s.code
                FROM dev_autoserve.service_requests sr
                INNER JOIN dev_autoserve.statuses s
                    ON s.id = sr.status_id
                WHERE sr.id = ?
                  AND sr.is_active = 1
                """,
                String.class,
                id

        );

        if (!"SUBMITTED".equals(currentStatus)) {
            return Result(false,
                    "Only submitted service requests can be deleted.");
        }

        // Soft-delete service request.
        jdbcTemplate.update(
                queries.DeleteServiceRequests,
                id);

        // Deactivate its selected services.
        jdbcTemplate.update(
                queries.DeleteServiceRequestServices,
                id
        );

        // Cancel its automatically created appointment.
        Integer cancelledStatusId =
                statusServices.GetStatusId("APPOINTMENT", "CANCELLED");

        if (cancelledStatusId == null) {
            throw new IllegalStateException(
                    "APPOINTMENT/CANCELLED status was not found."
            );
        }

        jdbcTemplate.update(
                queries.CancelLinkedAppointment,
                cancelledStatusId,
                id
        );

        return Result(true,
                "Service request and its appointment deleted successfully.");
    }

    // GET USER ID FROM AUTHENTICATED USERNAME

    private Long getUserId(String username) {

        try {
            return jdbcTemplate.queryForObject(
                    queries.GetUserId,
                    Long.class,
                    username
            );
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    private Map<String, Object> Result(
            boolean success,
            String message
    ) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }
}