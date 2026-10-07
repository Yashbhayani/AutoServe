package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.Repository.AuthRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api")
public class AuthController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    @Autowired
    private final AuthRepository authRepository;

    public AuthController(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }
    @GetMapping("/hello")
    public String index() {
        return authRepository.Hello();
    }
}
