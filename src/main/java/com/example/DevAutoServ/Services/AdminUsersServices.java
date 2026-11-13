package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Services.ApiAccessServices.Actor;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class AdminUsersServices {
    private static final Set<String> ALLOWED_ROLES = Set.of("ADMIN", "TECHNICIAN", "CUSTOMER");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final JdbcTemplate jdbc;
    private final PasswordServices passwords;

    public AdminUsersServices(JdbcTemplate jdbc, PasswordServices passwords) {
        this.jdbc = jdbc;
        this.passwords = passwords;
    }

    public Map<String,Object> list() {
        List<Map<String,Object>> records = jdbc.queryForList("""
            SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.is_active,u.created_at,r.code AS role
            FROM dev_autoserve.users u
            LEFT JOIN dev_autoserve.user_roles ur ON ur.user_id=u.id
            LEFT JOIN dev_autoserve.roles r ON r.id=ur.role_id
            ORDER BY u.created_at DESC,u.id DESC
            """);
        Map<Long,Map<String,Object>> byId = new LinkedHashMap<>();
        for (Map<String,Object> row : records) {
            long id = ((Number)row.get("id")).longValue();
            Map<String,Object> user = byId.computeIfAbsent(id, key -> {
                Map<String,Object> copy = new LinkedHashMap<>(row);
                copy.remove("role");
                copy.put("roles", new ArrayList<String>());
                return copy;
            });
            if (row.get("role") != null) {
                @SuppressWarnings("unchecked") List<String> roles = (List<String>)user.get("roles");
                roles.add(row.get("role").toString());
            }
        }
        return Map.of("success",true,"data",new ArrayList<>(byId.values()));
    }

    @Transactional
    public Map<String,Object> create(Actor actor, Map<String,Object> body) {
        requireAdmin(actor);
        String first = text(body,"firstName");
        String last = text(body,"lastName");
        String email = text(body,"email").toLowerCase(Locale.ROOT);
        String phone = text(body,"phone");
        String password = text(body,"password");
        String role = selectedRole(body.get("roles"));
        validateProfile(first,last,email,phone);
        validatePassword(password);
        String username = username(email);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users WHERE email=? OR username=?",Long.class,email,username)>0) {
            throw new ApiFailure(409,"An account with this email or username already exists.");
        }
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO dev_autoserve.users(username,email,first_name,last_name,phone,driving_license_number,password_hash,is_email_verified,is_phone_verified,is_active)
                VALUES(?,?,?,?,?,'',?,0,0,?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1,username);
            statement.setString(2,email);
            statement.setString(3,first);
            statement.setString(4,last);
            statement.setString(5,phone.isBlank()?null:phone);
            statement.setString(6,passwords.EncryptPassword(password));
            statement.setBoolean(7,booleanValue(body.get("active"),true));
            return statement;
        },key);
        Number id = key.getKeyList().isEmpty()?null:(Number)key.getKeyList().get(0).get("id");
        if (id == null) throw new ApiFailure(500,"Could not create the account.");
        addRole(id.longValue(),role);
        return Map.of("success",true,"data",user(id.longValue()));
    }

    @Transactional
    public Map<String,Object> update(Actor actor,long id,Map<String,Object> body) {
        requireAdmin(actor);
        Map<String,Object> current = one("SELECT id,is_active FROM dev_autoserve.users WHERE id=? FOR UPDATE",id);
        String first = text(body,"firstName");
        String last = text(body,"lastName");
        String email = text(body,"email").toLowerCase(Locale.ROOT);
        String phone = text(body,"phone");
        String role = selectedRole(body.get("roles"));
        boolean active = booleanValue(body.get("active"),true);
        validateProfile(first,last,email,phone);
        if (actor.id()==id && !active) throw new ApiFailure(403,"You cannot deactivate your own account.");
        List<String> oldRoles = jdbc.queryForList("SELECT r.code FROM dev_autoserve.user_roles ur JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE ur.user_id=?",String.class,id);
        if (actor.id()==id && (oldRoles.size()!=1 || !oldRoles.contains(role))) throw new ApiFailure(403,"You cannot change your own role.");
        boolean wasAdmin = oldRoles.contains("ADMIN") && truthy(current.get("is_active"));
        if (wasAdmin && (!active || !role.equals("ADMIN")) && jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users u JOIN dev_autoserve.user_roles ur ON ur.user_id=u.id JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE u.is_active=1 AND r.code='ADMIN' AND u.id<>?",Long.class,id)==0) {
            throw new ApiFailure(409,"The last active administrator cannot be deactivated or demoted.");
        }
        String username=username(email);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users WHERE (email=? OR username=?) AND id<>?",Long.class,email,username,id)>0) {
            throw new ApiFailure(409,"An account with this email or username already exists.");
        }
        jdbc.update("UPDATE dev_autoserve.users SET username=?,email=?,first_name=?,last_name=?,phone=?,is_active=? WHERE id=?",username,email,first,last,phone.isBlank()?null:phone,active,id);
        String password=text(body,"password");
        if (!password.isBlank()) {
            validatePassword(password);
            jdbc.update("UPDATE dev_autoserve.users SET password_hash=? WHERE id=?",passwords.EncryptPassword(password),id);
            jdbc.update("UPDATE dev_autoserve.refresh_tokens SET is_active=0 WHERE user_id=?",id);
        }
        jdbc.update("DELETE FROM dev_autoserve.user_roles WHERE user_id=?",id);
        addRole(id,role);
        return Map.of("success",true,"data",user(id));
    }

    private void addRole(long userId,String code) {
        Long roleId = jdbc.queryForObject("SELECT id FROM dev_autoserve.roles WHERE code=? AND is_active=1",Long.class,code);
        if (roleId == null) throw new ApiFailure(400,"Selected role is unavailable.");
        jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(?,?)",userId,roleId);
    }

    private Map<String,Object> user(long id) {
        Map<String,Object> user = one("SELECT id,first_name,last_name,email,phone,is_active,created_at FROM dev_autoserve.users WHERE id=?",id);
        user.put("roles",jdbc.queryForList("SELECT r.code FROM dev_autoserve.user_roles ur JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE ur.user_id=?",String.class,id));
        return user;
    }

    private Map<String,Object> one(String sql,Object...args) {
        List<Map<String,Object>> rows=jdbc.queryForList(sql,args);
        if(rows.isEmpty()) throw new ApiFailure(404,"User not found.");
        return new LinkedHashMap<>(rows.get(0));
    }

    private static String selectedRole(Object value) {
        if (!(value instanceof List<?> roles) || roles.size()!=1 || !(roles.get(0) instanceof String role) || !ALLOWED_ROLES.contains(role)) {
            throw new ApiFailure(400,"Select exactly one supported role.");
        }
        return role;
    }

    private static void validateProfile(String first,String last,String email,String phone) {
        if(first.isBlank()||first.length()>50||last.isBlank()||last.length()>50||email.length()>120||!EMAIL.matcher(email).matches()||phone.length()>20) {
            throw new ApiFailure(400,"Enter valid names, email, and phone.");
        }
    }

    private static void validatePassword(String password) {
        int bytes=password.getBytes(StandardCharsets.UTF_8).length;
        if(password.isBlank()||password.length()<8||bytes>72) throw new ApiFailure(400,"Password must be at least 8 characters and at most 72 UTF-8 bytes.");
    }

    private static String username(String email) {
        String value=email.substring(0,email.indexOf('@'));
        if(value.length()>50) throw new ApiFailure(400,"Email local-part must be at most 50 characters.");
        return value;
    }

    private static String text(Map<String,Object> body,String key) {
        Object value=body.get(key);
        return value==null?"":value.toString().trim();
    }

    private static boolean booleanValue(Object value,boolean fallback) {
        if(value==null) return fallback;
        if(value instanceof Boolean bool) return bool;
        throw new ApiFailure(400,"Account status must be true or false.");
    }

    private static boolean truthy(Object value) {
        return value instanceof Boolean bool?bool:value instanceof Number number&&number.intValue()!=0;
    }

    private static void requireAdmin(Actor actor) {
        if(actor==null||!actor.has("ADMIN")) throw new ApiFailure(403,"Admin access required.");
    }
}
