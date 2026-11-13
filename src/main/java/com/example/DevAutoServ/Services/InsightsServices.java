package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class InsightsServices {
    private final JdbcTemplate jdbc;

    public InsightsServices(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String,Object> report(String fromValue,String toValue) {
        LocalDate to = parse(toValue,LocalDate.now());
        LocalDate from = parse(fromValue,to.minusDays(29));
        if (from.isAfter(to) || from.plusDays(366).isBefore(to)) {
            throw new ApiFailure(400,"Choose a valid date range of at most 367 days.");
        }
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        BigDecimal collected = jdbc.queryForObject("""
            SELECT COALESCE(SUM(p.amount),0)
            FROM dev_autoserve.payments p
            JOIN dev_autoserve.statuses s ON s.id=p.status_id
            WHERE s.table_code='PAYMENT' AND s.code='SUCCESS'
              AND COALESCE(p.paid_at,p.created_at)>=? AND COALESCE(p.paid_at,p.created_at)<?
            """,BigDecimal.class,start,end);
        Long invoiceCount = jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.invoices WHERE created_at>=? AND created_at<?",Long.class,start,end);
        Long requestCount = jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_requests WHERE is_active=1 AND created_at>=? AND created_at<?",Long.class,start,end);
        Long completedCount = jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.work_orders WHERE completed_at>=? AND completed_at<?",Long.class,start,end);

        List<Map<String,Object>> revenueRows = jdbc.queryForList("""
            SELECT DATE(COALESCE(p.paid_at,p.created_at)) AS collection_day,SUM(p.amount) AS collected_amount
            FROM dev_autoserve.payments p JOIN dev_autoserve.statuses s ON s.id=p.status_id
            WHERE s.table_code='PAYMENT' AND s.code='SUCCESS'
              AND COALESCE(p.paid_at,p.created_at)>=? AND COALESCE(p.paid_at,p.created_at)<?
            GROUP BY DATE(COALESCE(p.paid_at,p.created_at)) ORDER BY collection_day
            """,start,end);
        List<Map<String,Object>> services = jdbc.queryForList("""
            SELECT st.name AS label,COUNT(DISTINCT sr.id) AS request_count
            FROM dev_autoserve.service_requests sr
            JOIN dev_autoserve.service_request_services srs ON srs.service_request_id=sr.id AND srs.is_active=1
            JOIN dev_autoserve.service_types st ON st.id=srs.service_type_id
            WHERE sr.is_active=1 AND sr.created_at>=? AND sr.created_at<?
            GROUP BY st.id,st.name ORDER BY st.name
            """,start,end).stream().map(row -> {
                Map<String,Object> converted=new LinkedHashMap<>(row);
                converted.put("value",row.get("request_count"));
                return converted;
            }).toList();
        List<Map<String,Object>> technicians = jdbc.queryForList("""
            SELECT u.id,CONCAT(u.first_name,' ',u.last_name) AS name,COUNT(w.id) AS completed,0 AS hours
            FROM dev_autoserve.work_orders w
            JOIN dev_autoserve.users u ON u.id=w.technician_id
            WHERE w.completed_at>=? AND w.completed_at<?
            GROUP BY u.id,u.first_name,u.last_name ORDER BY name
            """,start,end);
        List<Map<String,Object>> invoices = jdbc.queryForList("""
            SELECT i.id,i.work_order_id,i.amount,s.name AS status,i.created_at,
                   COALESCE((SELECT SUM(p.amount) FROM dev_autoserve.payments p
                     JOIN dev_autoserve.statuses ps ON ps.id=p.status_id
                     WHERE p.invoice_id=i.id AND ps.table_code='PAYMENT' AND ps.code='SUCCESS'),0) AS collected
            FROM dev_autoserve.invoices i
            JOIN dev_autoserve.statuses s ON s.id=i.status_id
            WHERE i.created_at>=? AND i.created_at<? ORDER BY i.created_at DESC,i.id DESC
            """,start,end);

        Map<String,Object> summary = new LinkedHashMap<>();
        summary.put("Collected payments",collected);
        summary.put("Invoices issued",invoiceCount);
        summary.put("Requests created",requestCount);
        summary.put("Jobs completed",completedCount);
        List<Map<String,Object>> revenue = new ArrayList<>();
        for (Map<String,Object> row : revenueRows) {
            Map<String,Object> converted=new LinkedHashMap<>(row);
            converted.put("day",row.get("collection_day").toString());
            converted.put("value",row.get("collected_amount"));
            revenue.add(converted);
        }
        return Map.of("success",true,"summary",summary,"from",from.toString(),"to",to.toString(),
                "revenue",revenue,"services",services,"technicians",technicians,"invoices",invoices);
    }

    private static LocalDate parse(String value,LocalDate fallback) {
        if(value==null||value.isBlank()) return fallback;
        try { return LocalDate.parse(value); }
        catch (RuntimeException error) { throw new ApiFailure(400,"Choose valid report dates."); }
    }
}
