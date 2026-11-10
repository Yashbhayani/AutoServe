package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.ServiceRequestModel;
import com.example.DevAutoServ.Repository.ServiceRequestsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ServiceRequestsServices implements ServiceRequestsRepository {

    @Autowired
    private  QueryHandlerServices queryHandlerServices;
    private JdbcTemplate jdbcTemplate;
    private PasswordServices passwordServices;
    public String SpResult = null;

    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  ServiceRequestsServices(
            QueryHandlerServices queryHandlerServices,
            JdbcTemplate jdbcTemplate){
        this.queryHandlerServices  = queryHandlerServices;
        this.jdbcTemplate = jdbcTemplate;
    }


    private Map<String, Object> Result(boolean success, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", message);
        return response;
    }

    @Override
    public Map<String, Object> createServiceRequests(ServiceRequestModel serviceRequestModel) {
        if (serviceRequestModel == null) {
            return Result(false, "Service request data is required.");
        }

        Integer vehicleCount = queryHandlerServices.checkVehicleQuery(
                commonQueryServicesModel.IsVehicleOwned,
                serviceRequestModel.getCustomerId(),
                serviceRequestModel.getVehicleId());

        if (vehicleCount == null || vehicleCount == 0) {
            return Result(false,
                    "Selected vehicle does not exist or does not belong to you.");
        }

        // 5. Validate selected service types
        List<Integer> serviceTypeList =
                serviceRequestModel.getServiceTypeList();

        // Remove duplicate service type IDs
        Set<Integer> uniqueServiceTypes = new HashSet<>(serviceTypeList);
        if (uniqueServiceTypes.size() != serviceTypeList.size()) {
            return Result(false, "Duplicate service types are not allowed.");
        }

        for (Integer serviceTypeId : serviceTypeList) {

            if (serviceTypeId == null || serviceTypeId <= 0) {
                return Result(false, "Invalid service type selected.");
            }
        }


        String placeholders = String.join(
                ",",
                java.util.Collections.nCopies(serviceTypeList.size(), "?")
        );

        Integer activeServiceTypeCount = jdbcTemplate.queryForObject(
                commonQueryServicesModel.AreServiceTypesActive,
                Integer.class,
                serviceTypeList.toArray()
        );


        if (activeServiceTypeCount == null ||
                activeServiceTypeCount != serviceTypeList.size()) {

            return Result(false,
                    "One or more selected service types are invalid or inactive.");
        }

        //
        List<Integer> statusIds = jdbcTemplate.query(
                commonQueryServicesModel.GetStatusId,
                (rs, rowNum) -> rs.getInt("id"),
                ProjectCodes.StatusTableEnum.SERVICE_REQUEST.name(),
                ProjectCodes.SERVICEREQUEST.SUBMITTED.name()
        );

        if (statusIds.isEmpty()) {
            return Result(false, "Submitted status not found.");
        }

        Integer statusId = statusIds.get(0);

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps = connection.prepareStatement(
                    commonQueryServicesModel.InsertServiceRequest,
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, serviceRequestModel.getCustomerId());
            ps.setLong(2, serviceRequestModel.getVehicleId());
            ps.setString(3, serviceRequestModel.getDescription());

            if (serviceRequestModel.getPreferredDate() != null) {
                ps.setObject(4, serviceRequestModel.getPreferredDate());
            } else {
                ps.setNull(4, java.sql.Types.DATE);
            }

            ps.setInt(5, statusId);

            return ps;

        }, keyHolder);

        Number generatedId = keyHolder.getKey();

        if (generatedId == null) {

            return Result(
                    false,
                    "Unable to create service request."
            );

        }

        Long serviceRequestId = generatedId.longValue();

        for (Integer serviceTypeId : serviceTypeList) {

            jdbcTemplate.update(
                    commonQueryServicesModel.InsertSelectedServicesTypes,
                    serviceRequestId,
                    serviceTypeId
            );
        }

        // 9. Return response
        Map<String, Object> response = Result(
                true,
                "Service request created successfully."
        );
        return response;
    }

    @Override
    public Map<String, Object> EditServiceRequests(ServiceRequestModel serviceRequestModel) {
        return Map.of();
    }

    @Override
    public Map<String, Object> DeleteServiceRequests(Long id) {
        return Map.of();
    }
}
