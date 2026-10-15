package com.example.DevAutoServ.AutoServeModel;


import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parts",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_parts_sku", columnNames = "sku"),
           @UniqueConstraint(name = "uq_parts_code", columnNames = "code")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Part {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String sku;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
