package com.example.DevAutoServ;

import com.example.DevAutoServ.Services.AdminUsersServices;
import com.example.DevAutoServ.Services.ApiAccessServices.Actor;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import com.example.DevAutoServ.Services.PasswordServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AdminUsersIntegrationTests {
    private JdbcTemplate jdbc;
    private AdminUsersServices users;
    private final Actor admin=new Actor(1,Set.of("ADMIN"));
    private final Actor customer=new Actor(2,Set.of("CUSTOMER"));

    @BeforeEach void setup() {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1","sa","");
        new ResourceDatabasePopulator(new ClassPathResource("operations-schema.sql"),new ClassPathResource("operations-lookups.sql"),new ClassPathResource("schema.sql")).execute(ds);
        jdbc=new JdbcTemplate(ds);
        jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(1,'admin','admin@example.test','Admin','One','unused',0,0),(2,'customer','customer@example.test','Customer','One','unused',0,0)");
        jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(1,3),(2,1)");
        users=new AdminUsersServices(jdbc,new PasswordServices());
    }

    private Map<String,Object> body(String email,List<String> roles) {
        return Map.of("firstName","New","lastName","User","email",email,"phone","","password","correct horse battery","roles",roles,"active",true);
    }

    @Test void rejectsMultipleRoles() {
        assertThrows(ApiFailure.class,()->users.create(admin,body("new@example.test",List.of("CUSTOMER","TECHNICIAN"))));
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users",Integer.class));
    }

    @Test void adminCreatesAndListsExactlyOneRole() {
        users.create(admin,body("new@example.test",List.of("TECHNICIAN")));
        var rows=(List<Map<String,Object>>)users.list().get("data");
        assertEquals(3,rows.size());
        var created=rows.stream().filter(row->"new@example.test".equals(row.get("email"))).findFirst().orElseThrow();
        assertEquals(List.of("TECHNICIAN"),created.get("roles"));
        assertTrue(((Number)created.get("is_active")).intValue()==1 || Boolean.TRUE.equals(created.get("is_active")));
        assertTrue(jdbc.queryForObject("SELECT password_hash FROM dev_autoserve.users WHERE email='new@example.test'",String.class).startsWith("$2"));
    }

    @Test void updatesAccountAndRejectsRemovingLastAdministrator() {
        users.create(admin,body("secondadmin@example.test",List.of("ADMIN")));
        long second=jdbc.queryForObject("SELECT id FROM dev_autoserve.users WHERE email='secondadmin@example.test'",Long.class);
        users.update(admin,second,Map.of("firstName","Second","lastName","Admin","email","secondadmin@example.test","phone","","roles",List.of("CUSTOMER"),"active",true,"password",""));
        assertEquals("CUSTOMER",jdbc.queryForObject("SELECT r.code FROM dev_autoserve.user_roles ur JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE ur.user_id=?",String.class,second));
        assertThrows(ApiFailure.class,()->users.update(admin,1,Map.of("firstName","Admin","lastName","One","email","admin@example.test","phone","","roles",List.of("CUSTOMER"),"active",true,"password","")));
    }

    @Test void rejectsNonAdminAndDuplicateEmail() {
        assertThrows(ApiFailure.class,()->users.create(customer,body("new@example.test",List.of("CUSTOMER"))));
        assertThrows(ApiFailure.class,()->users.create(admin,body("admin@example.test",List.of("CUSTOMER"))));
    }
}
