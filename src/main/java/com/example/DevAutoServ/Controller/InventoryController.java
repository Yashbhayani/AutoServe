package com.example.DevAutoServ.Controller;
import com.example.DevAutoServ.Services.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
    private final InventoryServices inventory; private final ApiAccessServices access;
    public InventoryController(InventoryServices inventory,ApiAccessServices access){this.inventory=inventory;this.access=access;}
    @GetMapping("/jobs") public Map<String,Object> jobs(@RequestHeader(value="Authorization",required=false) String auth){return inventory.jobs(access.require(auth,"TECHNICIAN"));}
    @GetMapping("/requests") public Map<String,Object> list(@RequestHeader(value="Authorization",required=false) String auth){return inventory.list(access.require(auth,"ADMIN","TECHNICIAN"));}
    @PostMapping("/requests") public Map<String,Object> create(@RequestHeader(value="Authorization",required=false) String auth,@RequestBody InventoryServices.Request body){return inventory.create(access.require(auth,"TECHNICIAN"),body);}
    @PutMapping("/requests/{id}") public Map<String,Object> resolve(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id,@RequestBody Map<String,String> body){return inventory.resolve(access.require(auth,"ADMIN"),id,body.getOrDefault("status",""));}
}
