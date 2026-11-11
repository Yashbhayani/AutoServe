package com.example.DevAutoServ.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class QueryHandlerServices {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    public String Query;

    public String CheckDublicatResult(String querystring, String data) {
        Query = jdbcTemplate.queryForObject(querystring, new Object[]{data.toLowerCase()}, String.class);
        return Query.toString();
    }

    public Short GetRole(String querystring, String data) {
        Query = jdbcTemplate.queryForObject(querystring, new Object[]{data.toUpperCase()}, String.class);
        return Short.parseShort(Query);
    }

    public int GetServicsType(String querystring, String code) {
        Query = jdbcTemplate.queryForObject(querystring, new Object[]{code.toUpperCase()}, String.class);
        return Integer.parseInt(Query);
    }

    public String GetUserRole(String querystring, String data) {
        return jdbcTemplate.queryForObject(
                querystring,
                String.class,
                data.trim()
        );
    }

    public Long GetUserId(String querystring, String username) {

        return jdbcTemplate.queryForObject(
                querystring,
                Long.class,
                username
        );
    }

    public boolean CheckRolePermission(String queryString, String permissionCode, String roleCode) {

        Integer result = jdbcTemplate.queryForObject(
                queryString,
                Integer.class,
                permissionCode,
                roleCode
        );

        return result != null && result == 1;
    }

    public  Integer checkVehicleQuery(String queryString, Long customerId, Long vehicleId ){
        return  jdbcTemplate.queryForObject(
                queryString,
                Integer.class,
                vehicleId,
                customerId
        );
    }

    public boolean IsServiceRequestValid(String query,Long requestId, Long customerId) {

        Integer count = jdbcTemplate.queryForObject(
                query,
                Integer.class,
                requestId,
                customerId
        );

        return count != null && count > 0;
    }

    public Integer GetStatusId(String query, String tableCode, String statusCode) {

        List<Integer> statusIds = jdbcTemplate.query(
                query,
                (rs, rowNum) -> rs.getInt("id"),
                tableCode,
                statusCode
        );

        return statusIds.isEmpty() ? null : statusIds.get(0);
    }

    public Integer GetInitialStatusId(String query, String tableCode) {

        List<Integer> statusIds = jdbcTemplate.query(
                query,
                (rs, rowNum) -> rs.getInt("id"),
                tableCode
        );

        return statusIds.isEmpty() ? null : statusIds.get(0);
    }

    // GET ALL CATEGORIES
    public List<Map<String, Object>> getCategories(String query) {
        return jdbcTemplate.queryForList(query);
    }

    // CHECK CATEGORY
    public Integer checkCategory(String query,Long categoryId) {

        return jdbcTemplate.queryForObject(
                query,
                Integer.class,
                categoryId
        );
    }

    // GET PARTS BY CATEGORY
    public List<Map<String, Object>> getPartsByCategory(String query, Long categoryId) {
        return jdbcTemplate.queryForList(query, categoryId);

    }

    // GET PART BY ID
    public Map<String, Object> getPartById(String query, Long id) {

        List<Map<String, Object>> result =
                jdbcTemplate.queryForList(query, id);

        return result.isEmpty() ? null : result.get(0);
    }

    // CHECK DUPLICATE PART CODE
    public Integer checkPartCode(String query, String code) {

        return jdbcTemplate.queryForObject(
                query,
                Integer.class,
                code
        );
    }

}
