package com.isetcare.dto;

import com.isetcare.model.Equipement;
import com.isetcare.model.EtatEquipement;
import com.isetcare.model.Salle;
import com.isetcare.model.TypeEquipement;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO du module Matériel (étape 1).
 * "Request" = ce que le site envoie ; "Dto" = ce que l'API renvoie.
 * On n'expose jamais les entités JPA directement (évite les boucles et les champs internes).
 */
public final class MaterielDtos {
    private MaterielDtos() {}

    // ---------- Salles ----------
    public record SalleRequest(
            @NotBlank @Size(max = 80) String nom,
            @Size(max = 255) String batiment,
            Integer etage) {}

    public record SalleDto(Long id, String nom, String batiment, Integer etage) {
        public static SalleDto from(Salle s) {
            return new SalleDto(s.getId(), s.getNom(), s.getBatiment(), s.getEtage());
        }
    }

    // ---------- Types d'équipement ----------
    public record TypeRequest(
            @NotBlank @Size(max = 80) String libelle,
            @Positive Integer frequenceMaintenanceMois,
            @Positive Integer dureeVieEstimeeMois) {}

    public record TypeDto(Long id, String libelle, Integer frequenceMaintenanceMois, Integer dureeVieEstimeeMois) {
        public static TypeDto from(TypeEquipement t) {
            return new TypeDto(t.getId(), t.getLibelle(), t.getFrequenceMaintenanceMois(), t.getDureeVieEstimeeMois());
        }
    }

    // ---------- Équipements ----------
    public record EquipementRequest(
            @NotBlank @Size(max = 60) String reference,
            String marque,
            String modele,
            String numeroSerie,
            @PastOrPresent LocalDate dateAcquisition,
            @PositiveOrZero BigDecimal prixAchat,
            EtatEquipement etat,
            @NotNull Long salleId,
            @NotNull Long typeId) {}

    public record EtatRequest(@NotNull EtatEquipement etat) {}

    public record EquipementDto(
            Long id, String reference, String marque, String modele, String numeroSerie,
            LocalDate dateAcquisition, BigDecimal prixAchat, EtatEquipement etat, String qrCode,
            Long salleId, String salleNom, Long typeId, String typeLibelle) {

        /** Contenu du QR code : "ISETCARE:<reference>". */
        public static String qrContent(String reference) {
            return "ISETCARE:" + reference;
        }

        public static EquipementDto from(Equipement e) {
            Salle s = e.getSalle();
            TypeEquipement t = e.getType();
            // Si qrCode est vide en base (ex. équipement créé par le DataSeeder), on le recalcule.
            String qr = e.getQrCode() != null ? e.getQrCode() : qrContent(e.getReference());
            return new EquipementDto(
                    e.getId(), e.getReference(), e.getMarque(), e.getModele(), e.getNumeroSerie(),
                    e.getDateAcquisition(), e.getPrixAchat(), e.getEtat(), qr,
                    s == null ? null : s.getId(), s == null ? null : s.getNom(),
                    t == null ? null : t.getId(), t == null ? null : t.getLibelle());
        }
    }
}
