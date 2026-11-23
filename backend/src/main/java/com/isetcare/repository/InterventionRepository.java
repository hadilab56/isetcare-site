package com.isetcare.repository;

import com.isetcare.model.Intervention;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterventionRepository extends JpaRepository<Intervention, Long> {

    List<Intervention> findByReclamationIdOrderByIdDesc(Long reclamationId);

    /** Toutes les interventions d'un équipement (chemin reclamation.equipement.id). */
    List<Intervention> findByReclamationEquipementIdOrderByIdDesc(Long equipementId);
    List<Intervention> findByReclamationId(Long reclamationId);
    List<Intervention> findByTechnicienId(Long technicienId);

    long countByReclamationId(Long reclamationId);
}
