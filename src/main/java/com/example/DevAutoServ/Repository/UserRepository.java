package com.example.DevAutoServ.Repository;

import com.example.DevAutoServ.AutoServeModel.User;

import java.util.Map;

public interface UserRepository {
    Map<String, Object> AddUser(User userModel);
}
