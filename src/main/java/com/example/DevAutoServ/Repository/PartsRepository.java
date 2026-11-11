package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.Model.PartModel;

import java.util.Map;

public interface PartsRepository {

    Map<String, Object> getCategories();

    Map<String, Object> getPartsByCategory(Long categoryId);

    Map<String, Object> getPartById(Long id);

    Map<String, Object> createPart( PartModel model);

    Map<String, Object> updatePart(Long id, PartModel model);

    Map<String, Object> deletePart(Long id);
}
