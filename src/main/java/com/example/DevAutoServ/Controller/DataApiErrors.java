package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import org.springframework.dao.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {PartsController.class, InventoryController.class, NotificationsController.class})
public class DataApiErrors {
    @ExceptionHandler(ApiFailure.class)
    public ResponseEntity<?> failure(ApiFailure error) { return response(error.status, error.getMessage()); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict(DataIntegrityViolationException error) { return response(409, "The change conflicts with an existing or linked record. Refresh and check the details."); }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> unavailable(DataAccessException error) { return response(503, "The data service is temporarily unavailable. Please try again."); }
    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<?> invalid(Exception error) { return response(400, "Invalid request. Check the fields and use whole numbers for quantities and IDs."); }
    private ResponseEntity<?> response(int status, String message) { return ResponseEntity.status(status).body(Map.of("success", false, "message", message)); }
}
