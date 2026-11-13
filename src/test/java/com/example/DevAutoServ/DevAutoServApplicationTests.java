package com.example.DevAutoServ;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
 "spring.datasource.url=jdbc:h2:mem:startup;MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
 "spring.sql.init.schema-locations=classpath:operations-schema.sql,classpath:operations-lookups.sql,classpath:schema.sql",
 "debug=false", "logging.level.root=WARN", "spring.main.banner-mode=off",
 "spring.jpa.hibernate.ddl-auto=none", "spring.flyway.enabled=false",
 "jwt.secret=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUY=", "secretKey=fictional-test-key"
})
class DevAutoServApplicationTests {
    @org.springframework.beans.factory.annotation.Autowired org.springframework.web.context.WebApplicationContext context;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired com.example.DevAutoServ.Services.AuthServices auth;
    @Test void frontendEndpointsUseJwtAuthenticationAndCurrentRoles() throws Exception {
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(context).build();
        jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(901,'apiadmin','admin@test.invalid','Test','Admin','unused',0,0),(902,'apicustomer','customer@test.invalid','Test','Customer','unused',0,0)");
        jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(901,3),(902,1)");
        String admin="Bearer "+auth.generateAccessToken("admin@test.invalid"),customer="Bearer "+auth.generateAccessToken("customer@test.invalid");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/operations/snapshot")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/operations/snapshot").header("Authorization",admin)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.parts").isArray()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.invoiceLines").isArray());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/operations/parts.set").contentType("application/json").content("{\"requestId\":1,\"partId\":1,\"quantity\":1,\"revision\":0}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/parts").header("Authorization",admin)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/parts").header("Authorization",customer)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/user/me").header("Authorization",customer)).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.user.roles[0]").value("CUSTOMER"));
    }


	@Test
	void contextLoads() {
	}

}
