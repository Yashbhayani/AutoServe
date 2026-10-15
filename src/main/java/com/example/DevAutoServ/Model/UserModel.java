package com.example.DevAutoServ.Model;

public class UserModel {

    public  String fname;
    public  String lname;
    public  String email;
    public String phonenumber;
    public String drivinglicnumber;
    public  String password;

    public UserModel(String fname, String lname, String email, String phonenumber, String drivinglicnumber, String password) {
        this.fname = fname;
        this.lname = lname;
        this.email = email;
        this.phonenumber = phonenumber;
        this.drivinglicnumber = drivinglicnumber;
        this.password = password;
    }


    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDrivinglicnumber() {
        return drivinglicnumber;
    }

    public void setDrivinglicnumber(String drivinglicnumber) {
        this.drivinglicnumber = drivinglicnumber;
    }

    public String getPhonenumber() {
        return phonenumber;
    }

    public void setPhonenumber(String phonenumber) {
        this.phonenumber = phonenumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLname() {
        return lname;
    }

    public void setLname(String lname) {
        this.lname = lname;
    }

    public String getFname() {
        return fname;
    }

    public void setFname(String fname) {
        this.fname = fname;
    }



}
