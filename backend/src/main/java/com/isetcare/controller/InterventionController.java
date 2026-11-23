package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.InterventionDto;
import com.isetcare.dto.InterventionDtos.InterventionRequest;
import com.isetcare.model.Utilisateur;
import com.isetcare.service.InterventionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Interventions d'une réclamation.
 * Renvoie des DTO (et non les entités JPA) : évite les erreurs de sérialisation des relations LAZY
 * et n'expose jamais les données sensibles des utilisateurs (mot de passe chiffré...).
 */
@RestController
@RequestMapping("/api/reclamations")
public class InterventionController {

    private final InterventionService service;

    public InterventionController(InterventionService service) {
        this.service = service;
    }

    @GetMapping("/{id}/interventions")
    @Transactional(readOnly = true)
    public List<InterventionDto> list(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        return service.parReclamation(id, current).stream().map(InterventionDto::from).toList();
    }

    @PostMapping("/{id}/interventions")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public InterventionDto create(@PathVariable Long id, @Valid @RequestBody InterventionRequest req,
                                  @AuthenticationPrincipal Utilisateur current) {
        return InterventionDto.from(service.creer(id, req, current));
    }
}
