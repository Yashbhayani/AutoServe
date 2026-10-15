package com.example.DevAutoServ.Services;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordServices  {

    private final PasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder(12);

    public String EncryptPassword(String password) {

        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException(
                    "Password cannot be empty"
            );
        }

        return passwordEncoder.encode(password);
    }

    public boolean MatchPassword(
            String password,
            String encryptedPassword
    ) {

        if (password == null
                || encryptedPassword == null
                || encryptedPassword.isBlank()) {
            return false;
        }

        return passwordEncoder.matches(
                password,
                encryptedPassword
        );
    }

}

