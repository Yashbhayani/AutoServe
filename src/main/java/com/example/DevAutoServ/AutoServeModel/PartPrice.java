package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "part_prices",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_part_prices_period", columnNames = {"part_id", "effective_from"}),
           @UniqueConstraint(name = "uq_part_prices_current", columnNames = {"part_id", "current_flag"})
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PartPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "part_id", nullable = false)
    private Long partId;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "effective_from", nullable = false)
    private LocalDateTime effectiveFrom;

    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

    // MySQL generated column: IF(effective_to IS NULL, 1, NULL)
    @Column(name = "current_flag", insertable = false, updatable = false)
    private Boolean currentFlag;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
