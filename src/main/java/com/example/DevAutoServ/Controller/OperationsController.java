package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Services.*;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/operations")
public class OperationsController {
    private final OperationsServices operations;
    private final ApiAccessServices access;
    public OperationsController(OperationsServices operations, ApiAccessServices access) { this.operations=operations;this.access=access; }
    @GetMapping("/snapshot")
    public Map<String,Object> snapshot(@RequestHeader(value="Authorization",required=false) String auth) {
        return operations.snapshot(access.require(auth,"ADMIN","TECHNICIAN","CUSTOMER"));
    }
    @PostMapping("/{action}")
    public Map<String,Object> act(@PathVariable String action,@RequestBody Map<String,Object> body,@RequestHeader(value="Authorization",required=false) String auth) {
        var actor=access.require(auth,"ADMIN","TECHNICIAN","CUSTOMER");
        OperationsServices.validate(action,body);
        return operations.execute(actor,action,body);
    }
    @ExceptionHandler(ApiAccessServices.ApiFailure.class)
    public ResponseEntity<?> failure(ApiAccessServices.ApiFailure e) { return ResponseEntity.status(e.status).body(Map.of("success",false,"message",e.getMessage())); }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> failure(DataAccessException e) { return ResponseEntity.status(503).body(Map.of("success",false,"message","The data service is unavailable. Please retry or check the database migrations.")); }
}
