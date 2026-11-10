package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.AutoServeModel.Vehicle;
import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import com.example.DevAutoServ.Enum.ProjectCodes;
import com.example.DevAutoServ.Model.VehiclesModel;
import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Repository.VehiclesRepository;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.QueryHandlerServices;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/vehicles")
public class VehiclesController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private QueryHandlerServices queryHandlerServices;
    private  final VehiclesRepository vehiclesRepository;
    private  final AuthServices authServices;
    CommonQueryServicesModel commonQueryServicesModel = new CommonQueryServicesModel();

    public  VehiclesController(VehiclesRepository vehiclesRepository, AuthServices authServices){
        this.vehiclesRepository = vehiclesRepository;
        this.authServices = authServices;
    }

    @PostMapping("/add")
    public Map<String, Object> AddVehicles(
            @RequestBody VehiclesModel vehicle,
            @RequestHeader(value = "Authorization", required = false) String authorization){
        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }
        String loggedInUsername =
                tokenResponse.get("username").toString();

        Map<String, Object> getUserRole = authServices.CheckUserRole(loggedInUsername);
        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }
        String userRole = getUserRole.get("userRole").toString();

        // Find the ID of the logged-in user
        Long loggedInUserId = queryHandlerServices.GetUserId
                        (commonQueryServicesModel.GetUserId,loggedInUsername);

        vehicle.setCustomerId(loggedInUserId);


/*        //Admin
        if (
                userRole.equalsIgnoreCase(ProjectCodes.RoleEnum.ADMIN.name())
                        &&
                        authServices.CheckthePermission(
                                ProjectCodes.PermissionEnum.VEHICLE_CREATE.name(),
                                ProjectCodes.RoleEnum.ADMIN.name()
                        )) {
            return vehiclesRepository.AddVehicles(vehicle);
        }*/

        // Permission As par UserRole
        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.VEHICLE_CREATE.name(),
                userRole
        );

        if (!hasPermission) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied");
            return response;
        }


        return vehiclesRepository.AddVehicles(vehicle);

    }

    @PutMapping("/edit//{id}")
    public Map<String, Object> EditVehicles(
            @PathVariable Long id,
            @RequestBody VehiclesModel vehicle,
            @RequestHeader(value = "Authorization", required = false) String authorization){

        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }
        String loggedInUsername =
                tokenResponse.get("username").toString();

        Map<String, Object> getUserRole = authServices.CheckUserRole(loggedInUsername);
        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }
        String userRole = getUserRole.get("userRole").toString();

        // Find the ID of the logged-in user
        Long loggedInUserId = queryHandlerServices.GetUserId
                (commonQueryServicesModel.GetUserId,loggedInUsername);

        if(vehicle.getCustomerId() == null){
            vehicle.setCustomerId(loggedInUserId);
        }

/*
        //Admin
        if (
                userRole.equalsIgnoreCase(ProjectCodes.RoleEnum.ADMIN.name())
                        &&
                        authServices.CheckthePermission(
                                ProjectCodes.PermissionEnum.VEHICLE_UPDATE_OWN.name(),
                                ProjectCodes.RoleEnum.ADMIN.name()
                        )) {
            return vehiclesRepository.AddVehicles(vehicle);
        }
*/

        // Permission As par UserRole
        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.VEHICLE_UPDATE_OWN.name(),
                userRole
        );

        if (!hasPermission) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied");
            return response;
        }
        return vehiclesRepository.EditVehicles(vehicle);
    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> DeleteVehicles(@PathVariable Long id,
                                              @RequestHeader(value = "Authorization", required = false) String authorization){

        Map<String, Object> tokenResponse = authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return tokenResponse;
        }
        String loggedInUsername =
                tokenResponse.get("username").toString();

        Map<String, Object> getUserRole = authServices.CheckUserRole(loggedInUsername);
        if (!Boolean.TRUE.equals(getUserRole.get("success"))) {
            return getUserRole;
        }
        String userRole = getUserRole.get("userRole").toString();

        // Permission As par UserRole
        boolean hasPermission = authServices.CheckthePermission(
                ProjectCodes.PermissionEnum.VEHICLE_DELETE_OWN.name(),
                userRole
        );

        if (!hasPermission) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Access denied");
            return response;
        }

        return vehiclesRepository.DeleteVehicles(id);
    }

}
