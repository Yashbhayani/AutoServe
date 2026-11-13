package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.Column;

public class LogIn {
    public LogIn() {}
    public String email;
    @com.fasterxml.jackson.annotation.JsonAlias("password")
    public String passwordHash;

    public LogIn(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}

