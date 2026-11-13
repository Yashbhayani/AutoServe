package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Model.PartModel;
import com.example.DevAutoServ.Services.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/parts")
public class PartsController {
    private final PartsServices parts;
    private final ApiAccessServices access;
    public PartsController(PartsServices parts, ApiAccessServices access) { this.parts = parts; this.access = access; }
    private void reader(String auth) { access.require(auth,"ADMIN","TECHNICIAN"); }
    @GetMapping public Map<String,Object> list(@RequestHeader(value="Authorization",required=false) String auth) { reader(auth); return parts.list(); }
    @GetMapping("/archived") public Map<String,Object> archived(@RequestHeader(value="Authorization",required=false) String auth) { access.require(auth,"ADMIN"); return parts.archived(); }
    @PutMapping("/{id}/restore") public Map<String,Object> restore(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id) { access.require(auth,"ADMIN"); return parts.restore(id); }
    @GetMapping("/categories") public Map<String,Object> categories(@RequestHeader(value="Authorization",required=false) String auth) { reader(auth); return parts.getCategories(); }
    @GetMapping("/category/{id}") public Map<String,Object> category(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id) { reader(auth); return parts.getPartsByCategory(id); }
    @GetMapping("/{id}") public Map<String,Object> part(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id) { reader(auth); return parts.getPartById(id); }
    @GetMapping("/{id}/prices") public Map<String,Object> prices(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id) { reader(auth); return parts.prices(id); }
    @PostMapping("/create") public Map<String,Object> create(@RequestHeader(value="Authorization",required=false) String auth,@RequestBody PartModel model) { access.require(auth,"ADMIN"); return parts.createPart(model); }
    @PutMapping("/update/{id}") public Map<String,Object> update(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id,@RequestBody PartModel model) { access.require(auth,"ADMIN"); return parts.updatePart(id,model); }
    @DeleteMapping("/delete/{id}") public Map<String,Object> delete(@RequestHeader(value="Authorization",required=false) String auth,@PathVariable long id) { access.require(auth,"ADMIN"); return parts.deletePart(id); }
}
