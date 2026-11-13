package com.example.DevAutoServ.Model;

import java.math.BigDecimal;

public class PartModel {

    private Long id;
    private Long categoryId;

    private String code;
    private String name;
    private String sku;
    private BigDecimal unitPrice;
    private Integer stockQuantity;
    private Integer reorderLevel=5;
    private Integer expectedStockQuantity;
    public Integer getReorderLevel(){return reorderLevel;}
    public void setReorderLevel(Integer value){reorderLevel=value;}
    public Integer getExpectedStockQuantity(){return expectedStockQuantity;}
    public void setExpectedStockQuantity(Integer value){expectedStockQuantity=value;}


    public PartModel(){}

    public PartModel(Long id, Long categoryId, String code, String name, String sku, BigDecimal unitPrice, Integer stockQuantity) {
        this.id = id;
        this.categoryId = categoryId;
        this.code = code;
        this.name = name;
        this.sku = sku;
        this.unitPrice = unitPrice;
        this.stockQuantity = stockQuantity;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }
}

