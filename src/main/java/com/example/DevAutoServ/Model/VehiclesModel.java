package com.example.DevAutoServ.Model;

public class VehiclesModel
{

    private Long id;
    private Long customerId;
    private String make;
    private String color;
    private String model;
    private Short year;
    private String vin;
    private String mileage;
    private String licensePlate;

    public VehiclesModel(Long id, Long customerId, String make, String color, String model, Short year, String vin, String mileage, String licensePlate) {
        this.id = id;
        this.customerId = customerId;
        this.make = make;
        this.color = color;
        this.model = model;
        this.year = year;
        this.vin = vin;
        this.mileage = mileage;
        this.licensePlate = licensePlate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getMake() {
        return make;
    }

    public void setMake(String make) {
        this.make = make;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Short getYear() {
        return year;
    }

    public void setYear(Short year) {
        this.year = year;
    }

    public String getVin() {
        return vin;
    }

    public void setVin(String vin) {
        this.vin = vin;
    }

    public String getMileage() {
        return mileage;
    }

    public void setMileage(String mileage) {
        this.mileage = mileage;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }
}
