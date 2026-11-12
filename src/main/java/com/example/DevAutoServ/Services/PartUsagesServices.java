package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Model.AssignPartModel;
import com.example.DevAutoServ.Repository.PartUsagesRepository;
import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PartUsagesServices implements PartUsagesRepository {

    private  final  JdbcTemplate jdbcTemplate;
    CommonQueryServicesModel queryServicesModel = new CommonQueryServicesModel();
    public PartUsagesServices(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    private Map<String, Object> Result(
            boolean success,
            String message
    ) {
        Map<String, Object> response = new HashMap<>();
        response.put("Success", success);
        response.put("Message", message);
        return response;
    }


    @Override
    public Map<String, Object> assignParts(
            Long workOrderId,
            List<AssignPartModel> parts
    ) {

        try {

            if (workOrderId == null || workOrderId <= 0) {
                return Result(false, "Valid work order ID is required.");
            }

            if (parts == null || parts.isEmpty()) {
                return Result(false, "Please provide at least one part.");
            }

            // Combine quantities for duplicate part IDs
            Map<Long, Integer> partQuantities = new LinkedHashMap<>();

            for (AssignPartModel part : parts) {

                if (part == null ||
                        part.getPartId() == null ||
                        part.getPartId() <= 0) {
                    return Result(false, "Valid part ID is required.");
                }

                if (part.getQuantity() == null ||
                        part.getQuantity() <= 0) {
                    return Result(false, "Part quantity must be greater than zero.");
                }

                partQuantities.merge(
                        part.getPartId(),
                        part.getQuantity(),
                        Integer::sum
                );
            }

            // Validate stock for every part before inserting
            for (Map.Entry<Long, Integer> entry : partQuantities.entrySet()) {

                Long partId = entry.getKey();
                Integer quantity = entry.getValue();

                // Check whether the part exists and is active
                Integer partExists = jdbcTemplate.queryForObject(queryServicesModel.checkPart, Integer.class, partId);

                if (partExists == null || partExists == 0) {
                    return Result(
                            false,
                            "Part ID " + partId + " does not exist or is inactive."
                    );
                }

                List<Integer> result = jdbcTemplate.query(
                        queryServicesModel.getAvailableStock,
                        (rs, rowNum) -> rs.getInt("stock_quantity"),
                        partId
                );

                Integer availableStock =  result.isEmpty() ? null : result.get(0);

                if (availableStock == null) {
                    return Result(
                            false,
                            "Inventory not found for part ID " + partId + "."
                    );
                }

                if (availableStock < quantity) {
                    return Result(
                            false,
                            "Insufficient stock for part ID " + partId
                                    + ". Available: " + availableStock
                                    + ", Requested: " + quantity
                    );
                }
            }

            // Insert usages and deduct inventory
            for (Map.Entry<Long, Integer> entry : partQuantities.entrySet()) {

                Long partId = entry.getKey();
                Integer quantity = entry.getValue();

                jdbcTemplate.update(
                        queryServicesModel.insertPartUsage,
                        workOrderId,
                        partId,
                        quantity
                );


                Integer updated = jdbcTemplate.update(
                        queryServicesModel.deductInventory,
                        quantity,
                        partId,
                        quantity
                );

                if (updated == null || updated != 1) {
                    throw new RuntimeException(
                            "Unable to update inventory for part ID " + partId
                    );
                }
            }

            Map<String, Object> response =
                    Result(true, "Parts assigned successfully.");

            response.put("WorkOrderId", workOrderId);
            response.put("TotalParts", partQuantities.size());

            return response;

        } catch (Exception e) {

            // Throwing is important: it makes @Transactional roll back.
            throw new RuntimeException(
                    "Failed to assign parts: " + e.getMessage(),
                    e
            );
        }
    }

    @Override
    public Map<String, Object> updateParts(
            Long workOrderId,
            AssignPartModel part
    ) {

        try {

            if (workOrderId == null || workOrderId <= 0) {
                return Result(false, "Valid work order ID is required.");
            }

            if (part == null ||
                    part.getPartId() == null ||
                    part.getPartId() <= 0) {
                return Result(false, "Valid part ID is required.");
            }

            if (part.getQuantity() == null || part.getQuantity() <= 0) {
                return Result(false, "Quantity must be greater than zero.");
            }

            Long partId = part.getPartId();
            Integer newQuantity = part.getQuantity();

            // Check existing assignment and lock its row
            List<Integer> assignedResult = jdbcTemplate.query(
                    queryServicesModel.getAssignedPart,
                    (rs, rowNum) -> rs.getInt("quantity"),
                    workOrderId,
                    partId
            );

            if (assignedResult.isEmpty()) {
                return Result(false, "Assigned part not found.");
            }

            Integer oldQuantity = assignedResult.get(0);

            // Check active part
            Integer partExists = jdbcTemplate.queryForObject(
                    queryServicesModel.checkPart,
                    Integer.class,
                    partId
            );

            if (partExists == null || partExists == 0) {
                return Result(false, "Part does not exist or is inactive.");
            }

            // Lock and get inventory
            List<Integer> stockResult = jdbcTemplate.query(
                    queryServicesModel.getAvailableStock,
                    (rs, rowNum) -> rs.getInt("stock_quantity"),
                    partId
            );

            if (stockResult.isEmpty()) {
                return Result(false, "Inventory not found for this part.");
            }

            Integer availableStock = stockResult.get(0);

            // Calculate quantity difference
            int difference = newQuantity - oldQuantity;

            if (difference > 0) {

                // Additional quantity required
                if (availableStock < difference) {
                    return Result(
                            false,
                            "Insufficient stock. Available: " + availableStock
                                    + ", Additional required: " + difference
                    );
                }

                // Deduct additional quantity
                Integer deducted = jdbcTemplate.update(
                        queryServicesModel.deductInventory,
                        difference,
                        partId,
                        difference
                );

                if (deducted != 1) {
                    throw new RuntimeException(
                            "Unable to deduct inventory for part ID " + partId
                    );
                }

            } else if (difference < 0) {

                // Return unused quantity to inventory
                Integer restored = jdbcTemplate.update(
                        queryServicesModel.restoreInventory,
                        Math.abs(difference),
                        partId
                );

                if (restored != 1) {
                    throw new RuntimeException(
                            "Unable to restore inventory for part ID " + partId
                    );
                }
            }

            // Update assigned quantity
            Integer updated = jdbcTemplate.update(
                    queryServicesModel.updatePartUsage,
                    newQuantity,
                    workOrderId,
                    partId
            );

            if (updated != 1) {
                throw new RuntimeException("Unable to update assigned part.");
            }

            Map<String, Object> response =
                    Result(true, "Assigned part updated successfully.");

            response.put("WorkOrderId", workOrderId);
            response.put("PartId", partId);
            response.put("OldQuantity", oldQuantity);
            response.put("NewQuantity", newQuantity);

            return response;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to update assigned part: " + e.getMessage(),
                    e
            );
        }
    }

    @Override
    public Map<String, Object> deleteParts(
            Long workOrderId,
            Long partId
    ) {

        try {

            if (workOrderId == null || workOrderId <= 0) {
                return Result(false, "Valid work order ID is required.");
            }

            if (partId == null || partId <= 0) {
                return Result(false, "Valid part ID is required.");
            }

            // Find existing assignment and lock the row
            List<Integer> assignedResult = jdbcTemplate.query(
                    queryServicesModel.getAssignedPart,
                    (rs, rowNum) -> rs.getInt("quantity"),
                    workOrderId,
                    partId
            );

            if (assignedResult.isEmpty()) {
                return Result(false, "Assigned part not found.");
            }

            Integer assignedQuantity = assignedResult.get(0);

            // Lock and verify inventory exists
            List<Integer> stockResult = jdbcTemplate.query(
                    queryServicesModel.getAvailableStock,
                    (rs, rowNum) -> rs.getInt("stock_quantity"),
                    partId
            );

            if (stockResult.isEmpty()) {
                return Result(false, "Inventory not found for this part.");
            }

            // Delete assignment
            Integer deleted = jdbcTemplate.update(
                    queryServicesModel.deletePartUsage,
                    workOrderId,
                    partId
            );

            if (deleted != 1) {
                throw new RuntimeException("Unable to delete assigned part.");
            }

            // Restore assigned quantity
            Integer restored = jdbcTemplate.update(
                    queryServicesModel.restoreInventory,
                    assignedQuantity,
                    partId
            );

            if (restored != 1) {
                throw new RuntimeException(
                        "Unable to restore inventory for part ID " + partId
                );
            }

            Map<String, Object> response =
                    Result(true, "Assigned part deleted successfully.");

            response.put("WorkOrderId", workOrderId);
            response.put("PartId", partId);
            response.put("RestoredQuantity", assignedQuantity);

            return response;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to delete assigned part: " + e.getMessage(),
                    e
            );
        }
    }
}
