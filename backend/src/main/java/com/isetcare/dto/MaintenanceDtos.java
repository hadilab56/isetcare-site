package com.isetcare.dto;

import com.isetcare.model.MaintenancePreventive;
import com.isetcare.model.StatutMaintenance;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** DTO de la maintenance préventive (étape 5). */
public final class MaintenanceDtos {
    private MaintenanceDtos() {}

    public record MaintenanceRequest(
            @NotNull Long equipementId,
            @NotNull Long technicienId,
            @NotNull @FutureOrPresent(message = "La date doit être aujourd'hui ou dans le futur") LocalDate datePlanifiee) {}

    public record RealisationRequest(
            @NotBlank @Size(max = 4000) String rapport,
            @PastOrPresent LocalDate dateRealisation) {}

    public record MaintenanceDto(
            Long id, Long equipementId, String equipementReference, String equipementLibelle, String salleNom,
            Long technicienId, String technicienNom, LocalDate datePlanifiee, LocalDate dateRealisation,
            Integer frequenceMois, StatutMaintenance statut, String rapport) {

        public static MaintenanceDto from(MaintenancePreventive m) {
            var e = m.getEquipement();
            var t = m.getTechnicien();
            return new MaintenanceDto(
                    m.getId(), e.getId(), e.getReference(),
                    Stream.of(e.getMarque(), e.getModele()).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(" ")),
                    e.getSalle() == null ? null : e.getSalle().getNom(),
                    t == null ? null : t.getId(),
                    t == null ? null : Stream.of(t.getPrenom(), t.getNom()).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(" ")),
                    m.getDatePlanifiee(), m.getDateRealisation(), m.getFrequenceMois(), m.getStatut(), m.getRapport());
        }
    }
}
