package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Services.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationsController {
    private final ApiAccessServices access;
    private final NotificationServices notifications;
    public NotificationsController(ApiAccessServices access, NotificationServices notifications) { this.access = access; this.notifications = notifications; }
    @GetMapping
    public Map<String, Object> list(@RequestHeader(value="Authorization", required=false) String auth,
            @RequestParam(defaultValue="all") String filter, @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="20") int size) {
        return notifications.list(access.require(auth).id(), filter, page, size);
    }
    @PutMapping("/read-all")
    public Map<String, Object> all(@RequestHeader(value="Authorization", required=false) String auth) { notifications.markAllRead(access.require(auth).id()); return Map.of("success", true); }
    @PutMapping("/{id}/read")
    public Map<String, Object> read(@RequestHeader(value="Authorization", required=false) String auth, @PathVariable long id) { notifications.markRead(access.require(auth).id(), id); return Map.of("success", true); }
}
