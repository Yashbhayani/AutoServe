package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Repository.UserRepository;
import com.example.DevAutoServ.Services.ApiAccessServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.net.InetAddress;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;

/** Account endpoints used by the shared frontend request/session helper. */
@RestController
@RequestMapping("/api/user")
public class SessionController {
    private static final ConcurrentHashMap<String,ArrayDeque<Long>> RESET_ATTEMPTS=new ConcurrentHashMap<>();
    @Value("${ALLOW_EMAIL_ONLY_RESET:false}") private boolean allowEmailOnlyReset;
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
    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String,String> body,jakarta.servlet.http.HttpServletRequest request) {
        String remote=request.getRemoteAddr();
        if(!allowEmailOnlyReset||!isLoopback(remote)) return ResponseEntity.notFound().build();
        if(!allowResetAttempt(remote)) return ResponseEntity.status(429).body(Map.of("success",false,"message","Too many reset attempts. Try again later."));
        return ResponseEntity.ok(users.ResetPassword(body.get("email"),body.get("password")));
    }
    private static boolean isLoopback(String address) {
        try { return address!=null&&InetAddress.getByName(address).isLoopbackAddress(); }
        catch(Exception ignored) { return false; }
    }
    private static boolean allowResetAttempt(String address) {
        long now=System.currentTimeMillis();
        synchronized(RESET_ATTEMPTS) {
            ArrayDeque<Long> attempts=RESET_ATTEMPTS.computeIfAbsent(address,key->new ArrayDeque<>());
            while(!attempts.isEmpty()&&now-attempts.peekFirst()>900_000L) attempts.removeFirst();
            if(attempts.size()>=5) return false;
            attempts.addLast(now);
            return true;
        }
    }
    @ExceptionHandler(ApiAccessServices.ApiFailure.class)
    public ResponseEntity<?> failure(ApiAccessServices.ApiFailure e) {return ResponseEntity.status(e.status).body(Map.of("success",false,"message",e.getMessage()));}
}
