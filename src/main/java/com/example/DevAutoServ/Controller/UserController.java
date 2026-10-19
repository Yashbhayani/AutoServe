package com.example.DevAutoServ.Controller;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.Repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@ComponentScan(basePackages = "com.example.DevAutoServ.Services")
@Configuration
@RestController
@RequestMapping("api/user")
public class UserController {
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    private  final UserRepository userRepository;

    public  UserController(UserRepository userRepository){
        this.userRepository = userRepository;
    }

    @PostMapping("/add")
    public Map<String, Object> AddUser(@RequestBody User userModel, HttpServletResponse responses){
        return userRepository.AddUser(userModel, responses);
    }

    @GetMapping("/login")
    public Map<String, Object> login(@RequestBody LogIn logIn){
        return userRepository.Login(logIn);
    }

    @PutMapping("/edit")
    public Map<String, Object> EditUser(        @PathVariable Long id,
                                                @RequestBody User userModel){
        return userRepository.EditUser(userModel);
    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deleteUser(@PathVariable Long id) {
        return userRepository.deleteUser(id);
    }
}
