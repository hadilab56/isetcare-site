package com.isetcare.service;

import com.isetcare.model.*;
import com.isetcare.repository.MaintenanceRepository;
import com.isetcare.repository.ReclamationRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Tâche automatique (toutes les heures, et 20 s après le démarrage) :
 * - marque les maintenances dépassées EN_RETARD ;
 * - rappelle au technicien les maintenances des 3 prochains jours (US28) ;
 * - alerte l'administrateur des retards (US29) : maintenances en retard et réclamations non résolues depuis plus de 7 jours.
 */
@Component
public class MaintenanceScheduler {
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final MaintenanceRepository maintenances;
    private final ReclamationRepository reclamations;
    private final NotificationService notifications;

    public MaintenanceScheduler(MaintenanceRepository maintenances, ReclamationRepository reclamations,
                                NotificationService notifications) {
        this.maintenances = maintenances;
        this.reclamations = reclamations;
        this.notifications = notifications;
    }

    @Scheduled(initialDelay = 20_000, fixedDelay = 3_600_000)
    @Transactional
    public void verifier() {
        LocalDate today = LocalDate.now();
        maintenances.marquerEnRetard(today, StatutMaintenance.EN_RETARD, StatutMaintenance.PLANIFIEE);

        for (MaintenancePreventive m : maintenances.findByStatutAndDatePlanifieeBetween(
                StatutMaintenance.PLANIFIEE, today, today.plusDays(3))) {
            notifications.notifierUneFois(m.getTechnicien(), TypeNotification.RAPPEL_MAINTENANCE,
                    "Rappel : maintenance préventive de " + m.getEquipement().getReference()
                            + " prévue le " + m.getDatePlanifiee().format(FR) + ".");
        }

        for (MaintenancePreventive m : maintenances.findByStatut(StatutMaintenance.EN_RETARD)) {
            notifications.notifierAdminsUneFois(TypeNotification.RETARD,
                    "Maintenance en retard : " + m.getEquipement().getReference()
                            + " (prévue le " + m.getDatePlanifiee().format(FR) + ").");
        }

        for (Reclamation r : reclamations.findByStatutInAndDateCreationBefore(
                List.of(StatutReclamation.NOUVEAU, StatutReclamation.AFFECTEE, StatutReclamation.EN_COURS),
                LocalDateTime.now().minusDays(7))) {
            notifications.notifierAdminsUneFois(TypeNotification.RETARD,
                    "Réclamation #" + r.getId() + " (" + r.getEquipement().getReference()
                            + ") non résolue depuis plus de 7 jours.");
        }
    }
}
