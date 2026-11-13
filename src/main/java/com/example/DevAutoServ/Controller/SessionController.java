package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.ApiAccessServices;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/** Account endpoints used by the shared frontend request/session helper. */
@RestController
@RequestMapping("/api/user")
public class SessionController {
    private final ApiAccessServices access;
    private final UserRepository users;
    private final JdbcTemplate jdbc;
    public SessionController(ApiAccessServices access,UserRepository users,JdbcTemplate jdbc) { this.access=access;this.users=users;this.jdbc=jdbc; }
    @GetMapping("/me")
    public Map<String,Object> me(@RequestHeader(value="Authorization",required=false) String auth) {
        var actor=access.require(auth);
        var user=jdbc.queryForMap("SELECT id,email,first_name,last_name,phone,username FROM dev_autoserve.users WHERE id=?",actor.id());
        user.put("roles",actor.roles());return Map.of("success",true,"user",user);
    }
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String,String> body) {
        var result=users.RefreshAccessToken(body.getOrDefault("refreshToken",""));
        return ResponseEntity.status(Boolean.TRUE.equals(result.get("success"))?200:401).body(result);
    }
    @PostMapping("/logout")
    public Map<String,Object> logout(@RequestBody Map<String,String> body) { return users.Logout(body.getOrDefault("refreshToken","")); }
    @ExceptionHandler(ApiAccessServices.ApiFailure.class)
    public ResponseEntity<?> failure(ApiAccessServices.ApiFailure e) {return ResponseEntity.status(e.status).body(Map.of("success",false,"message",e.getMessage()));}
}
