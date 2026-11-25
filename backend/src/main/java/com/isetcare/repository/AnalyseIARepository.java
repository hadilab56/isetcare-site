package com.isetcare.repository;

import com.isetcare.model.AnalyseIA;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalyseIARepository extends JpaRepository<AnalyseIA, Long> {
    java.util.Optional<AnalyseIA> findByReclamationId(Long reclamationId);
}
