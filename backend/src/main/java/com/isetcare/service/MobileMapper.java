package com.isetcare.service;

import com.isetcare.dto.MobileDtos.*;
import com.isetcare.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Conversion entre le modèle du site (PostgreSQL) et celui de l'application Android. */
public final class MobileMapper {
    private MobileMapper() {}

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final Pattern NUMERO = Pattern.compile("#(\\d+)");

    public static long ms(LocalDateTime d) {
        return d == null ? 0 : d.atZone(ZONE).toInstant().toEpochMilli();
    }

    /** Une date sans heure est placée à 9 h. */
    public static long ms(LocalDate d) {
        return d == null ? 0 : d.atTime(9, 0).atZone(ZONE).toInstant().toEpochMilli();
    }

    public static LocalDateTime date(Long ms) {
        return ms == null || ms <= 0 ? LocalDateTime.now() : LocalDateTime.ofInstant(Instant.ofEpochMilli(ms), ZONE);
    }

    private static double num(BigDecimal b) {
        return b == null ? 0 : b.doubleValue();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    // ------------------------------------------------------------ Énumérations

    /** Le site a un seul rôle DECLARANT ; l'application distingue Professeur et Personnel. */
    public static String role(Utilisateur u) {
        if (u.getRole() != Role.DECLARANT) return u.getRole().name();
        String f = RulesClassifier.normaliser(u.getFonction());
        return f.contains("enseign") || f.contains("prof") || f.contains("chef de departement") ? "PROFESSEUR" : "PERSONNEL";
    }

    public static String priorite(Priorite p) {
        if (p == null) return "MOYENNE";
        return switch (p) {
            case BASSE -> "FAIBLE";
            case MOYENNE -> "MOYENNE";
            case HAUTE, URGENTE -> "ELEVEE";
        };
    }

    public static Priorite priorite(String p) {
        if (p == null) return null;
        return switch (p.toUpperCase()) {
            case "FAIBLE", "BASSE" -> Priorite.BASSE;
            case "ELEVEE", "HAUTE" -> Priorite.HAUTE;
            case "URGENTE" -> Priorite.URGENTE;
            default -> Priorite.MOYENNE;
        };
    }

    /** L'application a 3 étapes : Nouveau -> En cours -> Résolu. */
    public static String statut(StatutReclamation s) {
        if (s == null) return "NOUVEAU";
        return switch (s) {
            case NOUVEAU -> "NOUVEAU";
            case AFFECTEE, EN_COURS -> "EN_COURS";
            case RESOLU, CLOTURE -> "RESOLU";
        };
    }

    public static String etat(EtatEquipement e) {
        return e == null || e == EtatEquipement.EN_SERVICE ? "FONCTIONNEL" : e.name();
    }

    // ---------------------------------------------------------------- Entités

    public static UserM user(Utilisateur u) {
        String nom = (nz(u.getPrenom()) + " " + nz(u.getNom())).trim();
        return new UserM(u.getId(), nom, u.getEmail(), role(u), u.getSpecialite());
    }

    public static EquipementM equipement(Equipement e) {
        String type = e.getType() == null ? "Équipement" : e.getType().getLibelle();
        return new EquipementM(e.getId(), e.getReference(), type, type, nz(e.getMarque()), nz(e.getModele()),
                e.getQrCode() != null && !e.getQrCode().isBlank() ? e.getQrCode() : e.getReference(),
                nz(e.getNumeroSerie()), e.getSalle() == null ? "" : e.getSalle().getNom(), etat(e.getEtat()),
                ms(e.getDateAcquisition()), num(e.getPrixAchat()));
    }

    /**
     * @param ints  interventions de cette réclamation (pour les dates d'affectation et de résolution)
     * @param ia    analyse IA enregistrée, ou null
     */
    public static ReclamationM reclamation(Reclamation r, List<Intervention> ints, AnalyseIA ia) {
        long creation = ms(r.getDateCreation());
        long debut = ints.stream().map(Intervention::getDateDebut).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).map(MobileMapper::ms).orElse(creation);
        long fin = ints.stream().map(i -> i.getDateFin() != null ? i.getDateFin() : i.getDateDebut())
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).map(MobileMapper::ms).orElse(creation);
        double confiance = ia != null && ia.getScoreConfiance() != null ? ia.getScoreConfiance() : 0;
        if (confiance > 1) confiance = confiance / 100.0;
        return new ReclamationM(r.getId(), "#" + r.getId(), r.getEquipement().getId(), r.getDeclarant().getId(),
                r.getDescription(), null, "WEB", r.getCategorie() == null ? "Non classée" : r.getCategorie(),
                priorite(r.getPriorite()), confiance, statut(r.getStatut()), creation,
                r.getTechnicienAffecte() == null ? 0 : r.getTechnicienAffecte().getId(), debut, fin);
    }

    public static InterventionM intervention(Intervention i) {
        Reclamation r = i.getReclamation();
        long debut = ms(i.getDateDebut());
        long fin = i.getDateFin() != null ? ms(i.getDateFin()) : debut;
        String res = RulesClassifier.normaliser(i.getResultat());
        boolean resolu = res.contains("resolu") && !res.contains("non resolu");
        return new InterventionM(i.getId(), r.getId(), r.getEquipement().getId(),
                i.getTechnicien() == null ? 0 : i.getTechnicien().getId(), nz(i.getDiagnostic()),
                nz(i.getActionEffectuee()), debut, fin, resolu, num(i.getCout()));
    }

    public static MaintenanceM maintenance(MaintenancePreventive m) {
        Equipement e = m.getEquipement();
        String titre = "Maintenance préventive" + (e.getType() == null ? "" : " · " + e.getType().getLibelle());
        int jours = m.getFrequenceMois() == null ? 0 : m.getFrequenceMois() * 30;
        return new MaintenanceM(m.getId(), e.getId(), m.getTechnicien() == null ? 0 : m.getTechnicien().getId(),
                titre, ms(m.getDatePlanifiee()), jours, 3, true, ms(m.getDateRealisation()), m.getRapport());
    }

    public static NotificationM notification(Notification n) {
        String type = switch (n.getType()) {
            case NOUVELLE_RECLAMATION -> "Nouvelle réclamation";
            case CHANGEMENT_STATUT -> "Statut";
            case RAPPEL_MAINTENANCE -> "Rappel de maintenance";
            case RETARD -> "Retard";
            case PANNES_FREQUENTES -> "Pannes fréquentes";
        };
        // Les messages du site contiennent « #12 » : on retrouve la réclamation concernée.
        Matcher m = NUMERO.matcher(n.getMessage());
        long reclamationId = m.find() ? Long.parseLong(m.group(1)) : 0;
        return new NotificationM(n.getId(), n.getUtilisateur().getId(), type, n.getMessage(), ms(n.getDateEnvoi()),
                reclamationId, 0, n.isLue());
    }
}
