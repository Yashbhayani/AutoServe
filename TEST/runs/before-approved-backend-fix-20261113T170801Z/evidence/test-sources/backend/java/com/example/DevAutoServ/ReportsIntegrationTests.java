package com.example.DevAutoServ;

import com.example.DevAutoServ.Services.InsightsServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReportsIntegrationTests {
    private JdbcTemplate jdbc;
    private InsightsServices insights;

    @BeforeEach void setup() {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1","sa","");
        new ResourceDatabasePopulator(new ClassPathResource("operations-schema.sql"),new ClassPathResource("operations-lookups.sql"),new ClassPathResource("schema.sql")).execute(ds);
        jdbc=new JdbcTemplate(ds);insights=new InsightsServices(jdbc);
        for(int id=1;id<=3;id++)jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(?,?,?,?,?,'unused',0,0)",id,"reportuser"+id,"report"+id+"@example.com","Report","User"+id);
        jdbc.update("INSERT INTO dev_autoserve.vehicles(id,customer_id,year,make,model,vin,license_plate,color,mileage) VALUES(1,3,2020,'Toyota','Camry','REPORT-VIN','RPT-1','Blue','10000')");
    }

    @Test void reportsUsePaymentDatesAndNeverMultiplyRevenueByServices() {
        jdbc.update("INSERT INTO dev_autoserve.service_requests(id,customer_id,vehicle_id,description,status_id) VALUES(1,3,1,'Two services',1)");
        jdbc.update("INSERT INTO dev_autoserve.service_request_services(service_request_id,service_type_id,is_active) VALUES(1,1,1),(1,2,1)");
        int completed=jdbc.queryForObject("SELECT id FROM dev_autoserve.statuses WHERE table_code='WORK_ORDER' AND code='COMPLETED'",Integer.class);
        int issued=jdbc.queryForObject("SELECT id FROM dev_autoserve.statuses WHERE table_code='INVOICE' AND code='ISSUED'",Integer.class);
        int success=jdbc.queryForObject("SELECT id FROM dev_autoserve.statuses WHERE table_code='PAYMENT' AND code='SUCCESS'",Integer.class);
        jdbc.update("INSERT INTO dev_autoserve.work_orders(id,service_request_id,technician_id,status_id,completed_at) VALUES(1,1,2,?,CURRENT_TIMESTAMP)",completed);
        jdbc.update("INSERT INTO dev_autoserve.invoices(id,work_order_id,amount,status_id) VALUES(1,1,25,?)",issued);
        jdbc.update("INSERT INTO dev_autoserve.payments(invoice_id,amount,method,status_id,paid_at) VALUES(1,25,'OTHER',?,CURRENT_TIMESTAMP)",success);
        String today=LocalDate.now().toString();
        Map<String,Object> report=insights.report(today,today);
        assertEquals(new BigDecimal("25.00"),report.get("summary") instanceof Map<?,?> summary ? summary.get("Collected payments") : null);
        List<Map<String,Object>> revenue=(List<Map<String,Object>>)report.get("revenue");
        assertEquals(1,revenue.size());assertEquals(new BigDecimal("25.00"),revenue.get(0).get("value"));
        List<Map<String,Object>> services=(List<Map<String,Object>>)report.get("services");
        assertEquals(2,services.size());assertTrue(services.stream().allMatch(row->((Number)row.get("value")).intValue()==1));
        List<Map<String,Object>> invoices=(List<Map<String,Object>>)report.get("invoices");
        assertEquals(1,invoices.size());assertEquals(new BigDecimal("25.00"),invoices.get(0).get("collected"));
    }
}
