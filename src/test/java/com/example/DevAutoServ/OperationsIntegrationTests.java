package com.example.DevAutoServ;

import com.example.DevAutoServ.Services.NotificationServices;
import com.example.DevAutoServ.Services.OperationsServices;
import com.example.DevAutoServ.Services.PartsBillingServices;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import com.example.DevAutoServ.Services.ApiAccessServices.Actor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class OperationsIntegrationTests {
    private JdbcTemplate jdbc;
    private OperationsServices operations;
    private TransactionTemplate tx;
    private final Actor admin = new Actor(1, Set.of("ADMIN"));
    private final Actor technician = new Actor(2, Set.of("TECHNICIAN"));
    private final Actor customer = new Actor(3, Set.of("CUSTOMER"));
    private final Actor stranger = new Actor(4, Set.of("CUSTOMER"));
    private final Actor otherTechnician = new Actor(5, Set.of("TECHNICIAN"));

    @BeforeEach
    void setup() {
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1",
                "sa", "");
        new ResourceDatabasePopulator(
                new ClassPathResource("operations-schema.sql"),
                new ClassPathResource("operations-lookups.sql"),
                new ClassPathResource("schema.sql")).execute(dataSource);
        jdbc = new JdbcTemplate(dataSource);
        tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        operations = new OperationsServices(jdbc, new NotificationServices(jdbc), new PartsBillingServices(jdbc));
        for (int id = 1; id <= 5; id++) {
            jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(?,?,?,?,?,'unused',0,0)",
                    id, "user" + id, "u" + id + "@example.com", "User", Integer.toString(id));
        }
        jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(1,3),(2,2),(3,1),(4,1),(5,2)");
        jdbc.update("INSERT INTO dev_autoserve.vehicles(id,customer_id,year,make,model,vin,license_plate,color,mileage) VALUES(1,3,2020,'Toyota','Camry','VIN-1','TAG1','Blue','10000')");
        jdbc.update("INSERT INTO dev_autoserve.service_requests(id,customer_id,vehicle_id,description,status_id) VALUES(1,3,1,'Brakes',1)");
        jdbc.update("INSERT INTO dev_autoserve.work_orders(id,service_request_id,technician_id,status_id) VALUES(1,1,2,16)");
        jdbc.update("INSERT INTO dev_autoserve.as_workflow(request_id,stage) VALUES(1,'Service Requested')");
        jdbc.update("INSERT INTO dev_autoserve.appointments(service_request_id,scheduled_date,scheduled_time,status_id,is_active,is_appointed) VALUES(1,?,?,8,1,1)",
                LocalDate.now().plusDays(2), "10:00");
    }

    private Map<String, Object> act(Actor actor, String action, Map<String, Object> values) {
        var body = new HashMap<>(values);
        if (!body.containsKey("requestId") && !action.equals("request.create") && !action.equals("vehicle.save")) {
            body.put("requestId", 1L);
        }
        OperationsServices.validate(action, body);
        return tx.execute(status -> operations.execute(actor, action, body));
    }

    private void stage(String stage) {
        jdbc.update("UPDATE dev_autoserve.as_workflow SET stage=? WHERE request_id=1", stage);
    }

    @Test
    void creation() {
        var vehicle = act(customer, "vehicle.save", Map.of(
                "id", 0, "make", "Honda", "model", "Civic", "year", 2022,
                "color", "Blue", "vin", "", "plate", "TEST2", "mileage", 12000));
        long vehicleId = ((Number) vehicle.get("id")).longValue();
        var request = act(customer, "request.create", Map.of(
                "vehicleId", vehicleId, "description", "Brake noise", "serviceIds", List.of(13),
                "date", LocalDate.now().plusDays(3).toString(), "time", "10:00"));
        long requestId = ((Number) request.get("requestId")).longValue();
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_requests WHERE id=? AND vehicle_id=? AND customer_id=3", Integer.class, requestId, vehicleId));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.appointments WHERE service_request_id=? AND is_active=1", Integer.class, requestId));
        assertEquals("Service Requested", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=?", String.class, requestId));
    }

    @Test
    void ownership() {
        assertTrue(((List<?>) operations.snapshot(stranger).get("requests")).isEmpty());
        assertThrows(ApiFailure.class, () -> act(stranger, "request.cancel", Map.of("requestId", 1L)));
        assertEquals(1, jdbc.queryForObject("SELECT is_active FROM dev_autoserve.service_requests WHERE id=1", Integer.class));
    }

    @Test
    void workflow() {
        act(admin, "assign", Map.of("requestId", 1L, "technicianId", 2));
        act(technician, "checkin", Map.of("requestId", 1L, "note", "Arrived"));
        assertEquals("Vehicle Checked In", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=1", String.class));
        act(technician, "diagnosis.submit", Map.of("requestId", 1L, "diagnosis", "Replace pads", "revision", 0));
        act(customer, "approve", Map.of("requestId", 1L, "revision", 1));
        act(technician, "complete", Map.of("requestId", 1L, "note", "Completed"));
        assertEquals("Completed", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=1", String.class));
    }

    @Test
    void noBypass() {
        stage("Diagnosis");
        assertThrows(ApiFailure.class, () -> act(technician, "complete", Map.of("requestId", 1L)));
        assertEquals("Diagnosis", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=1", String.class));
    }

    @Test
    void diagnosisAndRevision() {
        stage("Vehicle Checked In");
        assertThrows(ApiFailure.class,
                () -> act(otherTechnician, "diagnosis.save", Map.of("requestId", 1L, "diagnosis", "Not assigned")));
        act(technician, "diagnosis.save", Map.of("requestId", 1L, "diagnosis", "Inspect brakes"));
        act(technician, "diagnosis.submit", Map.of("requestId", 1L, "diagnosis", "Replace pads", "revision", 0));
        act(customer, "revise", Map.of("requestId", 1L));
        assertEquals("Diagnosis", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=1", String.class));
    }

    @Test
    void holds() {
        stage("Repair");
        act(technician, "hold", Map.of("requestId", 1L, "note", "Waiting for customer"));
        assertEquals(1, jdbc.queryForObject("SELECT held FROM dev_autoserve.as_workflow WHERE request_id=1", Integer.class));
        assertThrows(ApiFailure.class, () -> act(technician, "complete", Map.of("requestId", 1L)));
        assertThrows(ApiFailure.class, () -> act(technician, "resume", Map.of("requestId", 1L, "note", " ")));
        act(technician, "resume", Map.of("requestId", 1L, "note", "Parts arrived"));
        assertEquals(0, jdbc.queryForObject("SELECT held FROM dev_autoserve.as_workflow WHERE request_id=1", Integer.class));
        assertEquals("Repair", jdbc.queryForObject("SELECT stage FROM dev_autoserve.as_workflow WHERE request_id=1", String.class));
    }

    @Test
    void billing() {
        stage("Diagnosis");
        act(technician, "diagnosis.submit", Map.of("requestId", 1L, "diagnosis", "Labor only", "revision", 0));
        act(customer, "approve", Map.of("requestId", 1L, "revision", 1));
        act(technician, "complete", Map.of("requestId", 1L));
        act(admin, "invoice.issue", Map.of("requestId", 1L, "labor", "50.00", "laborDescription", "Repair labor"));
        assertEquals("50.00", jdbc.queryForObject("SELECT CAST(amount AS VARCHAR) FROM dev_autoserve.invoices WHERE work_order_id=1", String.class));
        act(admin, "payment.record", Map.of("requestId", 1L, "method", "OTHER"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.payments", Integer.class));
        assertThrows(ApiFailure.class, () -> act(admin, "payment.record", Map.of("requestId", 1L, "method", "OTHER")));
    }

    @Test
    void appointments() {
        LocalDate first = LocalDate.now().plusDays(3), second = LocalDate.now().plusDays(4);
        act(customer, "appointment.save", Map.of("requestId", 1L, "date", first.toString(), "time", "11:00"));
        act(customer, "appointment.save", Map.of("requestId", 1L, "date", second.toString(), "time", "12:00"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.appointments WHERE service_request_id=1 AND status_id<>11", Integer.class));
        act(customer, "appointment.cancel", Map.of("requestId", 1L));
        assertEquals(1, jdbc.queryForObject("SELECT is_active FROM dev_autoserve.service_requests WHERE id=1", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.appointments WHERE service_request_id=1 AND status_id=11", Integer.class));
    }

    @Test
    void rollback() {
        int before = jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_requests", Integer.class);
        jdbc.execute("DROP TABLE dev_autoserve.as_events");
        assertThrows(Exception.class, () -> tx.execute(status -> operations.execute(customer, "request.create", Map.of(
                "vehicleId", 1, "description", "Rollback test", "serviceIds", List.of(13)))));
        assertEquals(before, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_requests", Integer.class));
    }

    @Test
    void settings() {
        act(customer, "profile.save", Map.of("requestId", 1L, "first_name", "Updated", "last_name", "Customer", "phone", "555"));
        act(admin, "settings.save", Map.of("requestId", 1L, "center_name", "Test Center", "phone", "555", "email", "service@example.test", "address", "1 Test Way"));
        act(admin, "technician.save", Map.of("id", 2, "specialties", "Brakes", "availability", "Busy"));
        assertEquals("Updated", jdbc.queryForObject("SELECT first_name FROM dev_autoserve.users WHERE id=3", String.class));
        assertEquals("Test Center", jdbc.queryForObject("SELECT center_name FROM dev_autoserve.as_settings WHERE id=1", String.class));
        assertEquals("Busy", jdbc.queryForObject("SELECT availability FROM dev_autoserve.as_technicians WHERE user_id=2", String.class));
    }

    @Test
    void edits() {
        act(customer, "request.update", Map.of("requestId", 1L, "description", "Updated concern", "serviceIds", List.of(14)));
        assertEquals("Updated concern", jdbc.queryForObject("SELECT description FROM dev_autoserve.service_requests WHERE id=1", String.class));
        act(admin, "assign", Map.of("requestId", 1L, "technicianId", 2));
        act(admin, "unassign", Map.of("requestId", 1L));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.work_orders WHERE service_request_id=1", Integer.class));
    }
}
