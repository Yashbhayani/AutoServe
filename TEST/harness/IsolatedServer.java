import com.example.DevAutoServ.DevAutoServApplication;
import com.example.DevAutoServ.Services.PasswordServices;
import org.springframework.boot.SpringApplication;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import java.nio.file.*;
import java.util.*;

/** External test launcher: never reads production configuration or production records. */
public class IsolatedServer {
 private static final java.util.concurrent.atomic.AtomicInteger ROLE_FAILURES = new java.util.concurrent.atomic.AtomicInteger();
 /** Fault injection exists only in the external isolated test launcher. */
 public static class RejectRegistrationRole implements org.h2.api.Trigger {
  @Override public void fire(java.sql.Connection connection,Object[] oldRow,Object[] newRow) throws java.sql.SQLException {
   try(var statement=connection.prepareStatement("SELECT email FROM dev_autoserve.users WHERE id=?")) {
    statement.setObject(1,newRow[1]);
    try(var result=statement.executeQuery()) {
     if(result.next() && "rollback@test.invalid".equals(result.getString(1))) {
      ROLE_FAILURES.incrementAndGet();
      throw new java.sql.SQLException("Injected test-only role-insert failure", "45000");
     }
    }
   }
  }
 }
 public static void main(String[] args) throws Exception {
  String url="jdbc:h2:mem:checklist;MODE=MySQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=YEAR;DB_CLOSE_DELAY=-1";
  var ds=new DriverManagerDataSource(url,"sa","");
  new ResourceDatabasePopulator(new ClassPathResource("operations-schema.sql"),new ClassPathResource("operations-lookups.sql"),new ClassPathResource("schema.sql")).execute(ds);
  var jdbc=new JdbcTemplate(ds);var passwords=new PasswordServices();
  for(int id=1;id<=4;id++) {
   String role=id==1?"admin":id==2?"technician":id==3?"customer":"stranger";
   jdbc.update("INSERT INTO dev_autoserve.users(id,username,email,first_name,last_name,password_hash,is_email_verified,is_phone_verified) VALUES(?,?,?,?,?,?,0,0)",id,role,role+"@test.invalid",role,"Test",passwords.EncryptPassword("TestOnly-Password42!"));
  }
  jdbc.update("INSERT INTO dev_autoserve.user_roles(user_id,role_id) VALUES(1,3),(2,2),(3,1),(4,1)");
  jdbc.execute("CREATE TRIGGER dev_autoserve.registration_role_failure BEFORE INSERT ON dev_autoserve.user_roles FOR EACH ROW CALL 'IsolatedServer$RejectRegistrationRole'");
  var app=SpringApplication.run(DevAutoServApplication.class,
   "--server.address=127.0.0.1","--server.port="+args[0],"--spring.datasource.url="+url,
   "--spring.datasource.hikari.schema=dev_autoserve","--spring.datasource.driver-class-name=org.h2.Driver","--spring.datasource.username=sa","--spring.datasource.password=",
   "--spring.config.import=optional:file:/tmp/autoserve-checklist-no-config.properties",
   "--spring.sql.init.mode=never","--spring.jpa.hibernate.ddl-auto=none","--spring.flyway.enabled=false",
   "--jwt.secret=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUY=","--secretKey=fictional-test-key",
   "--jwt.access-expiration=900000","--jwt.refresh-expiration=604800000","--ALLOW_EMAIL_ONLY_RESET=true",
   "--debug=false","--logging.level.root=WARN","--spring.main.banner-mode=off","--spring.devtools.restart.enabled=false");
  System.out.println("ISOLATED_SERVER_READY");System.out.flush();
  try(var input=new Scanner(System.in)) {
   while(input.hasNextLine()) {
    String line=input.nextLine();
    if(line.equals("seed-part")) {
     try {
      var model=new com.example.DevAutoServ.Model.PartModel();
      model.setCategoryId(1L);model.setCode("DIAGNOSTIC-PART");model.setName("H2 diagnostic");model.setSku("DIAGNOSTIC-SKU");model.setUnitPrice(new java.math.BigDecimal("1.00"));model.setStockQuantity(1);model.setReorderLevel(0);
      new org.springframework.transaction.support.TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(ds)).execute(status -> new com.example.DevAutoServ.Services.PartsServices(jdbc,new com.example.DevAutoServ.Services.NotificationServices(jdbc)).createPart(model));
     } catch(Exception error) {
      Files.writeString(Path.of(args[1]).getParent().resolve("provider-compatibility.json"),new tools.jackson.databind.ObjectMapper().writeValueAsString(Map.of("provider","H2 test database", "version",jdbc.queryForObject("SELECT H2VERSION()",String.class),"operation","PartsServices.createPart", "error",error.toString(),"scope","This is test-provider evidence; production MySQL behavior was not tested.")));
     }

     jdbc.update("INSERT INTO dev_autoserve.parts(id,category_id,code,name,sku) VALUES(100,1,'ACCEPTANCE_FILTER','Acceptance Oil Filter','ACCEPTANCE-1')");
     jdbc.update("INSERT INTO dev_autoserve.part_inventory(part_id,stock_quantity,reorder_level,is_active) VALUES(100,10,2,1)");
     jdbc.update("INSERT INTO dev_autoserve.part_prices(part_id,unit_price,effective_from,is_active) VALUES(100,12.50,CURRENT_TIMESTAMP,1)");
     System.out.println("PART_FIXTURE_READY");System.out.flush();
    } else if(line.equals("dump")) {
     Map<String,Object> snapshot=new LinkedHashMap<>();
     for(String table:List.of("vehicles","service_requests","work_orders","appointments","part_inventory","part_usages","as_part_quotes","invoices","as_invoice_details","as_invoice_lines","payments","as_workflow","as_events")) {
      var rows=jdbc.queryForList("SELECT * FROM dev_autoserve."+table);
      for(var row:rows) for(var entry:row.entrySet()) {Object v=entry.getValue();if(v!=null&&!(v instanceof String)&&!(v instanceof Number)&&!(v instanceof Boolean))entry.setValue(v.toString());}
      snapshot.put(table,rows);
     }
     snapshot.put("registrationRollback",Map.of("injectedRoleFailures",ROLE_FAILURES.get(),"remainingAccounts",jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users WHERE email='rollback@test.invalid'",Long.class),"remainingRoles",jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.user_roles ur JOIN dev_autoserve.users u ON u.id=ur.user_id WHERE u.email='rollback@test.invalid'",Long.class)));
     Files.writeString(Path.of(args[1]),new tools.jackson.databind.ObjectMapper().writeValueAsString(snapshot));
     System.out.println("DATABASE_EVIDENCE_SAVED");System.out.flush();
    } else if(line.equals("db-down")) {
     app.getBean(com.zaxxer.hikari.HikariDataSource.class).close();
     System.out.println("TEST_DATABASE_CONNECTIONS_DISABLED");System.out.flush();
    } else if(line.equals("stop")) break;
   }
  } finally {app.close();}
 }
}
