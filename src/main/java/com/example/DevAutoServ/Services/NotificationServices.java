package com.example.DevAutoServ.Services;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.DevAutoServ.Services.ApiAccessServices.ApiFailure;
import java.util.*;

@Service
public class NotificationServices {
    private final JdbcTemplate jdbc;
    public NotificationServices(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Map<String, Object> list(long userId, String filter, int page, int size) {
        if (!Set.of("all", "unread", "read").contains(filter) || page < 1 || size < 1 || size > 100 || page > 1000000) throw new ApiFailure(400, "Choose valid notification filters and page size.");
        String where = " WHERE user_id = ?" + (filter.equals("all") ? "" : " AND is_read = " + (filter.equals("read") ? "1" : "0"));
        List<Map<String, Object>> items = jdbc.queryForList("SELECT id, message, type, is_read, created_at FROM dev_autoserve.notifications" + where + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", userId, size, (page - 1) * size);
        return Map.of("success", true, "items", items, "total", jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.notifications" + where, Long.class, userId),
                "unreadCount", jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.notifications WHERE user_id = ? AND is_read = 0", Long.class, userId), "page", page, "size", size);
    }
    @Transactional
    public void markRead(long userId, long id) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM dev_autoserve.notifications WHERE id = ? AND user_id = ?", Long.class, id, userId);
        if (count == null || count == 0) throw new ApiFailure(404, "Notification not found.");
        jdbc.update("UPDATE dev_autoserve.notifications SET is_read = 1 WHERE id = ? AND user_id = ?", id, userId);
    }
    @Transactional
    public void markAllRead(long userId) { jdbc.update("UPDATE dev_autoserve.notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", userId); }
    public void send(long userId, String message, String type) {
        jdbc.update("INSERT INTO dev_autoserve.notifications (user_id, message, type, is_read) VALUES (?, ?, ?, 0)", userId, message, type);
    }
    public void admins(String message) {
        jdbc.update("""
            INSERT INTO dev_autoserve.notifications (user_id, message, type, is_read)
            SELECT DISTINCT u.id, ?, 'SYSTEM', 0 FROM dev_autoserve.users u
            JOIN dev_autoserve.user_roles ur ON ur.user_id = u.id JOIN dev_autoserve.roles r ON r.id = ur.role_id
            WHERE u.is_active = 1 AND r.is_active = 1 AND r.code = 'ADMIN'
            """, message);
    }
}
