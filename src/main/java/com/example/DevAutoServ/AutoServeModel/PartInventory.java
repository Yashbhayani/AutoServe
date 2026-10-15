package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "part_inventory",
       uniqueConstraints = @UniqueConstraint(name = "uq_part_inventory_part", columnNames = "part_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PartInventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "part_id", nullable = false)
    private Long partId;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 5;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
