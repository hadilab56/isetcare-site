package com.isetcare.repository;

import com.isetcare.model.RecommandationRemplacement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommandationRepository extends JpaRepository<RecommandationRemplacement, Long> {

    List<RecommandationRemplacement> findByEquipementIdOrderByIdDesc(Long equipementId);
}
