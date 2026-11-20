package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.Model.VehiclesModel;

import java.util.Map;

public interface VehiclesRepository {
    Map<String, Object> AddVehicles(VehiclesModel vehicle);
    Map<String, Object> EditVehicles(VehiclesModel vehicle);
    Map<String, Object> DeleteVehicles(Long id);
}
