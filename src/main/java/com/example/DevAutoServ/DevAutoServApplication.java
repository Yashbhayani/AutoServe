package com.example.DevAutoServ;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class DevAutoServApplication {

	public static void main(String[] args) {
		System.out.println("Hii");
		SpringApplication.run(DevAutoServApplication.class, args);
	}

}
