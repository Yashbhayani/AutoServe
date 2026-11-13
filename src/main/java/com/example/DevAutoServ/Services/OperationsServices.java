package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Services.ApiAccessServices;
import com.example.DevAutoServ.Services.NotificationServices;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Durable service-request workflow, shared by all three frontend roles. */
@Service
public class OperationsServices {
    private final JdbcTemplate jdbc;
    private final NotificationServices notices;
    private final PartsBillingServices billing;
    public static final Set<String> ACTIONS = Set.of("vehicle.save", "vehicle.delete", "request.create", "request.cancel", "appointment.save", "appointment.cancel", "assign", "unassign", "request.update", "checkin", "parts.set", "diagnosis.save", "diagnosis.submit", "approve", "revise", "complete", "hold", "resume", "invoice.issue", "payment.record", "profile.save", "technician.save", "settings.save");
    private static final Map<String, String> QUERIES = Map.ofEntries(Map.entry("vehicles", "SELECT v.id,v.customer_id,v.make,v.model,v.year,v.vin,v.mileage,v.license_plate,v.color\n FROM dev_autoserve.vehicles v WHERE v.is_active=1 AND ({admin}>0 OR v.customer_id={actor} OR EXISTS(SELECT 1 FROM dev_autoserve.service_requests sr JOIN dev_autoserve.work_orders w ON w.service_request_id=sr.id WHERE sr.vehicle_id=v.id AND w.technician_id={actor}))\n"), Map.entry("requests", "SELECT sr.id,sr.customer_id,sr.vehicle_id,sr.description,sr.created_at,sr.preferred_date,sr.preferred_time,\n COALESCE(f.stage,'Service Requested') AS stage,COALESCE(f.held,0) AS held,COALESCE(f.hold_reason,'') AS hold_reason,\n w.id AS work_order_id,w.technician_id,w.diagnosis,CONCAT(u.first_name,' ',u.last_name) AS customer_name,\n CONCAT(v.year,' ',v.make,' ',v.model) AS vehicle,\n COALESCE((SELECT GROUP_CONCAT(x.service_type_id ORDER BY x.service_type_id SEPARATOR ',') FROM dev_autoserve.service_request_services x WHERE x.service_request_id=sr.id AND x.is_active=1),'') AS service_ids,\n COALESCE((SELECT GROUP_CONCAT(st.name ORDER BY st.name SEPARATOR ', ') FROM dev_autoserve.service_request_services x JOIN dev_autoserve.service_types st ON st.id=x.service_type_id WHERE x.service_request_id=sr.id AND x.is_active=1),'') AS services\n FROM dev_autoserve.service_requests sr JOIN dev_autoserve.users u ON u.id=sr.customer_id JOIN dev_autoserve.vehicles v ON v.id=sr.vehicle_id\n LEFT JOIN dev_autoserve.as_workflow f ON f.request_id=sr.id LEFT JOIN dev_autoserve.work_orders w ON w.service_request_id=sr.id\n WHERE sr.is_active=1 AND ({admin}>0 OR sr.customer_id={actor} OR w.technician_id={actor}) ORDER BY sr.created_at DESC,sr.id DESC\n"), Map.entry("appointments", "SELECT a.id,a.service_request_id,a.technician_id,a.scheduled_date,a.scheduled_time,s.name AS status,s.code AS status_code\n FROM dev_autoserve.appointments a JOIN dev_autoserve.service_requests sr ON sr.id=a.service_request_id JOIN dev_autoserve.statuses s ON s.id=a.status_id\n WHERE a.is_active=1 AND sr.is_active=1 AND({admin}>0 OR sr.customer_id={actor} OR a.technician_id={actor}) ORDER BY a.scheduled_date DESC\n"), Map.entry("serviceTypes", "SELECT id,code,name FROM dev_autoserve.service_types WHERE is_active=1 ORDER BY name\n"), Map.entry("technicians", "SELECT u.id,u.first_name,u.last_name,u.email,u.phone,COALESCE(t.specialties,'') AS specialties,\n COALESCE(t.availability,'Available') AS availability,\n (SELECT COUNT(*) FROM dev_autoserve.work_orders w JOIN dev_autoserve.statuses s ON s.id=w.status_id WHERE w.technician_id=u.id AND s.is_terminal=0) AS active_jobs\n FROM dev_autoserve.users u LEFT JOIN dev_autoserve.as_technicians t ON t.user_id=u.id\n WHERE u.is_active=1 AND({admin}>0 OR u.id={actor}) AND EXISTS(SELECT 1 FROM dev_autoserve.user_roles ur JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='TECHNICIAN' AND r.is_active=1)\n"), Map.entry("invoices", "SELECT i.id,i.work_order_id,w.service_request_id,i.amount,s.name AS status,s.code AS status_code,i.created_at,\n COALESCE((SELECT SUM(p.amount) FROM dev_autoserve.payments p JOIN dev_autoserve.statuses ps ON ps.id=p.status_id WHERE p.invoice_id=i.id AND ps.code='SUCCESS' AND ps.table_code='PAYMENT'),0) AS collected\n FROM dev_autoserve.invoices i JOIN dev_autoserve.work_orders w ON w.id=i.work_order_id JOIN dev_autoserve.service_requests sr ON sr.id=w.service_request_id JOIN dev_autoserve.statuses s ON s.id=i.status_id\n WHERE {admin}>0 OR sr.customer_id={actor} ORDER BY i.created_at DESC\n"), Map.entry("events", "SELECT e.id,e.request_id,e.action,e.stage,e.note,e.created_at,CONCAT(u.first_name,' ',u.last_name) AS actor\n FROM dev_autoserve.as_events e JOIN dev_autoserve.users u ON u.id=e.actor_id JOIN dev_autoserve.service_requests sr ON sr.id=e.request_id LEFT JOIN dev_autoserve.work_orders w ON w.service_request_id=sr.id\n WHERE {admin}>0 OR sr.customer_id={actor} OR w.technician_id={actor} ORDER BY e.id DESC\n"), Map.entry("settings", "SELECT center_name,phone,email,address FROM dev_autoserve.as_settings WHERE id=1\n"));

    public OperationsServices(JdbcTemplate jdbc, NotificationServices notices, PartsBillingServices billing) {
        this.jdbc = jdbc;
        this.notices = notices;
        this.billing = billing;
    }

    public Map<String, Object> snapshot(ApiAccessServices.Actor actor) {
        LinkedHashMap<String, Object> result = new LinkedHashMap<String, Object>();
        result.put("success", true);
        for (Map.Entry<String, String> entry : QUERIES.entrySet()) {
            result.put(entry.getKey(), this.jdbc.queryForList(entry.getValue().replace("{admin}", actor.has("ADMIN") ? "1" : "0").replace("{actor}", Long.toString(actor.id()))));
        }
        billing.addSnapshot(result,actor);
        return result;
    }

    public static void validate(String action, Map<String, Object> body) {
        if (!ACTIONS.contains(action)) {
            throw new ApiAccessServices.ApiFailure(400, "Unknown operation.");
        }
        for (String string : List.of("id", "requestId", "vehicleId", "technicianId", "year", "mileage")) {
            if (body.get(string) == null || body.get(string).toString().isBlank()) continue;
            OperationsServices.integer(body, string);
        }
        for (Map.Entry entry : body.entrySet()) {
            String value;
            Object v = entry.getValue();
            if (!(v instanceof String) || (value = (String)v).length() <= (Set.of("description", "diagnosis").contains(entry.getKey()) ? 5000 : 500)) continue;
            throw new ApiAccessServices.ApiFailure(400, "A field is too long.");
        }
        if (body.get("amount") != null) {
            OperationsServices.amount(body);
        }
        if (action.equals("payment.record") && !OperationsServices.str(body, "method").isEmpty() && !Set.of("BANK_TRANSFER", "CARD", "WALLET", "OTHER").contains(OperationsServices.str(body, "method"))) {
            throw new ApiAccessServices.ApiFailure(400, "Select a supported payment method.");
        }
    }

    private static long integer(Map<String, Object> b, String key) {
        try {
            long n = new BigDecimal(String.valueOf(b.getOrDefault(key, 0))).longValueExact();
            if (n < 0L) {
                throw new ArithmeticException();
            }
            return n;
        }
        catch (Exception e) {
            throw new ApiAccessServices.ApiFailure(400, "IDs, year and mileage must be nonnegative whole numbers.");
        }
    }

    private static String str(Map<String, Object> b, String key) {
        return b.get(key) == null ? "" : b.get(key).toString().trim();
    }

    private static BigDecimal amount(Map<String, Object> b) {
        try {
            BigDecimal n = new BigDecimal(OperationsServices.str(b, "amount"));
            if (n.signum() <= 0 || n.stripTrailingZeros().scale() > 2 || n.compareTo(new BigDecimal("99999999.99")) > 0) {
                throw new ArithmeticException();
            }
            return n;
        }
        catch (Exception e) {
            throw new ApiAccessServices.ApiFailure(400, "Enter a positive amount with at most two decimals.");
        }
    }

    private int status(String table, String code) {
        List<Integer> ids = this.jdbc.queryForList("SELECT id FROM dev_autoserve.statuses WHERE table_code=? AND code=? AND is_active=1", Integer.class, table, code);
        if (ids.size() != 1) {
            throw new ApiAccessServices.ApiFailure(503, "Required status configuration is missing.");
        }
        return ids.get(0);
    }

    private static void require(boolean yes, String message) {
        if (!yes) {
            throw new ApiAccessServices.ApiFailure(409, message);
        }
    }

    private long insert(String sql, Object ... args) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        this.jdbc.update(c -> {
            PreparedStatement ps = c.prepareStatement(sql, new String[]{"id"});
            for (int i = 0; i < args.length; ++i) {
                ps.setObject(i + 1, args[i]);
            }
            return ps;
        }, key);
        if (key.getKey() == null) {
            throw new ApiAccessServices.ApiFailure(503, "Could not create the record.");
        }
        return key.getKey().longValue();
    }

    private Map<String, Object> row(String sql, Object ... args) {
        List<Map<String, Object>> rows = this.jdbc.queryForList(sql, args);
        if (rows.isEmpty()) {
            throw new ApiAccessServices.ApiFailure(404, "Record not found or access denied.");
        }
        return rows.get(0);
    }

    private long num(Map<String, Object> r, String key) {
        long l;
        Object object = r.get(key);
        if (object instanceof Number) {
            Number n = (Number)object;
            l = n.longValue();
        } else {
            l = 0L;
        }
        return l;
    }

    private LocalDate date(Map<String, Object> b) {
        try {
            return LocalDate.parse(OperationsServices.str(b, "date"));
        }
        catch (Exception e) {
            throw new ApiAccessServices.ApiFailure(400, "Select a valid date.");
        }
    }

    private LocalTime time(Map<String, Object> b) {
        try {
            return LocalTime.parse(OperationsServices.str(b, "time"));
        }
        catch (Exception e) {
            throw new ApiAccessServices.ApiFailure(400, "Select a valid time.");
        }
    }

    private void appointmentDate(Map<String, Object> b) {
        OperationsServices.require(LocalDateTime.of(this.date(b), this.time(b)).isAfter(LocalDateTime.now()), "Select a future appointment date and time.");
    }

    @Transactional
    public Map<String, Object> execute(ApiAccessServices.Actor actor, String action, Map<String, Object> b) {
        OperationsServices.validate(action, b);
        long id = OperationsServices.integer(b, "id");
        long request = OperationsServices.integer(b, b.containsKey("requestId") ? "requestId" : "id");
        String note = OperationsServices.str(b, "note");
        boolean admin = actor.has("ADMIN");
        OperationsServices.require(note.length() <= 500, "Notes must be at most 500 characters.");
        switch (action) {
            case "vehicle.save": {
                OperationsServices.require(actor.has("CUSTOMER") || admin, "Only customers and admins can manage vehicles.");
                String make = OperationsServices.str(b, "make");
                String model = OperationsServices.str(b, "model");
                String vin = OperationsServices.str(b, "vin");
                String plate = OperationsServices.str(b, "plate");
                String color = OperationsServices.str(b, "color");
                long year = OperationsServices.integer(b, "year");
                OperationsServices.require(!make.isEmpty() && make.length() <= 50 && !model.isEmpty() && model.length() <= 50 && color.length() <= 50, "Enter a valid make, model and color.");
                OperationsServices.require(year >= 1886L && year <= (long)(LocalDate.now().getYear() + 1), "Enter a valid year.");
                OperationsServices.require(vin.isEmpty() || vin.matches("[A-HJ-NPR-Z0-9a-hj-npr-z]{17}"), "VIN must contain 17 valid characters.");
                OperationsServices.require(plate.length() <= 15, "Plate must be at most 15 characters.");
                Object[] values = new Object[]{make, model, year, vin.isEmpty() ? null : vin.toUpperCase(Locale.ROOT), color, Long.toString(OperationsServices.integer(b, "mileage")), plate.isEmpty() ? null : plate};
                if (id > 0L) {
                    Map<String, Object> old = this.row("SELECT customer_id FROM dev_autoserve.vehicles WHERE id=? AND is_active=1 FOR UPDATE", id);
                    OperationsServices.require(admin || this.num(old, "customer_id") == actor.id(), "Vehicle access denied.");
                    ArrayList<Object> args = new ArrayList<Object>(Arrays.asList(values));
                    args.add(id);
                    this.jdbc.update("UPDATE dev_autoserve.vehicles SET make=?,model=?,year=?,vin=?,color=?,mileage=?,license_plate=? WHERE id=?", args.toArray());
                    break;
                }
                id = this.insert("INSERT INTO dev_autoserve.vehicles(make,model,year,vin,color,mileage,license_plate,customer_id) VALUES(?,?,?,?,?,?,?,?)", make, model, year, values[3], color, values[5], values[6], actor.id());
                break;
            }
            case "vehicle.delete": {
                Map<String, Object> old = this.row("SELECT customer_id FROM dev_autoserve.vehicles WHERE id=? AND is_active=1 FOR UPDATE", id);
                OperationsServices.require(admin || this.num(old, "customer_id") == actor.id(), "Vehicle access denied.");
                OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_requests WHERE vehicle_id=?", Long.class, id) == 0L, "Vehicles with service history cannot be removed.");
                this.jdbc.update("UPDATE dev_autoserve.vehicles SET is_active=0 WHERE id=?", id);
                break;
            }
            case "request.create": {
                boolean booked;
                long type;
                List list;
                OperationsServices.require(actor.has("CUSTOMER"), "A customer account is required.");
                long vehicle = OperationsServices.integer(b, "vehicleId");
                OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.vehicles WHERE id=? AND customer_id=? AND is_active=1", Long.class, vehicle, actor.id()) == 1L, "Select your own active vehicle.");
                String description = OperationsServices.str(b, "description");
                OperationsServices.require(!description.isEmpty() && description.length() <= 5000, "Describe the concern in up to 5000 characters.");
                Object color = b.get("serviceIds");
                OperationsServices.require(color instanceof List && !(list = (List)((Object)color)).isEmpty(), "Select at least one service.");
                LinkedHashSet<Long> types = new LinkedHashSet<Long>();
                for (Object item : (List)b.get("serviceIds")) {
                    type = OperationsServices.integer(Collections.singletonMap("type", item), "type");
                    OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_types WHERE id=? AND is_active=1", Long.class, type) == 1L, "Select active service types.");
                    types.add(type);
                }
                boolean bl = booked = !OperationsServices.str(b, "date").isEmpty() || !OperationsServices.str(b, "time").isEmpty();
                if (booked) {
                    this.appointmentDate(b);
                }
                id = request = this.insert("INSERT INTO dev_autoserve.service_requests(customer_id,vehicle_id,description,preferred_date,preferred_time,status_id,is_active) VALUES(?,?,?,?,?,?,1)", actor.id(), vehicle, description, booked ? this.date(b) : null, booked ? this.time(b) : null, this.status("SERVICE_REQUEST", "SUBMITTED"));
                Iterator iterator = types.iterator();
                while (iterator.hasNext()) {
                    type = (Long)iterator.next();
                    this.jdbc.update("INSERT INTO dev_autoserve.service_request_services(service_request_id,service_type_id,is_active) VALUES(?,?,1)", request, type);
                }
                this.jdbc.update("INSERT INTO dev_autoserve.as_workflow(request_id,stage) VALUES(?,'Service Requested')", request);
                if (booked) {
                    this.jdbc.update("INSERT INTO dev_autoserve.appointments(service_request_id,scheduled_date,scheduled_time,status_id,is_active,is_appointed) VALUES(?,?,?,?,1,0)", request, this.date(b), this.time(b), this.status("APPOINTMENT", "SCHEDULED"));
                }
                this.event(request, actor.id(), action, "Service Requested", note);
                this.notices.admins("New service request #" + request + " awaits assignment.");
                break;
            }
            case "settings.save": {
                OperationsServices.require(admin, "Admin access required.");
                OperationsServices.require(!OperationsServices.str(b, "center_name").isEmpty() && OperationsServices.str(b, "center_name").length() <= 100 && OperationsServices.str(b, "phone").length() <= 20 && OperationsServices.str(b, "email").length() <= 120 && OperationsServices.str(b, "address").length() <= 255, "Enter valid service-center contact details.");
                this.jdbc.update("UPDATE dev_autoserve.as_settings SET center_name=?,phone=?,email=?,address=? WHERE id=1", OperationsServices.str(b, "center_name"), OperationsServices.str(b, "phone"), OperationsServices.str(b, "email"), OperationsServices.str(b, "address"));
                break;
            }
            case "technician.save": {
                OperationsServices.require(admin, "Admin access required.");
                OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users u JOIN dev_autoserve.user_roles ur ON ur.user_id=u.id JOIN dev_autoserve.roles r ON r.id=ur.role_id WHERE u.id=? AND u.is_active=1 AND r.code='TECHNICIAN'", Long.class, id) > 0L, "Create an active technician account in Users first.");
                OperationsServices.require(Set.of("Available", "Busy", "Off").contains(OperationsServices.str(b, "availability")), "Invalid availability.");
                this.jdbc.update("INSERT INTO dev_autoserve.as_technicians(user_id,specialties,availability) VALUES(?,?,?) ON DUPLICATE KEY UPDATE specialties=VALUES(specialties),availability=VALUES(availability)", id, OperationsServices.str(b, "specialties"), OperationsServices.str(b, "availability"));
                break;
            }
            case "profile.save": {
                OperationsServices.require(!OperationsServices.str(b, "first_name").isEmpty() && OperationsServices.str(b, "first_name").length() <= 50 && !OperationsServices.str(b, "last_name").isEmpty() && OperationsServices.str(b, "last_name").length() <= 50 && OperationsServices.str(b, "phone").length() <= 20, "Enter valid names and phone.");
                this.jdbc.update("UPDATE dev_autoserve.users SET first_name=?,last_name=?,phone=? WHERE id=?", OperationsServices.str(b, "first_name"), OperationsServices.str(b, "last_name"), OperationsServices.str(b, "phone"), actor.id());
                break;
            }
            default: {
                this.work(actor, action, b, request, note);
            }
        }
        return Map.of("success", true, "id", id, "requestId", request);
    }

    private void event(long request, long actor, String action, String stage, String note) {
        this.jdbc.update("INSERT INTO dev_autoserve.as_events(request_id,actor_id,action,stage,note) VALUES(?,?,?,?,?)", request, actor, action, stage, note);
    }

    private void work(ApiAccessServices.Actor actor, String action, Map<String, Object> b, long request, String note) {
        boolean admin = actor.has("ADMIN");
        Map<String, Object> sr = this.row("SELECT customer_id FROM dev_autoserve.service_requests WHERE id=? AND is_active=1 FOR UPDATE", request);
        long owner = this.num(sr, "customer_id");
        this.jdbc.update("INSERT IGNORE INTO dev_autoserve.as_workflow(request_id,stage) VALUES(?,'Service Requested')", request);
        Map<String, Object> workflow = this.row("SELECT stage,held FROM dev_autoserve.as_workflow WHERE request_id=? FOR UPDATE", request);
        String stage = workflow.get("stage").toString();
        boolean held = this.num(workflow, "held") == 1L;
        List<Map<String, Object>> orders = this.jdbc.queryForList("SELECT id,technician_id FROM dev_autoserve.work_orders WHERE service_request_id=? FOR UPDATE", request);
        long order = orders.isEmpty() ? 0L : this.num(orders.get(0), "id");
        long tech = orders.isEmpty() ? 0L : this.num(orders.get(0), "technician_id");
        boolean assigned = actor.has("TECHNICIAN") && tech == actor.id();
        OperationsServices.require(admin || owner == actor.id() || assigned, "Access denied for this request.");
        OperationsServices.require(!held || action.equals("resume"), "Resume this work order before making changes.");
        switch (action) {
            case "assign": {
                OperationsServices.require(admin && !stage.equals("Completed"), "Only admins can assign open work orders.");
                long target = OperationsServices.integer(b, "technicianId");
                OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.users u JOIN dev_autoserve.user_roles ur ON ur.user_id=u.id JOIN dev_autoserve.roles r ON r.id=ur.role_id LEFT JOIN dev_autoserve.as_technicians t ON t.user_id=u.id WHERE u.id=? AND u.is_active=1 AND r.code='TECHNICIAN' AND COALESCE(t.availability,'Available')<>'Off'", Long.class, target) > 0L, "Select an active available technician.");
                if (order == 0L) {
                    order = this.insert("INSERT INTO dev_autoserve.work_orders(service_request_id,technician_id,status_id) VALUES(?,?,?)", request, target, this.status("WORK_ORDER", "OPEN"));
                } else {
                    this.jdbc.update("UPDATE dev_autoserve.work_orders SET technician_id=? WHERE id=?", target, order);
                }
                this.jdbc.update("UPDATE dev_autoserve.appointments SET technician_id=?,is_appointed=1 WHERE service_request_id=? AND is_active=1", target, request);
                this.jdbc.update("UPDATE dev_autoserve.part_requests SET status='Rejected',resolved_by=?,resolved_at=CURRENT_TIMESTAMP WHERE work_order_id=? AND technician_id<>? AND status='Pending'", actor.id(), order, target);
                this.notices.send(target, "Assigned work order #" + order, "SYSTEM");
                break;
            }
            case "request.update": {
                List list;
                OperationsServices.require(stage.equals("Service Requested") && (admin || owner == actor.id()), "Only unstarted requests may be edited by the customer or admin.");
                String description = OperationsServices.str(b, "description");
                OperationsServices.require(!description.isEmpty() && description.length() <= 5000, "Describe the concern in up to 5000 characters.");
                Object serviceIds = b.get("serviceIds");
                OperationsServices.require(serviceIds instanceof List && !(list = (List)serviceIds).isEmpty(), "Select at least one service.");
                LinkedHashSet<Long> types = new LinkedHashSet<Long>();
                for (Object item : (List)b.get("serviceIds")) {
                    long type = OperationsServices.integer(Collections.singletonMap("type", item), "type");
                    OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.service_types WHERE id=? AND is_active=1", Long.class, type) == 1L, "Select active service types.");
                    types.add(type);
                }
                this.jdbc.update("UPDATE dev_autoserve.service_requests SET description=? WHERE id=?", description, request);
                this.jdbc.update("UPDATE dev_autoserve.service_request_services SET is_active=0 WHERE service_request_id=?", request);
                Iterator iterator = types.iterator();
                while (iterator.hasNext()) {
                    long type = (Long)iterator.next();
                    this.jdbc.update("INSERT INTO dev_autoserve.service_request_services(service_request_id,service_type_id,is_active) VALUES(?,?,1) ON DUPLICATE KEY UPDATE is_active=1", request, type);
                }
                break;
            }
            case "unassign": {
                OperationsServices.require(admin && stage.equals("Service Requested") && order > 0L, "Only an admin can unassign an unstarted work order.");
                for (String table : List.of("part_usages", "part_requests", "time_logs", "invoices", "recommended_repairs")) {
                    OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve." + table + " WHERE work_order_id=?", Long.class, order) == 0L, "Reassign instead: this work order already has linked records.");
                }
                this.jdbc.update("UPDATE dev_autoserve.appointments SET technician_id=NULL,is_appointed=0 WHERE service_request_id=?", request);
                this.jdbc.update("DELETE FROM dev_autoserve.work_orders WHERE id=?", order);
                break;
            }
            case "appointment.save": 
            case "appointment.cancel": {
                long appt;
                OperationsServices.require(stage.equals("Service Requested") && (admin || owner == actor.id()), "Only customers or admins can change appointments before check-in.");
                List<Map<String, Object>> appts = this.jdbc.queryForList("SELECT a.id FROM dev_autoserve.appointments a JOIN dev_autoserve.statuses s ON s.id=a.status_id WHERE a.service_request_id=? AND a.is_active=1 AND s.is_terminal=0 ORDER BY a.id DESC FOR UPDATE", request);
                long l = appt = appts.isEmpty() ? 0L : this.num(appts.get(0), "id");
                if (action.equals("appointment.cancel")) {
                    OperationsServices.require(appt > 0L, "No active appointment exists.");
                    this.jdbc.update("UPDATE dev_autoserve.appointments SET status_id=? WHERE id=?", this.status("APPOINTMENT", "CANCELLED"), appt);
                    break;
                }
                this.appointmentDate(b);
                if (appt == 0L) {
                    this.jdbc.update("INSERT INTO dev_autoserve.appointments(service_request_id,technician_id,scheduled_date,scheduled_time,status_id,is_active,is_appointed) VALUES(?,?,?,?,?,1,?)", request, tech == 0L ? null : Long.valueOf(tech), this.date(b), this.time(b), this.status("APPOINTMENT", "SCHEDULED"), tech > 0L ? 1 : 0);
                    break;
                }
                this.jdbc.update("UPDATE dev_autoserve.appointments SET scheduled_date=?,scheduled_time=?,status_id=? WHERE id=?", this.date(b), this.time(b), this.status("APPOINTMENT", "RESCHEDULED"), appt);
                break;
            }
            case "checkin": {
                OperationsServices.require(stage.equals("Service Requested"), "This vehicle is already checked in.");
                Map<String, Object> appt = this.row("SELECT a.id FROM dev_autoserve.appointments a JOIN dev_autoserve.statuses s ON s.id=a.status_id WHERE a.service_request_id=? AND a.is_active=1 AND s.is_terminal=0 ORDER BY a.id DESC LIMIT 1 FOR UPDATE", request);
                this.jdbc.update("INSERT INTO dev_autoserve.check_ins(appointment_id,arrival_confirmed,checkin_notes,status_id,checked_in_at) VALUES(?,1,?,?,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE arrival_confirmed=1,checkin_notes=VALUES(checkin_notes),checked_in_at=CURRENT_TIMESTAMP", this.num(appt, "id"), note, this.status("CHECK_IN", "ARRIVED"));
                stage = "Vehicle Checked In";
                break;
            }
            case "parts.set": {
                OperationsServices.require((admin || assigned) && Set.of("Vehicle Checked In", "Diagnosis").contains(stage), "Parts can only be changed by the admin or assigned technician during diagnosis.");
                billing.setPart(order,b);
                break;
            }
            case "diagnosis.save": 
            case "diagnosis.submit": {
                OperationsServices.require((assigned || admin) && Set.of("Vehicle Checked In", "Diagnosis").contains(stage), "Only the admin or assigned technician can diagnose a checked-in vehicle.");
                String diagnosis = OperationsServices.str(b, "diagnosis");
                OperationsServices.require(!diagnosis.isEmpty() && diagnosis.length() <= 5000, "Enter a diagnosis of up to 5000 characters.");
                if(action.equals("diagnosis.submit")) billing.submit(order,b.get("revision"));
                stage = action.equals("diagnosis.submit") ? "Customer Approval" : "Diagnosis";
                this.jdbc.update("UPDATE dev_autoserve.work_orders SET diagnosis=?,status_id=? WHERE id=?", diagnosis, this.status("WORK_ORDER", stage.equals("Diagnosis") ? "DIAGNOSING" : "AWAITING_APPROVAL"), order);
                break;
            }
            case "approve": 
            case "revise": {
                OperationsServices.require(stage.equals("Customer Approval") && (owner == actor.id() || admin && !note.isBlank()), "Customer approval or documented admin consent is required.");
                if(action.equals("approve")) billing.approve(order,b.get("revision")); else billing.revise(order);
                stage = action.equals("approve") ? "Repair" : "Diagnosis";
                this.jdbc.update("UPDATE dev_autoserve.work_orders SET status_id=? WHERE id=?", this.status("WORK_ORDER", stage.equals("Repair") ? "IN_PROGRESS" : "DIAGNOSING"), order);
                break;
            }
            case "complete": {
                OperationsServices.require(stage.equals("Repair") && (assigned || admin), "Only approved repairs can be completed by the assigned technician or admin.");
                stage = "Completed";
                this.jdbc.update("UPDATE dev_autoserve.work_orders SET status_id=?,completed_at=CURRENT_TIMESTAMP WHERE id=?", this.status("WORK_ORDER", "COMPLETED"), order);
                this.jdbc.update("UPDATE dev_autoserve.appointments SET status_id=? WHERE service_request_id=? AND is_active=1 AND status_id<>?", this.status("APPOINTMENT", "COMPLETED"), request, this.status("APPOINTMENT", "CANCELLED"));
                break;
            }
            case "hold": 
            case "resume": {
                OperationsServices.require(!stage.equals("Completed") && (admin || assigned) && !note.isBlank(), "Only assigned technicians or admins may hold/resume work, with a reason.");
                OperationsServices.require(action.equals("resume") == held, "This hold state has already changed.");
                this.jdbc.update("UPDATE dev_autoserve.as_workflow SET held=?,hold_reason=? WHERE request_id=?", action.equals("hold") ? 1 : 0, action.equals("hold") ? note : "", request);
                break;
            }
            case "invoice.issue": {
                OperationsServices.require(admin && stage.equals("Completed"), "Only admins can invoice completed repairs.");
                OperationsServices.require(this.jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.invoices WHERE work_order_id=?", Long.class, order) == 0L, "This work order already has an invoice.");
                billing.issue(order,b,this.status("INVOICE", "ISSUED"));
                break;
            }
            case "payment.record": {
                OperationsServices.require(admin, "Only admins can record confirmed payments.");
                Map<String, Object> invoice = this.row("SELECT id,amount FROM dev_autoserve.invoices WHERE work_order_id=? AND status_id<>? FOR UPDATE", order, this.status("INVOICE", "VOID"));
                long invoiceId = this.num(invoice, "id");
                BigDecimal paid = this.jdbc.queryForObject("SELECT COALESCE(SUM(p.amount),0) FROM dev_autoserve.payments p JOIN dev_autoserve.statuses s ON s.id=p.status_id WHERE p.invoice_id=? AND s.table_code='PAYMENT' AND s.code='SUCCESS'", BigDecimal.class, invoiceId);
                BigDecimal balance = new BigDecimal(invoice.get("amount").toString()).subtract(paid);
                OperationsServices.require(balance.signum() > 0, "This invoice is already paid.");
                this.jdbc.update("INSERT INTO dev_autoserve.payments(invoice_id,amount,method,status_id,transaction_id,paid_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)", invoiceId, balance, Set.of("BANK_TRANSFER", "CARD", "WALLET", "OTHER").contains(OperationsServices.str(b, "method")) ? OperationsServices.str(b, "method") : "OTHER", this.status("PAYMENT", "SUCCESS"), "AS-" + String.valueOf(UUID.randomUUID()));
                this.jdbc.update("UPDATE dev_autoserve.invoices SET status_id=? WHERE id=?", this.status("INVOICE", "PAID"), invoiceId);
                break;
            }
            case "request.cancel": {
                OperationsServices.require(stage.equals("Service Requested") && (admin || owner == actor.id()), "Only unstarted requests can be cancelled.");
                this.jdbc.update("UPDATE dev_autoserve.service_requests SET is_active=0,status_id=? WHERE id=?", this.status("SERVICE_REQUEST", "CANCELLED"), request);
                this.jdbc.update("UPDATE dev_autoserve.appointments SET status_id=? WHERE service_request_id=? AND is_active=1", this.status("APPOINTMENT", "CANCELLED"), request);
                break;
            }
            default: {
                throw new ApiAccessServices.ApiFailure(400, "Unknown work-order action.");
            }
        }
        this.jdbc.update("UPDATE dev_autoserve.as_workflow SET stage=? WHERE request_id=?", stage, request);
        if (!action.equals("request.cancel")) {
            String code = switch (stage) {
                case "Completed" -> "COMPLETED";
                case "Repair" -> "IN_PROGRESS";
                case "Customer Approval" -> "APPROVED";
                case "Service Requested" -> "SUBMITTED";
                default -> "UNDER_REVIEW";
            };
            this.jdbc.update("UPDATE dev_autoserve.service_requests SET status_id=? WHERE id=?", this.status("SERVICE_REQUEST", code), request);
        }
        this.event(request, actor.id(), action, stage, note);
        this.notices.send(owner, "Service request #" + request + ": " + action + " \u2014 " + stage, "SERVICE_REQUEST");
        if (tech > 0L && tech != actor.id()) {
            this.notices.send(tech, "Work order #" + order + ": " + action, "SYSTEM");
        }
    }
}
