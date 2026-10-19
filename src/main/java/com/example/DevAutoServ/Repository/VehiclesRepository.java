package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.AutoServeModel.Vehicle;

import java.util.Map;

public interface VehiclesRepository {
    Map<String, Object> AddVehicles(Vehicle vehicle);
    Map<String, Object> EditVehicles(Vehicle vehicle);
    Map<String, Object> DeleteVehicles(Long id);
}
