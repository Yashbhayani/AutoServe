package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Model.PartModel;
import com.example.DevAutoServ.Services.AuthServices;
import com.example.DevAutoServ.Services.PartsServices;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/parts")
public class PartsController {

    private final PartsServices partsServices;
    private final AuthServices authServices;

    public PartsController(
            PartsServices partsServices,
            AuthServices authServices) {

        this.partsServices = partsServices;
        this.authServices = authServices;
    }

    // COMMON RESPONSE
    private Map<String, Object> response(
            Boolean success,
            String message) {

        Map<String, Object> result = new HashMap<>();

        result.put("success", success);
        result.put("message", message);

        return result;
    }

    // AUTHORIZATION
    private Map<String, Object> authorize(
            String authorization,
            boolean adminOnly) {

        Map<String, Object> tokenResponse =
                authServices.VerifyToken(authorization);

        if (!Boolean.TRUE.equals(tokenResponse.get("success"))) {
            return response(
                    false,
                    "Invalid or expired access token."
            );
        }

        String username = String.valueOf(
                tokenResponse.get("username")
        );

        Map<String, Object> roleResponse =
                authServices.CheckUserRole(username);

        if (!Boolean.TRUE.equals(roleResponse.get("success"))) {
            return response(
                    false,
                    "Unable to retrieve user role."
            );
        }

        String userRole = String.valueOf(
                roleResponse.get("userRole")
        ).toUpperCase();

        if (adminOnly && !"ADMIN".equals(userRole)) {
            return response(
                    false,
                    "You are not authorized to perform this operation."
            );
        }

        Map<String, Object> result =
                response(true, "Authorized.");

        result.put("username", username);
        result.put("userRole", userRole);

        return result;
    }

    // GET ALL CATEGORIES
    @GetMapping("/categories")
    public Map<String, Object> getCategories(
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, false);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.getCategories();
    }

    // GET PARTS BY CATEGORY
    @GetMapping("/category/{categoryId}")
    public Map<String, Object> getPartsByCategory(
            @PathVariable Long categoryId,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, false);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.getPartsByCategory(categoryId);
    }

    // GET PART BY ID
    @GetMapping("/{id}")
    public Map<String, Object> getPartById(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, false);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.getPartById(id);
    }

    // CREATE PART
    @PostMapping("/create")
    public Map<String, Object> createPart(
            @RequestBody PartModel model,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, true);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.createPart(model);
    }

    // UPDATE PART
    @PutMapping("/update/{id}")
    public Map<String, Object> updatePart(
            @PathVariable Long id,
            @RequestBody PartModel model,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, true);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.updatePart(id, model);
    }

    // DELETE PART
    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deletePart(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        Map<String, Object> auth =
                authorize(authorization, true);

        if (!Boolean.TRUE.equals(auth.get("success"))) {
            return auth;
        }

        return partsServices.deletePart(id);
    }
}
