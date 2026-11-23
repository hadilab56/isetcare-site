package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.InterventionDto;
import com.isetcare.model.Role;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.InterventionRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Toutes les interventions (administrateur) ou les siennes (technicien). */
@RestController
@RequestMapping("/api/interventions")
public class GlobalInterventionController {

    private final InterventionRepository interventions;

    public GlobalInterventionController(InterventionRepository interventions) {
        this.interventions = interventions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<InterventionDto> list(@AuthenticationPrincipal Utilisateur current) {
        var liste = current.getRole() == Role.TECHNICIEN
                ? interventions.findByTechnicienId(current.getId())
                : interventions.findAll(Sort.by(Sort.Direction.DESC, "id"));
        return liste.stream().map(InterventionDto::from).toList();
    }
}
