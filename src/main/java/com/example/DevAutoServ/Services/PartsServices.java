package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Model.PartModel;

import com.example.DevAutoServ.Repository.PartsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PartsServices implements PartsRepository {

    private  final JdbcTemplate jdbcTemplate;
    private final QueryHandlerServices queryHandlerServices;
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();
    public PartsServices(
            JdbcTemplate jdbcTemplate,
            QueryHandlerServices queryHandlerServices
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.queryHandlerServices = queryHandlerServices;
    }

    // COMMON RESPONSE
    private Map<String, Object> Result(
            Boolean success,
            String message) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", success);
        response.put("message", message);

        return response;
    }

    // VALIDATE PART
    private String validatePart(PartModel model) {

        if (model == null) {
            return "Part data is required.";
        }

        if (model.getCategoryId() == null) {
            return "Category is required.";
        }

        if (model.getCode() == null ||
                model.getCode().trim().isEmpty()) {
            return "Part code is required.";
        }

        if (model.getName() == null ||
                model.getName().trim().isEmpty()) {
            return "Part name is required.";
        }


        if (model.getUnitPrice() == null ||
                model.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            return "Unit price must be zero or greater.";
        }

        if (model.getStockQuantity() == null ||
                model.getStockQuantity() < 0) {
            return "Stock quantity must be zero or greater.";
        }

        return null;
    }

    // NORMALIZE INPUT
    private void normalizePart(PartModel model) {

        model.setCode(model.getCode().trim().toUpperCase());
        model.setName(model.getName().trim());
    }

    // GET ALL CATEGORIES
    public Map<String, Object> getCategories() {

        List<Map<String, Object>> categories;
        categories = queryHandlerServices.getCategories(commonQueryServicesModel.getCategories);

        Map<String, Object> response = Result(
                true,
                "Categories retrieved successfully."
        );

        response.put("data", categories);

        return response;
    }

    // GET PARTS BY CATEGORY
    public Map<String, Object> getPartsByCategory(Long categoryId) {

        if (categoryId == null ||
                queryHandlerServices.checkCategory(commonQueryServicesModel.checkCategory,categoryId) == 0) {

            return Result(false, "Invalid category.");
        }

        List<Map<String, Object>> parts =
                queryHandlerServices.getPartsByCategory(commonQueryServicesModel.getPartsByCategory, categoryId);

        Map<String, Object> response = Result(
                true,
                "Parts retrieved successfully."
        );

        response.put("data", parts);

        return response;
    }

    // GET PART BY ID
    public Map<String, Object> getPartById(Long id) {

        if (id == null) {
            return Result(false, "Part ID is required.");
        }

        Map<String, Object> part =
                queryHandlerServices.getPartById(commonQueryServicesModel.getPartById, id);

        if (part == null) {
            return Result(false, "Part not found.");
        }

        Map<String, Object> response = Result(
                true,
                "Part retrieved successfully."
        );

        response.put("data", part);

        return response;
    }

    // CHECK DUPLICATE CODE AND SKU
    private String checkDuplicatePart(
            Long currentPartId,
            PartModel model) {

        Map<String, Object> existingPart = null;

        if (currentPartId != null) {
            existingPart = queryHandlerServices.getPartById(commonQueryServicesModel.getPartById ,currentPartId);
        }

        if (queryHandlerServices.checkPartCode(commonQueryServicesModel.checkPartCode, model.getCode()) > 0) {

            if (existingPart == null ||
                    !model.getCode().equalsIgnoreCase(
                            String.valueOf(existingPart.get("code")))) {

                return "Part code already exists.";
            }
        }

        return null;
    }

    // CREATE PART
    @Transactional
    public Map<String, Object> createPart(PartModel model) {

        String validationMessage = validatePart(model);

        if (validationMessage != null) {
            return Result(false, validationMessage);
        }

        if (queryHandlerServices.checkCategory(commonQueryServicesModel.checkCategory,model.getCategoryId()) == 0) {
            return Result(false, "Selected category does not exist.");
        }

        normalizePart(model);

        String duplicateMessage =
                checkDuplicatePart(null, model);

        if (duplicateMessage != null) {
            return Result(false, duplicateMessage);
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement ps = connection.prepareStatement(
                    commonQueryServicesModel.insertPart,
                    Statement.RETURN_GENERATED_KEYS
            );

            ps.setLong(1, model.getCategoryId());
            ps.setString(2, model.getCode());
            ps.setString(3, model.getName());
            ps.setString(4, model.getSku());

            return ps;

        }, keyHolder);

        if (keyHolder.getKey() == null) {
            throw new RuntimeException("Unable to retrieve generated part ID.");
        }

        Long partId = keyHolder.getKey().longValue();

        if (partId == null || partId <= 0) {
            throw new RuntimeException("Unable to create part.");
        }

        // 2. Insert initial price
         jdbcTemplate.update(
                commonQueryServicesModel.insertPartPrice,
                partId,
                model.getUnitPrice()
        );

        // 3. Insert initial inventory
        // First reorder level will be 5 automatically
        List<Integer> result = jdbcTemplate.query(
                commonQueryServicesModel.getNextReorderLevel,
                (rs, rowNum) -> rs.getInt("reorder_level"),
                partId
        );

        // Previous reorder level + 1
        Integer nextReorderLevel =  result.get(0) + 1;

         jdbcTemplate.update(
                commonQueryServicesModel.savePartInventory,
                partId,
                model.getStockQuantity(),
                nextReorderLevel
        );

        Map<String, Object> response = Result(
                true,
                "Part created successfully."
        );

        response.put("partId", partId);

        return response;
    }

    // UPDATE PART
    @Transactional
    public Map<String, Object> updatePart(
            Long id,
            PartModel model) {

        if (id == null) {
            return Result(false, "Part ID is required.");
        }

        Map<String, Object> existingPart =
                queryHandlerServices.getPartById(commonQueryServicesModel.getPartById, id);

        if (existingPart == null) {
            return Result(false, "Part not found.");
        }

        String validationMessage = validatePart(model);

        if (validationMessage != null) {
            return Result(false, validationMessage);
        }

        if (queryHandlerServices.checkCategory(commonQueryServicesModel.checkCategory, model.getCategoryId()) == 0) {
            return Result(false, "Selected category does not exist.");
        }

        normalizePart(model);

        String duplicateMessage =
                checkDuplicatePart(id, model);

        if (duplicateMessage != null) {
            return Result(false, duplicateMessage);
        }

        // 1. Update part details
        jdbcTemplate.update(
                commonQueryServicesModel.updatePart,
                model.getCategoryId(),
                model.getCode(),
                model.getName(),
                model.getSku(),
                id
        );

        List<BigDecimal> result = jdbcTemplate.query(
                commonQueryServicesModel.getCurrentPrice,
                (rs, rowNum) -> rs.getBigDecimal("unit_price"),
                id
        );


        // 2. Check whether price changed
        BigDecimal currentPrice = result.isEmpty() ? null : result.get(0);

        if (currentPrice == null ||
                currentPrice.compareTo(model.getUnitPrice()) != 0) {

            // Close previous price
            jdbcTemplate.update(commonQueryServicesModel.closeCurrentPrice, id);

            // Insert new price history
            jdbcTemplate.update(
                    commonQueryServicesModel.insertPartPrice,
                    id,
                    model.getUnitPrice()
            );
        }

        // 3. Update inventory
        // Existing reorder level + 1 automatically
        List<Integer> resultNextReorderLevel = jdbcTemplate.query(
                commonQueryServicesModel.getNextReorderLevel,
                (rs, rowNum) -> rs.getInt("reorder_level"),
                id
        );

        // Previous reorder level + 1
        Integer nextReorderLevel =  resultNextReorderLevel.get(0) + 1;

        jdbcTemplate.update(
                commonQueryServicesModel.savePartInventory,
                id,
                model.getStockQuantity(),
                nextReorderLevel
        );

        Map<String, Object> response = Result(
                true,
                "Part created successfully."
        );


        return Result(true, "Part updated successfully.");
    }

    // DELETE PART
    @Transactional
    public Map<String, Object> deletePart(Long id) {

        if (id == null) {
            return Result(false, "Part ID is required.");
        }

        Map<String, Object> existingPart =
                queryHandlerServices.getPartById(commonQueryServicesModel.getPartById, id);

        if (existingPart == null) {
            return Result(false, "Part not found.");
        }

        // Related price and inventory records are deleted
        // through ON DELETE CASCADE foreign keys.
        jdbcTemplate.update(commonQueryServicesModel.deletePart, id);
        return Result(
                true,
                "Part and related inventory and price records deleted successfully."
        );
    }
}
