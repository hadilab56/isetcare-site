package com.isetcare.controller;

import com.isetcare.dto.NotificationStatsDtos.StatLigne;
import com.isetcare.dto.NotificationStatsDtos.StatsDto;
import com.isetcare.model.*;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.repository.MaintenanceRepository;
import com.isetcare.repository.ReclamationRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Statistiques du tableau de bord (US35) : administrateur uniquement.
 * Calculées en Java à partir des données (volumes d'un établissement : quelques milliers de lignes au plus).
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {
    private final EquipementRepository equipements;
    private final ReclamationRepository reclamations;
    private final InterventionRepository interventions;
    private final MaintenanceRepository maintenances;

    public StatsController(EquipementRepository equipements, ReclamationRepository reclamations,
                           InterventionRepository interventions, MaintenanceRepository maintenances) {
        this.equipements = equipements;
        this.reclamations = reclamations;
        this.interventions = interventions;
        this.maintenances = maintenances;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public StatsDto stats() {
        List<Equipement> eqs = equipements.findAll();
        List<Reclamation> recs = reclamations.findAll();
        List<Intervention> ints = interventions.findAll();

        Map<String, Long> parEtat = new LinkedHashMap<>();
        for (EtatEquipement s : EtatEquipement.values()) parEtat.put(s.name(), 0L);
        eqs.forEach(e -> parEtat.merge(e.getEtat().name(), 1L, Long::sum));
        double dispo = eqs.isEmpty() ? 0 : 100.0 * parEtat.get(EtatEquipement.EN_SERVICE.name()) / eqs.size();

        Map<String, Long> parStatut = new LinkedHashMap<>();
        for (StatutReclamation s : StatutReclamation.values()) parStatut.put(s.name(), 0L);
        recs.forEach(r -> parStatut.merge(r.getStatut().name(), 1L, Long::sum));
        long ouvertes = recs.stream().filter(r -> r.getStatut() != StatutReclamation.CLOTURE
                && r.getStatut() != StatutReclamation.RESOLU).count();

        Map<String, Double> pannes = new TreeMap<>();
        recs.forEach(r -> pannes.merge(typeDe(r.getEquipement()), 1.0, Double::sum));
        Map<String, Double> couts = new TreeMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Intervention i : ints) {
            if (i.getCout() == null) continue;
            total = total.add(i.getCout());
            couts.merge(typeDe(i.getReclamation().getEquipement()), i.getCout().doubleValue(), Double::sum);
        }

        // Délai moyen de résolution : du dépôt de la réclamation à la dernière fin d'intervention (réclamations résolues/clôturées)
        List<Long> delais = new ArrayList<>();
        for (Reclamation r : recs) {
            if (r.getStatut() != StatutReclamation.RESOLU && r.getStatut() != StatutReclamation.CLOTURE) continue;
            ints.stream().filter(i -> i.getReclamation().getId().equals(r.getId()))
                    .map(Intervention::getDateFin).filter(Objects::nonNull).max(Comparator.naturalOrder())
                    .filter(fin -> fin.isAfter(r.getDateCreation()))
                    .ifPresent(fin -> delais.add(Duration.between(r.getDateCreation(), fin).toMinutes()));
        }
        Double delaiMoyen = delais.isEmpty() ? null
                : Math.round(delais.stream().mapToLong(Long::longValue).average().orElse(0) / 6.0) / 10.0; // heures, 1 décimale

        long retard = maintenances.countByStatut(StatutMaintenance.EN_RETARD)
                + maintenances.findByStatut(StatutMaintenance.PLANIFIEE).stream()
                        .filter(m -> m.getDatePlanifiee().isBefore(LocalDate.now())).count();

        return new StatsDto(eqs.size(), Math.round(dispo * 10) / 10.0, parEtat, parStatut, ouvertes, retard,
                lignes(pannes), lignes(couts), total, delaiMoyen);
    }

    private static String typeDe(Equipement e) {
        return e.getType() == null ? "Sans type" : e.getType().getLibelle();
    }

    private static List<StatLigne> lignes(Map<String, Double> m) {
        return m.entrySet().stream().map(x -> new StatLigne(x.getKey(), Math.round(x.getValue() * 100) / 100.0)).toList();
    }
}
