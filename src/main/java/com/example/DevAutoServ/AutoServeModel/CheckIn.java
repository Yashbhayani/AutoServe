package com.example.DevAutoServ.AutoServeModel;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "check_ins",
        uniqueConstraints = @UniqueConstraint(name = "uq_checkins_appointment", columnNames = "appointment_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CheckIn {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "arrival_confirmed", nullable = false)
    private Boolean arrivalConfirmed = false;

    @Column(name = "checkin_notes", columnDefinition = "TEXT")
    private String checkinNotes;

    @Column(name = "status_id", nullable = false)
    private Short statusId;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;
}