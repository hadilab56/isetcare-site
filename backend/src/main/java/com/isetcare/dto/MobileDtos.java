package com.isetcare.dto;

import java.util.List;

/**
 * Objets échangés avec l'application Android (mêmes noms de champs que ses classes model/).
 * Dates en millisecondes, énumérations avec les noms de l'application. Aucun mot de passe.
 */
public final class MobileDtos {
    private MobileDtos() {}

    public record UserM(long id, String nom, String email, String role, String specialite) {}

    public record EquipementM(long id, String code, String nom, String type, String marque, String modele,
                              String inventaire, String numeroSerie, String salle, String etat,
                              long dateAcquisition, double coutAcquisition) {}

    public record ReclamationM(long id, String numero, long equipementId, long demandeurId, String description,
                               String photoUri, String canal, String categorie, String priorite, double confiance,
                               String statut, long dateCreation, long technicienId, long dateAffectation,
                               long dateResolution) {}

    public record InterventionM(long id, long reclamationId, long equipementId, long technicienId,
                                String diagnostic, String action, long dateDebut, long dateFin,
                                boolean resolu, double cout) {}

    public record MaintenanceM(long id, long equipementId, long technicienId, String titre, long datePlanifiee,
                               int periodiciteJours, int rappelAvantJours, boolean rappelEnvoye,
                               long dateRealisation, String rapport) {}

    public record NotificationM(long id, long utilisateurId, String type, String message, long date,
                                long reclamationId, long equipementId, boolean lu) {}

    public record SyncM(UserM moi, List<UserM> utilisateurs, List<EquipementM> equipements,
                        List<ReclamationM> reclamations, List<InterventionM> interventions,
                        List<MaintenanceM> maintenances, List<NotificationM> notifications) {}

    public record NouvelleReclamation(Long equipementId, String description, String photoUri,
                                      String categorie, String priorite, Double confiance) {}

    public record Affectation(Long technicienId) {}

    public record NouvelleIntervention(Long reclamationId, String diagnostic, String action, Double cout,
                                       Boolean resolu, Long dateDebut) {}

    public record Realisation(String rapport) {}

    public record ModificationReclamation(String description, String categorie, String priorite) {}
}
