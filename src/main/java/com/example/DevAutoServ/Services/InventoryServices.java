package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Services.ApiAccessServices.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class InventoryServices {
    private final JdbcTemplate jdbc;
    private final NotificationServices notifications;
    private final OperationsServices operations;
    public InventoryServices(JdbcTemplate jdbc, NotificationServices notifications, OperationsServices operations) { this.jdbc=jdbc; this.notifications=notifications;this.operations=operations; }
    public record Request(Long workOrderId, Long partId, Integer quantity, String note) {}
    public Map<String,Object> jobs(Actor actor) {
        return Map.of("success",true,"data",jdbc.queryForList("""
            SELECT w.id, w.service_request_id, s.name AS status, sr.description
            FROM dev_autoserve.work_orders w JOIN dev_autoserve.statuses s ON s.id=w.status_id
            JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id
            JOIN dev_autoserve.as_workflow f ON f.request_id=sr.id
            WHERE w.technician_id=? AND s.is_terminal=0 AND sr.is_active=1 AND f.held=0 AND f.stage IN ('Vehicle Checked In','Diagnosis') ORDER BY w.id DESC
            """,actor.id()));
    }
    public Map<String,Object> list(Actor actor) {
        String scope = actor.has("ADMIN") ? "" : " WHERE r.technician_id="+actor.id();
        return Map.of("success",true,"data",jdbc.queryForList("""
            SELECT r.id,r.work_order_id,r.part_id,r.technician_id,r.quantity,r.status,r.note,r.created_at,r.resolved_at,
                   p.name AS part_name,p.sku,CONCAT(u.first_name,' ',u.last_name) AS technician_name
            FROM dev_autoserve.part_requests r JOIN dev_autoserve.parts p ON p.id=r.part_id
            JOIN dev_autoserve.users u ON u.id=r.technician_id
            """+scope+" ORDER BY r.created_at DESC,r.id DESC"));
    }
    @Transactional
    public Map<String,Object> create(Actor actor, Request request) {
        if(request==null || request.workOrderId()==null || request.partId()==null || request.quantity()==null || request.quantity()<=0 || (request.note()!=null && request.note().length()>500)) throw new ApiFailure(400,"Select a work order and part, and enter a positive whole quantity. Notes must be at most 500 characters.");
        var jobs=jdbc.queryForList("""
            SELECT w.id FROM dev_autoserve.work_orders w JOIN dev_autoserve.statuses s ON s.id=w.status_id
            JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id
            JOIN dev_autoserve.as_workflow f ON f.request_id=sr.id
            WHERE w.id=? AND w.technician_id=? AND s.is_terminal=0 AND sr.is_active=1 AND f.held=0 AND f.stage IN ('Vehicle Checked In','Diagnosis') FOR UPDATE
            """,request.workOrderId(),actor.id());
        if(jobs.isEmpty()) throw new ApiFailure(409,"Select an open work order assigned to you.");
        if(jdbc.queryForList("SELECT id FROM dev_autoserve.parts WHERE id=? AND is_active=1 FOR UPDATE",request.partId()).isEmpty()) throw new ApiFailure(404,"Part not found.");
        jdbc.update("INSERT INTO dev_autoserve.part_requests (work_order_id,technician_id,part_id,quantity,note) VALUES (?,?,?,?,?)",request.workOrderId(),actor.id(),request.partId(),request.quantity(),request.note()==null?"":request.note().trim());
        notifications.admins("Part request for work order #"+request.workOrderId()+": "+request.quantity()+" units awaiting review.");
        return Map.of("success",true);
    }
    @Transactional
    public Map<String,Object> resolve(Actor actor,long id,String action) {
        if(action==null || !Set.of("Issued","Rejected").contains(action)) throw new ApiFailure(400,"Choose Issued or Rejected.");
        var parents=jdbc.queryForList("SELECT sr.id FROM dev_autoserve.part_requests pr JOIN dev_autoserve.work_orders w ON w.id=pr.work_order_id JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id WHERE pr.id=?",id);
        if(parents.isEmpty()) throw new ApiFailure(404,"Request not found.");
        jdbc.queryForList("SELECT id FROM dev_autoserve.service_requests WHERE id=? FOR UPDATE",parents.get(0).get("id"));
        var rows=jdbc.queryForList("SELECT * FROM dev_autoserve.part_requests WHERE id=? FOR UPDATE",id);
        if(rows.isEmpty()) throw new ApiFailure(404,"Request not found.");
        var r=rows.get(0);
        if(!"Pending".equals(r.get("status"))) throw new ApiFailure(409,"This request has already been resolved.");
        if(action.equals("Issued")) {
            long order=((Number)r.get("work_order_id")).longValue();
            long request=jdbc.queryForObject("SELECT service_request_id FROM dev_autoserve.work_orders WHERE id=?",Long.class,order);
            long qty=jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM dev_autoserve.part_usages WHERE work_order_id=? AND part_id=?",Long.class,order,r.get("part_id"));
            var revisions=jdbc.queryForList("SELECT revision FROM dev_autoserve.as_order_billing WHERE work_order_id=?",order);
            long revision=revisions.isEmpty()?0:((Number)revisions.get(0).get("revision")).longValue();
            operations.execute(actor,"parts.set",Map.of("requestId",request,"partId",r.get("part_id"),"quantity",qty+((Number)r.get("quantity")).longValue(),"revision",revision));
        }
        jdbc.update("UPDATE dev_autoserve.part_requests SET status=?,resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE id=?",action,actor.id(),id);
        notifications.send(((Number)r.get("technician_id")).longValue(),"Part request #"+id+" for work order #"+r.get("work_order_id")+" was "+action.toLowerCase()+".","SYSTEM");
        return Map.of("success",true);
    }
}
