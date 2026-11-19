package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Model.PartModel;
import com.example.DevAutoServ.Repository.PartsRepository;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class PartsServices implements PartsRepository {
    private final JdbcTemplate jdbc;
    private final NotificationServices notifications;
    private final Clock clock;
    private static final String SELECT = """
        SELECT p.id, p.is_active, p.category_id, p.code, p.name, p.sku, c.name AS category_name,
               COALESCE(pp.unit_price,0) AS unit_price, COALESCE(pi.stock_quantity,0) AS stock_quantity,
               COALESCE(pi.reorder_level,5) AS reorder_level
        FROM dev_autoserve.parts p JOIN dev_autoserve.part_categories c ON c.id = p.category_id
        LEFT JOIN dev_autoserve.part_prices pp ON pp.part_id = p.id AND pp.current_flag = 1 AND pp.is_active = 1
        LEFT JOIN dev_autoserve.part_inventory pi ON pi.part_id = p.id
        WHERE 1 = 1
        """;
    @Autowired
    public PartsServices(JdbcTemplate jdbc, NotificationServices notifications) { this(jdbc, notifications, Clock.systemDefaultZone()); }
    public PartsServices(JdbcTemplate jdbc, NotificationServices notifications, Clock clock) { this.jdbc = jdbc; this.notifications = notifications; this.clock = clock; }
    private Map<String,Object> data(Object data) { return Map.of("success",true,"data",data); }
    public Map<String,Object> getCategories() { return data(jdbc.queryForList("SELECT id, code, name FROM dev_autoserve.part_categories ORDER BY name")); }
    public Map<String,Object> list() { return data(jdbc.queryForList(SELECT + " AND p.is_active = 1 ORDER BY p.name, p.id")); }
    public Map<String,Object> archived() { return data(jdbc.queryForList(SELECT + " AND p.is_active = 0 ORDER BY p.name,p.id")); }
    @Transactional
    public Map<String,Object> restore(long id) {
        var rows = jdbc.queryForList("SELECT id,is_active FROM dev_autoserve.parts WHERE id=? FOR UPDATE",id);
        if (rows.isEmpty()) throw new ApiFailure(404,"Part not found.");
        if (Boolean.TRUE.equals(rows.get(0).get("is_active")) || rows.get(0).get("is_active") instanceof Number n && n.intValue()==1) throw new ApiFailure(409,"This part is already active.");
        jdbc.update("UPDATE dev_autoserve.parts SET is_active=1 WHERE id=?",id);
        jdbc.update("INSERT INTO dev_autoserve.part_inventory (part_id,stock_quantity,reorder_level,is_active) VALUES (?,0,5,1) ON DUPLICATE KEY UPDATE is_active=1",id);
        return getPartById(id);
    }
    public Map<String,Object> getPartsByCategory(Long categoryId) { return data(jdbc.queryForList(SELECT + " AND p.is_active = 1 AND p.category_id = ? ORDER BY p.name, p.id", categoryId)); }
    public Map<String,Object> getPartById(Long id) {
        var rows = jdbc.queryForList(SELECT + " AND p.is_active = 1 AND p.id = ?", id);
        if (rows.isEmpty()) throw new ApiFailure(404,"Part not found.");
        return data(rows.get(0));
    }
    public Map<String,Object> prices(long id) {
        getPartById(id);
        return data(jdbc.queryForList("SELECT id, unit_price, effective_from, effective_to FROM dev_autoserve.part_prices WHERE part_id = ? ORDER BY effective_from DESC",id));
    }
    private void validate(PartModel part) {
        if (part == null || part.getCategoryId() == null || part.getCategoryId() <= 0) throw new ApiFailure(400,"Select a category.");
        if (!text(part.getName(),100) || !text(part.getCode(),50) || !text(part.getSku(),50)) throw new ApiFailure(400,"Enter a name (up to 100 characters), code and SKU (up to 50 characters).");
        BigDecimal price = part.getUnitPrice();
        if (price == null || price.signum() < 0 || price.compareTo(new BigDecimal("99999999.99")) > 0 || price.stripTrailingZeros().scale() > 2) throw new ApiFailure(400,"Enter a nonnegative price with at most two decimal places.");
        if (part.getStockQuantity() == null || part.getStockQuantity() < 0 || part.getReorderLevel() == null || part.getReorderLevel() < 0) throw new ApiFailure(400,"Stock and reorder level must be nonnegative whole numbers.");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.part_categories WHERE id = ?", Long.class, part.getCategoryId()) == 0) throw new ApiFailure(400,"Category not found.");
    }
    private boolean text(String value,int max) { return value != null && !value.isBlank() && value.trim().length() <= max; }
    private void unique(PartModel part, long except) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.parts WHERE (LOWER(code) = LOWER(?) OR LOWER(sku) = LOWER(?)) AND id <> ?", Long.class, part.getCode().trim(),part.getSku().trim(),except) > 0) throw new ApiFailure(409,"Part code or SKU already exists, including archived parts.");
    }
    @Transactional
    public Map<String,Object> createPart(PartModel part) {
        validate(part); unique(part,0);
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("INSERT INTO dev_autoserve.parts (category_id,code,name,sku,is_active) VALUES (?,?,?,?,1)", new String[]{"id"});
            ps.setLong(1,part.getCategoryId()); ps.setString(2,part.getCode().trim()); ps.setString(3,part.getName().trim()); ps.setString(4,part.getSku().trim()); return ps;
        },key);
        if (key.getKey() == null) throw new IllegalStateException("Missing part ID.");
        long id = key.getKey().longValue();
        jdbc.update("INSERT INTO dev_autoserve.part_prices (part_id,unit_price,effective_from,is_active) VALUES (?,?,?,1)",id,part.getUnitPrice(),Timestamp.valueOf(LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS)));
        jdbc.update("INSERT INTO dev_autoserve.part_inventory (part_id,stock_quantity,reorder_level,is_active) VALUES (?,?,?,1)",id,part.getStockQuantity(),part.getReorderLevel());
        if (part.getStockQuantity() <= part.getReorderLevel()) notifications.admins("Low stock: " + part.getName().trim() + " (" + part.getStockQuantity() + " remaining).");
        return getPartById(id);
    }
    @Transactional
    public Map<String,Object> updatePart(Long id, PartModel part) {
        validate(part);
        var locked = jdbc.queryForList("SELECT id FROM dev_autoserve.parts WHERE id = ? AND is_active = 1 FOR UPDATE",id);
        if (locked.isEmpty()) throw new ApiFailure(404,"Part not found.");
        if (part.getExpectedStockQuantity() == null) throw new ApiFailure(400,"Refresh inventory before editing this part.");
        var stock = jdbc.queryForList("SELECT stock_quantity FROM dev_autoserve.part_inventory WHERE part_id = ? FOR UPDATE",id);
        int actualStock = stock.isEmpty() ? 0 : ((Number)stock.get(0).get("stock_quantity")).intValue();
        if (actualStock != part.getExpectedStockQuantity()) throw new ApiFailure(409,"Stock changed while this form was open. Close the form, refresh inventory and try again.");
        unique(part,id);
        var before = (Map<?,?>) getPartById(id).get("data");
        jdbc.update("UPDATE dev_autoserve.parts SET category_id = ?,code = ?,name = ?,sku = ? WHERE id = ?",part.getCategoryId(),part.getCode().trim(),part.getName().trim(),part.getSku().trim(),id);
        var current = jdbc.queryForList("SELECT id,unit_price,effective_from FROM dev_autoserve.part_prices WHERE part_id = ? AND current_flag = 1 FOR UPDATE",id);
        if (current.isEmpty() || new BigDecimal(current.get(0).get("unit_price").toString()).compareTo(part.getUnitPrice()) != 0) {
            LocalDateTime effective = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
            if (!current.isEmpty()) {
                Object previous = current.get(0).get("effective_from");
                LocalDateTime start = previous instanceof Timestamp stamp ? stamp.toLocalDateTime() : (LocalDateTime)previous;
                if (!effective.isAfter(start)) effective = start.plusSeconds(1);
                jdbc.update("UPDATE dev_autoserve.part_prices SET effective_to = ? WHERE id = ?",Timestamp.valueOf(effective),current.get(0).get("id"));
            }
            jdbc.update("INSERT INTO dev_autoserve.part_prices (part_id,unit_price,effective_from,is_active) VALUES (?,?,?,1)",id,part.getUnitPrice(),Timestamp.valueOf(effective));
        }
        jdbc.update("""
            INSERT INTO dev_autoserve.part_inventory (part_id,stock_quantity,reorder_level,is_active) VALUES (?,?,?,1)
            ON DUPLICATE KEY UPDATE stock_quantity = VALUES(stock_quantity), reorder_level = VALUES(reorder_level), is_active = 1
            """,id,part.getStockQuantity(),part.getReorderLevel());
        if (part.getStockQuantity() <= part.getReorderLevel() && ((Number)before.get("stock_quantity")).intValue() > ((Number)before.get("reorder_level")).intValue()) notifications.admins("Low stock: " + part.getName().trim() + " (" + part.getStockQuantity() + " remaining).");
        return getPartById(id);
    }
    @Transactional
    public Map<String,Object> deletePart(Long id) {
        if (jdbc.queryForList("SELECT id FROM dev_autoserve.parts WHERE id = ? AND is_active = 1 FOR UPDATE",id).isEmpty()) throw new ApiFailure(404,"Part not found.");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.part_requests WHERE part_id = ? AND status = 'Pending'",Long.class,id) > 0) throw new ApiFailure(409,"Resolve pending requests before archiving this part.");
        jdbc.update("UPDATE dev_autoserve.parts SET is_active = 0 WHERE id = ?",id);
        jdbc.update("UPDATE dev_autoserve.part_inventory SET is_active = 0 WHERE part_id = ?",id);
        return Map.of("success",true);
    }
}
