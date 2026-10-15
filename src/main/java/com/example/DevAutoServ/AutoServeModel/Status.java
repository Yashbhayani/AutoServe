package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "statuses",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_statuses_table_code",
           columnNames = {"table_code", "code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Status {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(name = "table_code", nullable = false, length = 50)
    private String tableCode;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "sort_order", nullable = false)
    private Short sortOrder = 0;

    @Column(name = "is_initial", nullable = false)
    private Boolean isInitial = false;

    @Column(name = "is_terminal", nullable = false)
    private Boolean isTerminal = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
