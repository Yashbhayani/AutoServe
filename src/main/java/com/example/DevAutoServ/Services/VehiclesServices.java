package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.AutoServeModel.Vehicle;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Repository.VehiclesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@Service
public class VehiclesServices implements VehiclesRepository {

    @Autowired
    private  QueryHandlerServices queryHandlerServices;
    private JdbcTemplate jdbcTemplate;
    private PasswordServices passwordServices;
    public String SpResult = null;

    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  VehiclesServices(
                         QueryHandlerServices queryHandlerServices,
                         JdbcTemplate jdbcTemplate){
        this.queryHandlerServices  = queryHandlerServices;
        this.jdbcTemplate = jdbcTemplate;
    }


    @Override
    public Map<String, Object> AddVehicles(Vehicle vehicle) {
        Map<String, Object> response = new HashMap<>();

        try {
            KeyHolder keyHolder = new GeneratedKeyHolder();

            int rows = jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                        commonQueryServicesModel.InsertVehicle,
                        Statement.RETURN_GENERATED_KEYS
                );

                ps.setLong(1, vehicle.getCustomerId());
                ps.setString(2, vehicle.getMake());
                ps.setString(3, vehicle.getModel());
                ps.setInt(4, vehicle.getYear());
                ps.setString(5, vehicle.getVin());
                ps.setString(6, vehicle.getLicensePlate());

                return ps;
            }, keyHolder);

            if (rows > 0) {
                response.put("success", true);
                response.put("message", "Vehicle added successfully");
                response.put("vehicleId", keyHolder.getKey().longValue());
            } else {
                response.put("success", false);
                response.put("message", "Vehicle was not added");
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to add vehicle");
        }

        return response;
    }

    @Override
    public Map<String, Object> EditVehicles(Vehicle vehicle) {
        Map<String, Object> response = new HashMap<>();

        try {
            int rows = jdbcTemplate.update(
                    commonQueryServicesModel.EditVehicle,
                    vehicle.getMake(),
                    vehicle.getModel(),
                    vehicle.getYear(),
                    vehicle.getVin(),
                    vehicle.getLicensePlate(),
                    vehicle.getId()
            );

            if (rows > 0) {
                response.put("success", true);
                response.put("message", "Vehicle updated successfully");
            } else {
                response.put("success", false);
                response.put("message",
                        "Vehicle not found or already inactive");
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update vehicle");
        }

        return response;
    }

    @Override
    public Map<String, Object> DeleteVehicles(Long id) {
        Map<String, Object> response = new HashMap<>();

        try {
            int rows = jdbcTemplate.update(
                    commonQueryServicesModel.DeleteVehicle,
                    id
            );

            if (rows > 0) {
                response.put("success", true);
                response.put("message", "Vehicle deactivated successfully");
            } else {
                response.put("success", false);
                response.put("message",
                        "Vehicle not found or already inactive");
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to deactivate vehicle");
        }

        return response;
    }
}
