package com.isetcare.repository;

import com.isetcare.model.Equipement;
import com.isetcare.model.EtatEquipement;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.ArrayList;
import java.util.List;

public interface EquipementRepository extends JpaRepository<Equipement, Long>, JpaSpecificationExecutor<Equipement> {

    boolean existsByReference(String reference);

    boolean existsBySalleId(Long salleId);

    boolean existsByTypeId(Long typeId);

    /**
     * Recherche dynamique : chaque filtre n'est ajouté que s'il est renseigné.
     * (Évite les requêtes JPQL avec ":param is null", fragiles avec PostgreSQL.)
     */
    static Specification<Equipement> filtres(String q, Long typeId, Long salleId, EtatEquipement etat) {
        return (root, query, cb) -> {
            // Charge salle et type dans la même requête (la relation est LAZY)
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("salle", JoinType.LEFT);
                root.fetch("type", JoinType.LEFT);
            }
            List<Predicate> p = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("reference")), like),
                        cb.like(cb.lower(root.get("marque")), like),
                        cb.like(cb.lower(root.get("modele")), like),
                        cb.like(cb.lower(root.get("numeroSerie")), like)));
            }
            if (typeId != null) p.add(cb.equal(root.get("type").get("id"), typeId));
            if (salleId != null) p.add(cb.equal(root.get("salle").get("id"), salleId));
            if (etat != null) p.add(cb.equal(root.get("etat"), etat));
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
