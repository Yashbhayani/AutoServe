package com.example.DevAutoServ.Services;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.*;
import static com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;

/** Called inside the work-order transaction, after its parent and workflow rows are locked. */
@Service
public class PartsBillingServices {
    private final JdbcTemplate jdbc;
    public PartsBillingServices(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    private static void check(boolean value,String message) { if(!value) throw new ApiFailure(409,message); }
    private static long whole(Object value) {
        try { long n=new BigDecimal(String.valueOf(value)).longValueExact(); if(n<0) throw new ArithmeticException(); return n; }
        catch(Exception e) { throw new ApiFailure(400,"Use nonnegative whole numbers for parts and quantities."); }
    }
    public static BigDecimal labor(Object value) {
        try { BigDecimal n=new BigDecimal(String.valueOf(value)).setScale(2,java.math.RoundingMode.UNNECESSARY); if(n.signum()<0||n.compareTo(new BigDecimal("99999999.99"))>0) throw new ArithmeticException(); return n; }
        catch(Exception e) { throw new ApiFailure(400,"Labor must be a nonnegative amount with at most two decimal places."); }
    }
    private Map<String,Object> billing(long order) {
        jdbc.update("INSERT IGNORE INTO dev_autoserve.as_order_billing(work_order_id) VALUES(?)",order);
        return jdbc.queryForMap("SELECT revision,approved_revision FROM dev_autoserve.as_order_billing WHERE work_order_id=? FOR UPDATE",order);
    }
    private void current(Map<String,Object> state,Object expected) {
        check(expected!=null && whole(expected)==((Number)state.get("revision")).longValue(),"Parts changed. Refresh and review the current parts before continuing.");
    }
    /** Adopt already-issued legacy usages without deducting them a second time. */
    private void captureExisting(long order) { captureExisting(order,true); }
    private void captureExisting(long order,boolean adopt) {
        var usages=jdbc.queryForList("SELECT part_id,SUM(quantity) AS quantity FROM dev_autoserve.part_usages WHERE work_order_id=? GROUP BY part_id ORDER BY part_id",order);
        check(jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.as_part_quotes q WHERE q.work_order_id=? AND NOT EXISTS(SELECT 1 FROM dev_autoserve.part_usages u WHERE u.work_order_id=q.work_order_id AND u.part_id=q.part_id)",Long.class,order)==0,"The used parts list changed outside diagnosis. Review it before continuing.");
        for(var usage:usages) {
            long part=((Number)usage.get("part_id")).longValue();
            var quotes=jdbc.queryForList("SELECT quantity FROM dev_autoserve.as_part_quotes WHERE work_order_id=? AND part_id=?",order,part);
            if(quotes.isEmpty()) {
                check(adopt,"Used parts changed after submission. Customer approval must be requested again.");
                var p=catalogue(part);
                check(p.get("unit_price")!=null,"Every used part must have a current price before approval.");
                jdbc.update("INSERT INTO dev_autoserve.as_part_quotes(work_order_id,part_id,name,sku,quantity,unit_price) VALUES(?,?,?,?,?,?)",order,part,p.get("name"),p.get("sku"),usage.get("quantity"),p.get("unit_price"));
            } else check(((Number)quotes.get(0).get("quantity")).longValue()==((Number)usage.get("quantity")).longValue(),"Used parts changed outside diagnosis. Reconcile the parts before approval.");
        }
    }
    private Map<String,Object> catalogue(long part) {
        var rows=jdbc.queryForList("SELECT p.id,p.name,p.sku,p.is_active,(SELECT pp.unit_price FROM dev_autoserve.part_prices pp WHERE pp.part_id=p.id AND pp.is_active=1 AND pp.effective_to IS NULL ORDER BY pp.effective_from DESC,pp.id DESC LIMIT 1) AS unit_price FROM dev_autoserve.parts p WHERE p.id=? FOR UPDATE",part);
        check(rows.size()==1,"Part not found.");return rows.get(0);
    }
    public void setPart(long order,Map<String,Object> body) {
        var state=billing(order); current(state,body.get("revision"));
        captureExisting(order);
        long part=whole(body.get("partId")), quantity=whole(body.get("quantity"));
        check(part>0&&quantity<=1000000,"Select a part and a quantity up to 1,000,000.");
        var existing=jdbc.queryForList("SELECT quantity,unit_price FROM dev_autoserve.as_part_quotes WHERE work_order_id=? AND part_id=?",order,part);
        long old=existing.isEmpty()?0:((Number)existing.get(0).get("quantity")).longValue();
        if(quantity==old) return;
        var p=catalogue(part);
        check(quantity==0||Boolean.TRUE.equals(p.get("is_active"))||p.get("is_active") instanceof Number n&&n.intValue()==1,"Archived parts cannot be added.");
        Object price=existing.isEmpty()?p.get("unit_price"):existing.get(0).get("unit_price");
        check(quantity==0||price!=null,"This part needs a current price.");
        var stock=jdbc.queryForList("SELECT stock_quantity FROM dev_autoserve.part_inventory WHERE part_id=? FOR UPDATE",part);
        check(stock.size()==1,"Inventory record not found.");
        BigDecimal quoted=partsTotal(order).subtract(existing.isEmpty()?BigDecimal.ZERO:new BigDecimal(existing.get(0).get("unit_price").toString()).multiply(BigDecimal.valueOf(old))).add(quantity==0?BigDecimal.ZERO:new BigDecimal(price.toString()).multiply(BigDecimal.valueOf(quantity)));
        check(quoted.compareTo(new BigDecimal("99999999.99"))<=0,"Parts total exceeds the invoice limit.");
        long delta=quantity-old;
        check(((Number)stock.get(0).get("stock_quantity")).longValue()>=delta,"Insufficient stock for this quantity.");
        jdbc.update("UPDATE dev_autoserve.part_inventory SET stock_quantity=stock_quantity-? WHERE part_id=?",delta,part);
        jdbc.update("DELETE FROM dev_autoserve.part_usages WHERE work_order_id=? AND part_id=?",order,part);
        jdbc.update("DELETE FROM dev_autoserve.as_part_quotes WHERE work_order_id=? AND part_id=?",order,part);
        if(quantity>0) {
            jdbc.update("INSERT INTO dev_autoserve.part_usages(work_order_id,part_id,quantity) VALUES(?,?,?)",order,part,quantity);
            jdbc.update("INSERT INTO dev_autoserve.as_part_quotes(work_order_id,part_id,name,sku,quantity,unit_price) VALUES(?,?,?,?,?,?)",order,part,p.get("name"),p.get("sku"),quantity,price);
        }
        jdbc.update("UPDATE dev_autoserve.as_order_billing SET revision=revision+1,approved_revision=NULL WHERE work_order_id=?",order);
    }
    public void submit(long order,Object revision) { current(billing(order),revision);captureExisting(order); jdbc.update("UPDATE dev_autoserve.as_order_billing SET revision=revision+1,approved_revision=NULL WHERE work_order_id=?",order); }
    public void approve(long order,Object revision) {
        var state=billing(order);current(state,revision);captureExisting(order,false);
        jdbc.update("UPDATE dev_autoserve.as_order_billing SET approved_revision=revision WHERE work_order_id=?",order);
    }
    public void revise(long order) { jdbc.update("UPDATE dev_autoserve.as_order_billing SET approved_revision=NULL WHERE work_order_id=?",order); }
    public BigDecimal partsTotal(long order) { return jdbc.queryForObject("SELECT COALESCE(SUM(quantity*unit_price),0) FROM dev_autoserve.as_part_quotes WHERE work_order_id=?",BigDecimal.class,order); }
    public void issue(long order,Map<String,Object> body,long status) {
        var state=billing(order);
        check(state.get("approved_revision")!=null&&state.get("approved_revision").toString().equals(state.get("revision").toString()),"The parts list must be approved by the customer before invoicing.");
        captureExisting(order,false);
        BigDecimal parts=partsTotal(order),labor=labor(body.get("labor")),total=parts.add(labor);
        check(total.signum()>0&&total.compareTo(new BigDecimal("99999999.99"))<=0,"Invoice total must be greater than zero and within the allowed amount.");
        String description=String.valueOf(body.getOrDefault("laborDescription","Labor charges")).trim();
        check(!description.isEmpty()&&description.length()<=500,"Enter a labor description of up to 500 characters.");
        jdbc.update("INSERT INTO dev_autoserve.invoices(work_order_id,amount,status_id) VALUES(?,?,?)",order,total,status);
        long invoice=jdbc.queryForObject("SELECT id FROM dev_autoserve.invoices WHERE work_order_id=?",Long.class,order);
        jdbc.update("""
            INSERT INTO dev_autoserve.as_invoice_details(invoice_id,parts_total,labor_total,labor_description,customer_name,vehicle,center_name,center_address,center_phone,center_email)
            SELECT ?,?,?,?,CONCAT(u.first_name,' ',u.last_name),CONCAT(v.year,' ',v.make,' ',v.model),c.center_name,c.address,c.phone,c.email
            FROM dev_autoserve.work_orders w JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id
            JOIN dev_autoserve.users u ON u.id=sr.customer_id JOIN dev_autoserve.vehicles v ON v.id=sr.vehicle_id
            JOIN dev_autoserve.as_settings c ON c.id=1 WHERE w.id=?
            """,invoice,parts,labor,description,order);
        jdbc.update("INSERT INTO dev_autoserve.as_invoice_lines(invoice_id,part_id,name,sku,quantity,unit_price) SELECT ?,part_id,name,sku,quantity,unit_price FROM dev_autoserve.as_part_quotes WHERE work_order_id=?",invoice,order);
    }
    public void addSnapshot(Map<String,Object> result,ApiAccessServices.Actor actor) {
        String scope=actor.has("ADMIN")?"1=1":"(sr.customer_id=? OR w.technician_id=?)";
        Object[] args=actor.has("ADMIN")?new Object[]{}:new Object[]{actor.id(),actor.id()};
        String joins=" FROM dev_autoserve.work_orders w JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id ";
        result.put("workOrderParts",jdbc.queryForList("SELECT w.id AS work_order_id,u.part_id,COALESCE(q.name,p.name) AS name,COALESCE(q.sku,p.sku) AS sku,u.quantity,COALESCE(q.unit_price,(SELECT pp.unit_price FROM dev_autoserve.part_prices pp WHERE pp.part_id=p.id AND pp.is_active=1 AND pp.effective_to IS NULL ORDER BY pp.effective_from DESC,pp.id DESC LIMIT 1)) AS unit_price"+joins+" JOIN (SELECT work_order_id,part_id,SUM(quantity) AS quantity FROM dev_autoserve.part_usages GROUP BY work_order_id,part_id) u ON u.work_order_id=w.id JOIN dev_autoserve.parts p ON p.id=u.part_id LEFT JOIN dev_autoserve.as_part_quotes q ON q.work_order_id=w.id AND q.part_id=u.part_id WHERE "+scope,args));
        result.put("billing",jdbc.queryForList("SELECT b.*"+joins+" JOIN dev_autoserve.as_order_billing b ON b.work_order_id=w.id WHERE "+scope,args));
        // Customers see only their invoices; technicians cannot see other customers' billing.
        String invoiceScope=actor.has("ADMIN")?"1=1":"sr.customer_id=?";
        Object[] invoiceArgs=actor.has("ADMIN")?new Object[]{}:new Object[]{actor.id()};
        String invoiceJoins=" FROM dev_autoserve.invoices i JOIN dev_autoserve.work_orders w ON w.id=i.work_order_id JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id ";
        result.put("invoiceDetails",jdbc.queryForList("SELECT d.*"+invoiceJoins+" JOIN dev_autoserve.as_invoice_details d ON d.invoice_id=i.id WHERE "+invoiceScope,invoiceArgs));
        result.put("invoiceLines",jdbc.queryForList("SELECT l.*,l.quantity*l.unit_price AS line_total"+invoiceJoins+" JOIN dev_autoserve.as_invoice_lines l ON l.invoice_id=i.id WHERE "+invoiceScope,invoiceArgs));
        result.put("parts",actor.has("ADMIN")||actor.has("TECHNICIAN")?jdbc.queryForList("SELECT p.id,p.name,p.sku,COALESCE(i.stock_quantity,0) AS stock_quantity,(SELECT pp.unit_price FROM dev_autoserve.part_prices pp WHERE pp.part_id=p.id AND pp.is_active=1 AND pp.effective_to IS NULL ORDER BY pp.effective_from DESC,pp.id DESC LIMIT 1) AS unit_price FROM dev_autoserve.parts p LEFT JOIN dev_autoserve.part_inventory i ON i.part_id=p.id WHERE p.is_active=1 ORDER BY p.name"):List.of());
    }
}
