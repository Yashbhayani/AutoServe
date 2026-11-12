package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.CommonModel.CommonQueryServicesModel;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.*;

@Service
public class ReportServices {

    private final JdbcTemplate jdbcTemplate;
    public ReportServices(JdbcTemplate jdbcTemplate){
        this.jdbcTemplate = jdbcTemplate;
    }

    CommonQueryServicesModel query = new CommonQueryServicesModel();

    public Map<String, Object> fetchDeta(String Code, String report) {

        Map<String, Object> response = new HashMap<>();

        try {

            // 1. Get stored procedure call from SpTable
            String CodeQ = jdbcTemplate.queryForObject(
                    query.SP,
                    new Object[]{Code},
                    String.class
            );

            // 2. Execute stored procedure dynamically
            Map<String, Object> listdata = jdbcTemplate.execute(
                    CodeQ,
                    (CallableStatementCallback<Map<String, Object>>) callableStatement -> {

                        Map<String, Object> datas = new LinkedHashMap<>();

                        // Pass JSON parameter
                        callableStatement.setString(1, report);

                        boolean hasResults = callableStatement.execute();

                        int resultSetIndex = 0;

                        while (true) {

                            if (hasResults) {

                                try (ResultSet rs = callableStatement.getResultSet()) {

                                    if (rs != null) {

                                        List<Map<String, Object>> data = new ArrayList<>();

                                        ResultSetMetaData metaData = rs.getMetaData();
                                        int columnCount = metaData.getColumnCount();

                                        // Check whether resultset_name exists
                                        int nameColumnIndex = -1;
                                        for (int i = 1; i <= columnCount; i++) {
                                            if ("resultset_name".equalsIgnoreCase(
                                                    metaData.getColumnLabel(i))) {
                                                nameColumnIndex = i;
                                                break;
                                            }
                                        }

                                        String resultsetName = null;

                                        // Read every row
                                        while (rs.next()) {

                                            Map<String, Object> details = new LinkedHashMap<>();

                                            if (nameColumnIndex != -1 && resultsetName == null) {
                                                resultsetName = rs.getString(nameColumnIndex);
                                            }

                                            // Read every column dynamically
                                            for (int i = 1; i <= columnCount; i++) {

                                                String columnName = metaData.getColumnLabel(i);

                                                // Do not include resultset_name in actual data
                                                if (!"resultset_name".equalsIgnoreCase(columnName)) {

                                                    details.put(
                                                            columnName,
                                                            rs.getObject(i)
                                                    );
                                                }
                                            }

                                            data.add(details);
                                        }

                                        // Dynamic result set name
                                        if (resultsetName == null || resultsetName.isBlank()) {
                                            resultsetName = "resultset_" + resultSetIndex;
                                        }
                                        datas.put(resultsetName, data);

                                        resultSetIndex++;
                                    }
                                }

                            } else {

                                // Stop when there are no more result sets or update counts
                                if (callableStatement.getUpdateCount() == -1) {
                                    break;
                                }
                            }

                            hasResults = callableStatement.getMoreResults(
                                    Statement.CLOSE_CURRENT_RESULT
                            );

                            if (!hasResults && callableStatement.getUpdateCount() == -1) {
                                break;
                            }
                        }


                        return datas;
                    }
            );

            // 3. Prepare response
            if (listdata != null && !listdata.isEmpty()) {

                Map<String, Object> data = new HashMap<>();

                data.put("listdata", listdata);

                response.put("data", data);
                response.put("Success", true);
                response.put("Code", 200);

            } else {

                response.put("Message", "List not found for the specified report.");
                response.put("Success", false);
                response.put("Code", 404);
            }

        } catch (Exception e) {

            response.put("Message", e.getMessage());
            response.put("Success", false);
            response.put("Code", 500);
        }

        return response;
    }

}
