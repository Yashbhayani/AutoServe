package com.example.DevAutoServ.Model;

public class AssignPartModel {

    private Long partId;
    private Integer quantity;


    public AssignPartModel(Long partId, Integer quantity) {
        this.partId = partId;
        this.quantity = quantity;
    }

    public Long getPartId() {
        return partId;
    }

    public void setPartId(Long partId) {
        this.partId = partId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
