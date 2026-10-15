package com.example.DevAutoServ.Services;

import com.example.DevAutoServ.AutoServeModel.User;
import com.example.DevAutoServ.Model.UserModel;
import com.example.DevAutoServ.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserServices implements UserRepository {
  //  @Autowired

    @Override
    public Map<String, Object> AddUser(User userModel) {

        Map<String, Object> response = new HashMap<>();

        try {
            System.out.println(userModel.getFirst_name());
            System.out.println(userModel.getLast_name());
            System.out.println(userModel.getEmail());
            System.out.println(userModel.getPasswordHash());

            response.put("success", true);
            response.put("message", "User data received");

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }

        return response;
    }

}
