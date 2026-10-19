package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.AutoServeModel.LogIn;
import com.example.DevAutoServ.AutoServeModel.User;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

public interface UserRepository {
    Map<String, Object> AddUser(User userModel, HttpServletResponse responses);
    Map<String, Object> Login(LogIn logIn);
    Map<String, Object> EditUser(User userModel);
    Map<String, Object> deleteUser(Long id);
}

