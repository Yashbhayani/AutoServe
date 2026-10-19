package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.AutoServeModel.Vehicle;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Repository.VehiclesRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/vehicles")
public class VehiclesController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private  final VehiclesRepository vehiclesRepository;

    public  VehiclesController(VehiclesRepository vehiclesRepository){
        this.vehiclesRepository = vehiclesRepository;
    }

    @PostMapping("/add")
    public Map<String, Object> AddVehicles(@RequestBody Vehicle vehicle){
        return vehiclesRepository.AddVehicles(vehicle);
    }

    @PutMapping("/edit")
    public Map<String, Object> EditVehicles(@RequestBody Vehicle vehicle){
        return vehiclesRepository.EditVehicles(vehicle);
    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> DeleteVehicles(@PathVariable Long id){
        return vehiclesRepository.DeleteVehicles(id);
    }

}
