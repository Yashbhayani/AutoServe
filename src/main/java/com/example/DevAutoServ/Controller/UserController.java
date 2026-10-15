package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.Model.UserModel;
import com.example.DevAutoServ.Repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api")
public class UserController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private  final UserRepository userRepository;

    public  UserController(UserRepository userRepository){
        this.userRepository = userRepository;
    }

    @GetMapping("/add-user")
    public Map<String, Object> AddUser(@RequestBody User userModel){
        return userRepository.AddUser(userModel);
    }
}
