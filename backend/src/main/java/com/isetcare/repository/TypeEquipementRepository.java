package com.isetcare.repository;

import com.isetcare.model.TypeEquipement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TypeEquipementRepository extends JpaRepository<TypeEquipement, Long> {

    boolean existsByLibelleIgnoreCase(String libelle);

    boolean existsByLibelleIgnoreCaseAndIdNot(String libelle, Long id);
}
