package com.isetcare.repository;

import com.isetcare.model.MaintenancePreventive;
import com.isetcare.model.StatutMaintenance;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public interface MaintenanceRepository extends JpaRepository<MaintenancePreventive, Long>, JpaSpecificationExecutor<MaintenancePreventive> {

    /** Passe en EN_RETARD les maintenances planifiées dont la date est dépassée. Appeler dans une transaction. */
    @Modifying
    @Query("update MaintenancePreventive m set m.statut = :retard where m.statut = :planifiee and m.datePlanifiee < :today")
    int marquerEnRetard(@Param("today") LocalDate today,
                        @Param("retard") StatutMaintenance retard,
                        @Param("planifiee") StatutMaintenance planifiee);

    List<MaintenancePreventive> findByStatutAndDatePlanifieeBetween(StatutMaintenance statut, LocalDate du, LocalDate au);

    List<MaintenancePreventive> findByStatut(StatutMaintenance statut);

    long countByStatut(StatutMaintenance statut);

    static Specification<MaintenancePreventive> filtres(Long technicienId, StatutMaintenance statut, Long equipementId) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                var eq = root.fetch("equipement", JoinType.LEFT);
                eq.fetch("salle", JoinType.LEFT);
                root.fetch("technicien", JoinType.LEFT);
            }
            List<Predicate> p = new ArrayList<>();
            if (technicienId != null) p.add(cb.equal(root.get("technicien").get("id"), technicienId));
            if (statut != null) p.add(cb.equal(root.get("statut"), statut));
            if (equipementId != null) p.add(cb.equal(root.get("equipement").get("id"), equipementId));
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
