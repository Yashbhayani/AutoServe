package com.example.DevAutoServ;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@ComponentScan(basePackages = {"com.example.DevAutoServ"})
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class DevAutoServApplication implements WebMvcConfigurer {

	public static void main(String[] args) {
		System.out.println("Hii");
		SpringApplication.run(DevAutoServApplication.class, args);
	}

	@RequestMapping(value = "/error")
	public String error() {
		return "Error handling";
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins("*") // allow all origins
				.allowedMethods("*") // allow all HTTP methods
				.allowedHeaders("*");
				//.allowCredentials(true); // allow all headers

	}

}
