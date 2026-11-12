package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.Model.AssignPartModel;

import java.util.List;
import java.util.Map;

public interface PartUsagesRepository {
    Map<String, Object> assignParts(
            Long workOrderId,
            List<AssignPartModel> parts
    );

    Map<String, Object> updateParts(
            Long workOrderId,
            AssignPartModel part
    );

    Map<String, Object> deleteParts(
            Long workOrderId,
            Long partId
    );
}
