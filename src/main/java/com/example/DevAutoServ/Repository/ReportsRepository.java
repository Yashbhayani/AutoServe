package com.example.DevAutoServ.Repository;

import java.util.Map;

public interface ReportsRepository {
    Map<String, Object> fetchDeta(String Code, String report);
}
