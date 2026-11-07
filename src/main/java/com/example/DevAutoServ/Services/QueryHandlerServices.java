package com.example.DevAutoServ.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

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
}
