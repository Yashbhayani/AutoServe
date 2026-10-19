package com.example.DevAutoServ.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class QueryHandlerServices {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    public  String CheckDublicatResult(String querystring, String data){
        String Query  = jdbcTemplate.queryForObject(querystring, new Object[]{data.toLowerCase()}, String.class);
        return  Query.toString();
    }

    public Short GetRole(String querystring, String data){
        String Query  = jdbcTemplate.queryForObject(querystring, new Object[]{data.toUpperCase()}, String.class);
        return  Short.parseShort(Query);
    }

    public int GetServicsType(String querystring ,String code){
        String Query = jdbcTemplate.queryForObject(querystring, new Object[]{code.toUpperCase()}, String.class);
        return  Integer.parseInt(Query);
    }
}
