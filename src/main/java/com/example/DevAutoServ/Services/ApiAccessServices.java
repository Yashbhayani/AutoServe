package com.example.DevAutoServ.Services;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.*;

/** Verifies the token and reads current account permissions for each API call. */
@Service
public class ApiAccessServices {
    private final AuthServices auth;
    private final JdbcTemplate jdbc;
    public ApiAccessServices(AuthServices auth, JdbcTemplate jdbc) { this.auth=auth; this.jdbc=jdbc; }
    public record Actor(long id, Set<String> roles) { public boolean has(String role) { return roles.contains(role); } }
    public Actor require(String authorization, String... allowed) {
        Map<String,Object> verified=auth.VerifyToken(authorization);
        if (!Boolean.TRUE.equals(verified.get("success"))) throw new ApiFailure(401,"Please sign in again.");
        var users=jdbc.queryForList("SELECT id FROM dev_autoserve.users WHERE email=? AND is_active=1",verified.get("username"));
        if(users.size()!=1) throw new ApiFailure(401,"Please sign in again.");
        long id=((Number)users.get(0).get("id")).longValue();
        Set<String> roles=new HashSet<>(jdbc.queryForList("SELECT r.code FROM dev_autoserve.user_roles ur JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.is_active=1",String.class,id));
        if(allowed.length>0 && Arrays.stream(allowed).noneMatch(roles::contains)) throw new ApiFailure(403,"You do not have access to this operation.");
        return new Actor(id,Set.copyOf(roles));
    }
    public static class ApiFailure extends RuntimeException {
        public final int status;
        public ApiFailure(int status,String message) { super(message);this.status=status; }
    }
}
