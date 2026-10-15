package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders",
       uniqueConstraints = @UniqueConstraint(name = "uq_wo_request", columnNames = "service_request_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class WorkOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_request_id", nullable = false)
    private Long serviceRequestId;

    @Column(name = "technician_id", nullable = false)
    private Long technicianId;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "status_id", nullable = false)
    private Short statusId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
