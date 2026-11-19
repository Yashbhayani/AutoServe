package com.example.DevAutoServ;

import com.example.DevAutoServ.Services.ApiAccessServices.Actor;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import com.example.DevAutoServ.Services.InventoryServices;
import com.example.DevAutoServ.Services.NotificationServices;
import com.example.DevAutoServ.Services.OperationsServices;
import com.example.DevAutoServ.Services.PartsBillingServices;
import com.example.DevAutoServ.Services.PartsServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ShopIntegrationTests {
    private JdbcTemplate jdbc;
    private TransactionTemplate tx;
    private NotificationServices notifications;
    private OperationsServices operations;
    private InventoryServices inventory;
    private PartsServices parts;
    private final Actor admin = new Actor(1, Set.of("ADMIN"));
    private final Actor technician = new Actor(2, Set.of("TECHNICIAN"));
    private final Actor customer = new Actor(3, Set.of("CUSTOMER"));
    private final Actor stranger = new Actor(4, Set.of("CUSTOMER"));

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
        notifications = new NotificationServices(jdbc);
        var billing = new PartsBillingServices(jdbc);
        operations = new OperationsServices(jdbc, notifications, billing);
        inventory = new InventoryServices(jdbc, notifications, operations);
        parts = new PartsServices(jdbc, notifications);
        for (int id = 1; id <= 4; id++) {
            jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(?,?,?,?,?,'unused',0,0)",
                    id, "shopuser" + id, "shop" + id + "@example.com", "Shop", Integer.toString(id));
        }
        jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(1,3),(2,2),(3,1),(4,1)");
        jdbc.update("INSERT INTO dev_autoserve.parts(id,category_id,code,name,sku) VALUES(1,1,'FILTER','Oil filter','SKU-1')");
        jdbc.update("INSERT INTO dev_autoserve.part_inventory(part_id,stock_quantity,reorder_level,is_active) VALUES(1,10,2,1)");
        jdbc.update("INSERT INTO dev_autoserve.part_prices(part_id,unit_price,effective_from,is_active) VALUES(1,12.50,CURRENT_TIMESTAMP,1)");
    }

    @Test
    void archiveRestorePreservesStockAndPriceHistory() {
        parts.deletePart(1L);
        parts.restore(1L);
        assertEquals(10, jdbc.queryForObject("SELECT stock_quantity FROM dev_autoserve.part_inventory WHERE part_id=1", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.part_prices WHERE part_id=1", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT is_active FROM dev_autoserve.parts WHERE id=1", Integer.class));
    }

    @Test
    void concurrentIssueIsExactlyOnce() throws Exception {
        jdbc.update("INSERT INTO dev_autoserve.vehicles(id,customer_id,year,make,model,vin,license_plate,color,mileage) VALUES(1,3,2020,'Toyota','Camry','VIN-1','TAG1','Blue','10000')");
        jdbc.update("INSERT INTO dev_autoserve.service_requests(id,customer_id,vehicle_id,description,status_id) VALUES(1,3,1,'Brakes',1)");
        jdbc.update("INSERT INTO dev_autoserve.work_orders(id,service_request_id,technician_id,status_id) VALUES(1,1,2,17)");
        jdbc.update("INSERT INTO dev_autoserve.as_workflow(request_id,stage) VALUES(1,'Diagnosis')");
        tx.execute(status -> inventory.create(technician, new InventoryServices.Request(1L, 1L, 2, "Needed for diagnosis")));
        long requestId = jdbc.queryForObject("SELECT id FROM dev_autoserve.part_requests WHERE work_order_id=1", Long.class);
        var start = new CountDownLatch(1);
        var successes = new AtomicInteger();
        var failures = new AtomicInteger();
        var executor = Executors.newFixedThreadPool(2);
        try {
            var issue = (Runnable) () -> {
                try {
                    start.await();
                    tx.execute(status -> inventory.resolve(admin, requestId, "Issued"));
                    successes.incrementAndGet();
                } catch (Exception expected) {
                    failures.incrementAndGet();
                }
            };
            var first = executor.submit(issue);
            var second = executor.submit(issue);
            start.countDown();
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }
        assertEquals(1, successes.get());
        assertEquals(1, failures.get());
        assertEquals(8, jdbc.queryForObject("SELECT stock_quantity FROM dev_autoserve.part_inventory WHERE part_id=1", Integer.class));
        assertEquals(2, jdbc.queryForObject("SELECT SUM(quantity) FROM dev_autoserve.part_usages WHERE work_order_id=1 AND part_id=1", Integer.class));
        assertEquals("Issued", jdbc.queryForObject("SELECT status FROM dev_autoserve.part_requests WHERE id=?", String.class, requestId));
    }

    @Test
    void notificationsArePrivateAndReadsPersist() {
        notifications.send(3, "Customer notice", "SERVICE_REQUEST");
        notifications.send(4, "Other customer notice", "SERVICE_REQUEST");
        var own = notifications.list(3, "all", 1, 20);
        assertEquals(1, ((List<?>) own.get("items")).size());
        var other = notifications.list(4, "unread", 1, 20);
        assertEquals(1, ((List<?>) other.get("items")).size());
        assertEquals("Other customer notice", ((Map<?, ?>) ((List<?>) other.get("items")).get(0)).get("message"));
        long noticeId = jdbc.queryForObject("SELECT id FROM dev_autoserve.notifications WHERE user_id=3", Long.class);
        notifications.markRead(3, noticeId);
        assertEquals(0, ((Number) notifications.list(3, "unread", 1, 20).get("total")).intValue());
        assertThrows(ApiFailure.class, () -> notifications.markRead(4, noticeId));
        assertEquals(1, ((Number) notifications.list(4, "unread", 1, 20).get("total")).intValue());
    }
}
