package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Services.ApiAccessServices;
import com.example.DevAutoServ.Services.InsightsServices;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportsController {
    private final InsightsServices insights;
    private final ApiAccessServices access;

    public ReportsController(InsightsServices insights,ApiAccessServices access) {
        this.insights=insights;
        this.access=access;
    }

    @GetMapping
    public Map<String,Object> report(@RequestHeader(value="Authorization",required=false) String auth,
            @RequestParam(required=false) String from,@RequestParam(required=false) String to) {
        access.require(auth,"ADMIN");
        return insights.report(from,to);
    }

    @ExceptionHandler(ApiAccessServices.ApiFailure.class)
    public ResponseEntity<?> failure(ApiAccessServices.ApiFailure error) {
        return ResponseEntity.status(error.status).body(Map.of("success",false,"message",error.getMessage()));
    }
}
