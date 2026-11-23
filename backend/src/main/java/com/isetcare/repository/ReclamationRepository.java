package com.isetcare.repository;

import com.isetcare.model.Priorite;
import com.isetcare.model.Reclamation;
import com.isetcare.model.StatutReclamation;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public interface ReclamationRepository extends JpaRepository<Reclamation, Long>, JpaSpecificationExecutor<Reclamation> {

    boolean existsByEquipementIdAndStatutIn(Long equipementId, Collection<StatutReclamation> statuts);

    long countByEquipementIdAndDateCreationAfter(Long equipementId, LocalDateTime depuis);

    List<Reclamation> findByEquipementIdOrderByDateCreationDesc(Long equipementId);

    List<Reclamation> findByStatutInAndDateCreationBefore(Collection<StatutReclamation> statuts, LocalDateTime avant);

    /**
     * Filtres dynamiques. declarantId / technicienId servent à limiter la liste selon le rôle
     * de l'utilisateur connecté (déclarant : ses réclamations ; technicien : celles qui lui sont affectées).
     */
    static Specification<Reclamation> filtres(Long declarantId, Long technicienId, StatutReclamation statut,
                                              Priorite priorite, Long equipementId) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                var eq = root.fetch("equipement", JoinType.LEFT);
                eq.fetch("salle", JoinType.LEFT);
                root.fetch("declarant", JoinType.LEFT);
                root.fetch("technicienAffecte", JoinType.LEFT);
            }
            List<Predicate> p = new ArrayList<>();
            if (declarantId != null) p.add(cb.equal(root.get("declarant").get("id"), declarantId));
            if (technicienId != null) p.add(cb.equal(root.get("technicienAffecte").get("id"), technicienId));
            if (statut != null) p.add(cb.equal(root.get("statut"), statut));
            if (priorite != null) p.add(cb.equal(root.get("priorite"), priorite));
            if (equipementId != null) p.add(cb.equal(root.get("equipement").get("id"), equipementId));
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
