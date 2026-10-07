package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.Repository.AuthRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AuthServices implements AuthRepository {
    @Autowired

    public String Hello() {
        return "Hello World!";
    }
}
