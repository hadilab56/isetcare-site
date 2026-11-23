package com.isetcare.dto;

import com.isetcare.model.Notification;
import com.isetcare.model.TypeNotification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** DTO des notifications (étape 6) et des statistiques du tableau de bord (étape 7). */
public final class NotificationStatsDtos {
    private NotificationStatsDtos() {}

    public record NotificationDto(Long id, TypeNotification type, String message, LocalDateTime dateEnvoi, boolean lue) {
        public static NotificationDto from(Notification n) {
            return new NotificationDto(n.getId(), n.getType(), n.getMessage(), n.getDateEnvoi(), n.isLue());
        }
    }

    public record StatLigne(String libelle, double valeur) {}

    public record StatsDto(
            long nbEquipements, double tauxDisponibilite,
            Map<String, Long> equipementsParEtat, Map<String, Long> reclamationsParStatut,
            long reclamationsOuvertes, long maintenancesEnRetard,
            List<StatLigne> pannesParType, List<StatLigne> coutsParType,
            BigDecimal coutTotal, Double delaiMoyenResolutionHeures) {}
}
