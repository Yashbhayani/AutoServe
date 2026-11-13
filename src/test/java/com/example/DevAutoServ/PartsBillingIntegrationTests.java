package com.example.DevAutoServ;

import com.example.DevAutoServ.Services.*;
import com.example.DevAutoServ.Services.ApiAccessServices.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class PartsBillingIntegrationTests {
    JdbcTemplate jdbc;
    OperationsServices operations;
    PartsBillingServices billing;
    TransactionTemplate tx;
    final Actor admin=new Actor(1,Set.of("ADMIN")),tech=new Actor(2,Set.of("TECHNICIAN")),customer=new Actor(3,Set.of("CUSTOMER")),stranger=new Actor(4,Set.of("CUSTOMER")),otherTech=new Actor(5,Set.of("TECHNICIAN"));
    @BeforeEach void setup() {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1","sa","");
        new ResourceDatabasePopulator(new ClassPathResource("operations-schema.sql"),new ClassPathResource("operations-lookups.sql"),new ClassPathResource("schema.sql")).execute(ds);
        jdbc=new JdbcTemplate(ds);tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
        billing=new PartsBillingServices(jdbc);operations=new OperationsServices(jdbc,new NotificationServices(jdbc),billing);
        for(int id=1;id<=5;id++) jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(?,?,?,?,?,'unused',0,0)",id,"user"+id,"u"+id+"@example.com","User",""+id);
        jdbc.update("INSERT INTO dev_autoserve.vehicles(id,customer_id,year,make,model,vin,license_plate,color,mileage) VALUES(1,3,2020,'Toyota','Camry','VIN-1','TAG1','Blue','10000')");
        jdbc.update("INSERT INTO dev_autoserve.service_requests(id,customer_id,vehicle_id,description,status_id) VALUES(1,3,1,'Brakes',1)");
        jdbc.update("INSERT INTO dev_autoserve.work_orders(id,service_request_id,technician_id,status_id) VALUES(1,1,2,17)");
        jdbc.update("INSERT INTO dev_autoserve.as_workflow(request_id,stage) VALUES(1,'Diagnosis')");
        jdbc.update("INSERT INTO dev_autoserve.parts(id,category_id,code,name,sku) VALUES(1,1,'FILTER','Oil filter','SKU-1'),(2,1,'PAD','Brake pad','SKU-2')");
        jdbc.update("INSERT INTO dev_autoserve.part_inventory(part_id,stock_quantity,is_active) VALUES(1,10,1),(2,3,1)");
        jdbc.update("INSERT INTO dev_autoserve.part_prices(part_id,unit_price,effective_from,is_active) VALUES(1,12.50,CURRENT_TIMESTAMP,1),(2,30.25,CURRENT_TIMESTAMP,1)");
    }
    Map<String,Object> act(Actor actor,String action,Map<String,Object> body) {
        var b=new HashMap<>(body);b.put("requestId",1);OperationsServices.validate(action,b);
        return tx.execute(status->operations.execute(actor,action,b));
    }
    void part(Actor actor,int id,int qty,int revision) { act(actor,"parts.set",Map.of("partId",id,"quantity",qty,"revision",revision)); }
    void submit(int revision) {act(tech,"diagnosis.submit",Map.of("diagnosis","Replace filter and inspect brakes","revision",revision));}
    void approve(int revision) {act(customer,"approve",Map.of("revision",revision));}
    int stock(int id) {return jdbc.queryForObject("SELECT stock_quantity FROM dev_autoserve.part_inventory WHERE part_id=?",Integer.class,id);}
    BigDecimal decimal(String sql) {return jdbc.queryForObject(sql,BigDecimal.class);}
    @Test void quantitiesDeductAndUnusedPartsReturnWithoutDoubleDeduction() {
        part(tech,1,2,0);assertEquals(8,stock(1));
        part(admin,1,4,1);assertEquals(6,stock(1));
        part(tech,1,1,2);assertEquals(9,stock(1));
        part(tech,1,0,3);assertEquals(10,stock(1));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.part_usages",Integer.class));
    }
    @Test void insufficientStockAndStaleUpdatesRollBackEveryWrite() {
        part(tech,1,2,0);
        assertThrows(ApiFailure.class,()->part(tech,2,4,1));
        assertEquals(3,stock(2));assertEquals(8,stock(1));
        assertEquals(1,jdbc.queryForObject("SELECT revision FROM dev_autoserve.as_order_billing",Integer.class));
        assertThrows(ApiFailure.class,()->part(admin,1,3,0));assertEquals(8,stock(1));
        assertThrows(ApiFailure.class,()->act(tech,"parts.set",Map.of("partId",1,"quantity",1.5,"revision",1)));
    }
    @Test void onlyAdminOrAssignedTechnicianMaySelectPartsDuringDiagnosis() {
        assertThrows(ApiFailure.class,()->part(customer,1,1,0));
        assertThrows(ApiFailure.class,()->part(otherTech,1,1,0));
        assertThrows(ApiFailure.class,()->part(stranger,1,1,0));
        part(admin,1,1,0);submit(1);
        assertThrows(ApiFailure.class,()->part(tech,1,2,2));
        approve(2);assertThrows(ApiFailure.class,()->part(admin,1,0,2));
        assertEquals(9,stock(1));
    }
    @Test void approvalAndInvoiceUseFrozenPricesPlusAdminLabor() {
        part(tech,1,2,0);part(tech,2,1,1);submit(2);
        assertThrows(ApiFailure.class,()->approve(2));approve(3);
        jdbc.update("UPDATE dev_autoserve.part_prices SET unit_price=999 WHERE part_id=1");
        act(tech,"complete",Map.of());
        assertThrows(ApiFailure.class,()->act(tech,"invoice.issue",Map.of("labor",75)));
        act(admin,"invoice.issue",Map.of("labor","75.00","laborDescription","Repair labor","amount","1.00"));
        assertEquals(new BigDecimal("130.25"),decimal("SELECT amount FROM dev_autoserve.invoices"));
        assertEquals(new BigDecimal("55.25"),decimal("SELECT parts_total FROM dev_autoserve.as_invoice_details"));
        assertEquals(new BigDecimal("12.50"),decimal("SELECT unit_price FROM dev_autoserve.as_invoice_lines WHERE part_id=1"));
        assertEquals(8,stock(1));assertThrows(ApiFailure.class,()->act(admin,"invoice.issue",Map.of("labor",75)));
    }
    @Test void revisionsRequireFreshApprovalAndCannotBypassRepairGate() {
        part(tech,1,2,0);submit(1);
        act(customer,"revise",Map.of());
        part(tech,1,1,2);submit(3);
        assertThrows(ApiFailure.class,()->approve(2));
        assertThrows(ApiFailure.class,()->act(tech,"complete",Map.of()));
        approve(4);act(tech,"complete",Map.of());
        assertThrows(ApiFailure.class,()->act(admin,"invoice.issue",Map.of("labor","1.001")));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.invoices",Integer.class));
        act(admin,"invoice.issue",Map.of("labor",0));assertEquals(new BigDecimal("12.50"),decimal("SELECT amount FROM dev_autoserve.invoices"));
    }
    @Test void legacyUsagesArePricedWithoutRemovingStockAgain() {
        jdbc.update("INSERT INTO dev_autoserve.part_usages(work_order_id,part_id,quantity) VALUES(1,1,2)");
        jdbc.update("UPDATE dev_autoserve.part_inventory SET stock_quantity=8 WHERE part_id=1");
        submit(0);assertEquals(8,stock(1));approve(1);act(tech,"complete",Map.of());
        act(admin,"invoice.issue",Map.of("labor",5));assertEquals(new BigDecimal("30.00"),decimal("SELECT amount FROM dev_autoserve.invoices"));
    }
    @Test void snapshotScopesPartsAndInvoiceBreakdownToAuthorizedAccount() {
        part(tech,1,2,0);submit(1);approve(2);act(tech,"complete",Map.of());act(admin,"invoice.issue",Map.of("labor",5));
        var own=operations.snapshot(customer);var foreign=operations.snapshot(stranger);var technician=operations.snapshot(tech);
        assertEquals(1,((List<?>)own.get("invoiceLines")).size());assertEquals(1,((List<?>)own.get("invoiceDetails")).size());
        assertTrue(((List<?>)foreign.get("workOrderParts")).isEmpty());assertTrue(((List<?>)foreign.get("invoiceDetails")).isEmpty());assertTrue(((List<?>)technician.get("invoiceDetails")).isEmpty());
    }
    @Test void newLabourOnlyInvoiceStillRequiresApprovalAndPositiveTotal() {
        submit(0);approve(1);act(tech,"complete",Map.of());
        assertThrows(ApiFailure.class,()->act(admin,"invoice.issue",Map.of("labor",0)));
        act(admin,"invoice.issue",Map.of("labor",50));assertEquals(new BigDecimal("50.00"),decimal("SELECT amount FROM dev_autoserve.invoices"));
    }
    @Test void inventoryIssuingUsesTheSameFrozenQuoteAndCannotIssueAfterSubmission() {
        var inventory=new InventoryServices(jdbc,new NotificationServices(jdbc),operations);
        jdbc.update("INSERT INTO dev_autoserve.part_requests(id,work_order_id,technician_id,part_id,quantity) VALUES(1,1,2,1,2),(2,1,2,2,1)");
        tx.execute(status->inventory.resolve(admin,1,"Issued"));
        assertEquals(8,stock(1));assertEquals(new BigDecimal("25.00"),billing.partsTotal(1));
        assertThrows(ApiFailure.class,()->tx.execute(status->inventory.resolve(admin,1,"Issued")));
        submit(1);
        assertThrows(ApiFailure.class,()->tx.execute(status->inventory.resolve(admin,2,"Issued")));
        assertEquals(3,stock(2));assertEquals("Pending",jdbc.queryForObject("SELECT status FROM dev_autoserve.part_requests WHERE id=2",String.class));
    }
    @Test void externallyChangedUsagesCannotBeSilentlyAddedToAnApprovedInvoice() {
        part(tech,1,1,0);submit(1);approve(2);act(tech,"complete",Map.of());
        jdbc.update("INSERT INTO dev_autoserve.part_usages(work_order_id,part_id,quantity) VALUES(1,2,1)");
        assertThrows(ApiFailure.class,()->act(admin,"invoice.issue",Map.of("labor",10)));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.invoices",Integer.class));
    }
    @Test void concurrentAssignmentsCannotConsumeMoreStockThanAvailable() throws Exception {
        // A single revision can only be applied once, even when two tabs submit together.
        var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
        var start=new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.concurrent.Callable<Boolean> change=()->{start.await();try {part(tech,1,6,0);return true;}catch(ApiFailure e){return false;}};
            var a=executor.submit(change);var b=executor.submit(change);start.countDown();
            int successes=(a.get(10,java.util.concurrent.TimeUnit.SECONDS)?1:0)+(b.get(10,java.util.concurrent.TimeUnit.SECONDS)?1:0);
            assertEquals(1,successes);assertEquals(4,stock(1));
        } finally {executor.shutdownNow();}
    }

}
