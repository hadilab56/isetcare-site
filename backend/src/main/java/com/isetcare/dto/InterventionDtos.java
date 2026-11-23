package com.isetcare.dto;

import com.isetcare.model.Decision;
import com.isetcare.model.Intervention;
import com.isetcare.model.RecommandationRemplacement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** DTO des interventions, de l'historique d'un équipement et des décisions de remplacement (étapes 4 et 7). */
public final class InterventionDtos {
    private InterventionDtos() {}

    public record InterventionRequest(
            @NotBlank @Size(max = 4000) String diagnostic,
            @Size(max = 4000) String actionEffectuee,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            @PositiveOrZero BigDecimal cout,
            @Size(max = 255) String resultat) {}

    public record InterventionDto(
            Long id, Long reclamationId, String equipementReference, String diagnostic, String actionEffectuee,
            LocalDateTime dateDebut, LocalDateTime dateFin, Long dureeMinutes, BigDecimal cout, String resultat,
            Long technicienId, String technicienNom) {

        public static InterventionDto from(Intervention i) {
            var t = i.getTechnicien();
            Long duree = i.getDateDebut() != null && i.getDateFin() != null
                    ? Duration.between(i.getDateDebut(), i.getDateFin()).toMinutes() : null;
            return new InterventionDto(
                    i.getId(), i.getReclamation().getId(), i.getReclamation().getEquipement().getReference(),
                    i.getDiagnostic(), i.getActionEffectuee(), i.getDateDebut(), i.getDateFin(), duree,
                    i.getCout(), i.getResultat(),
                    t == null ? null : t.getId(),
                    t == null ? null : Stream.of(t.getPrenom(), t.getNom()).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(" ")));
        }
    }

    /** Synthèse d'un équipement : base de l'historique (US09) et de la recommandation de remplacement (US33). */
    public record HistoriqueDto(
            Long equipementId, String reference, BigDecimal prixAchat,
            int nbPannes, int nbInterventions, BigDecimal coutCumule, int dureeIndisponibiliteJours,
            List<ReclamationDtos.ReclamationDto> reclamations, List<InterventionDto> interventions) {}

    public record DecisionRequest(@NotNull Decision decision, @PositiveOrZero BigDecimal coutRemplacementEstime) {}

    public record DecisionDto(
            Long id, Decision decision, Integer nbPannes, Integer nbInterventions,
            BigDecimal coutCumuleReparations, BigDecimal coutRemplacementEstime,
            Integer dureeIndisponibiliteJours, LocalDate dateAnalyse) {

        public static DecisionDto from(RecommandationRemplacement r) {
            return new DecisionDto(r.getId(), r.getDecision(), r.getNbPannes(), r.getNbInterventions(),
                    r.getCoutCumuleReparations(), r.getCoutRemplacementEstime(),
                    r.getDureeIndisponibiliteJours(), r.getDateAnalyse());
        }
    }
}
