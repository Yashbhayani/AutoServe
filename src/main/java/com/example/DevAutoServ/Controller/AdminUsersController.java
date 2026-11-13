package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Services.AdminUsersServices;
import com.example.DevAutoServ.Services.ApiAccessServices;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUsersController {
    private final AdminUsersServices users;
    private final ApiAccessServices access;

    public AdminUsersController(AdminUsersServices users, ApiAccessServices access) {
        this.users = users;
        this.access = access;
    }

    @GetMapping
    public Map<String,Object> list(@RequestHeader(value="Authorization",required=false) String auth) {
        access.require(auth,"ADMIN");
        return users.list();
    }

    @PostMapping
    public Map<String,Object> create(@RequestHeader(value="Authorization",required=false) String auth,@RequestBody Map<String,Object> body) {
        return users.create(access.require(auth,"ADMIN"),body);
    }

    @PutMapping("/{id}")
    public Map<String,Object> update(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id,@RequestBody Map<String,Object> body) {
        return users.update(access.require(auth,"ADMIN"),id,body);
    }

    @ExceptionHandler(ApiAccessServices.ApiFailure.class)
    public ResponseEntity<?> failure(ApiAccessServices.ApiFailure error) {
        return ResponseEntity.status(error.status).body(Map.of("success",false,"message",error.getMessage()));
    }
}
