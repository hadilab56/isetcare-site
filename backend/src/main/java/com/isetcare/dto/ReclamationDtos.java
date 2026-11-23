package com.isetcare.dto;

import com.isetcare.model.*;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** DTO du module Réclamations (étape 2). */
public final class ReclamationDtos {
    private ReclamationDtos() {}

    public record AffectationRequest(@NotNull Long technicienId) {}

    public record PrioriteRequest(@NotNull Priorite priorite) {}

    public record StatutRequest(@NotNull StatutReclamation statut) {}

    public record ReclamationDto(
            Long id, String description, boolean avecPhoto, LocalDateTime dateCreation,
            StatutReclamation statut, Priorite priorite, String categorie,
            Long equipementId, String equipementReference, String equipementLibelle, String salleNom,
            Long declarantId, String declarantNom, Long technicienId, String technicienNom) {

        public static ReclamationDto from(Reclamation r) {
            Equipement e = r.getEquipement();
            Utilisateur d = r.getDeclarant();
            Utilisateur t = r.getTechnicienAffecte();
            return new ReclamationDto(
                    r.getId(), r.getDescription(), r.getPhoto() != null, r.getDateCreation(),
                    r.getStatut(), r.getPriorite(), r.getCategorie(),
                    e.getId(), e.getReference(), join(e.getMarque(), e.getModele()),
                    e.getSalle() == null ? null : e.getSalle().getNom(),
                    d.getId(), join(d.getPrenom(), d.getNom()),
                    t == null ? null : t.getId(), t == null ? null : join(t.getPrenom(), t.getNom()));
        }

        private static String join(String a, String b) {
            return Stream.of(a, b).filter(s -> s != null && !s.isBlank()).collect(Collectors.joining(" "));
        }
    }
}
