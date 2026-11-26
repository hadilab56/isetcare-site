package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.InterventionDto;
import com.isetcare.dto.InterventionDtos.InterventionRequest;
import com.isetcare.model.Intervention;
import com.isetcare.model.Role;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.service.EtatSyncService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

/** Toutes les interventions (administrateur) ou les siennes (technicien) ; correction par l'administrateur. */
@RestController
@RequestMapping("/api/interventions")
public class GlobalInterventionController {

    private final InterventionRepository interventions;
    private final EtatSyncService etatSync;

    public GlobalInterventionController(InterventionRepository interventions, EtatSyncService etatSync) {
        this.interventions = interventions;
        this.etatSync = etatSync;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<InterventionDto> list(@AuthenticationPrincipal Utilisateur current) {
        var liste = current.getRole() == Role.TECHNICIEN
                ? interventions.findByTechnicienId(current.getId())
                : interventions.findAll(Sort.by(Sort.Direction.DESC, "id"));
        return liste.stream().map(InterventionDto::from).toList();
    }

    /** Corriger une intervention saisie par erreur (administrateur). */
    @PutMapping("/{id}")
    @Transactional
    public InterventionDto modifier(@PathVariable Long id, @Valid @RequestBody InterventionRequest req) {
        Intervention i = find(id);
        if (req.dateDebut() != null && req.dateFin() != null && req.dateFin().isBefore(req.dateDebut()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de fin doit être après la date de début.");
        i.setDiagnostic(req.diagnostic().trim());
        i.setActionEffectuee(req.actionEffectuee() == null ? null : req.actionEffectuee().trim());
        if (req.dateDebut() != null) i.setDateDebut(req.dateDebut());
        i.setDateFin(req.dateFin());
        i.setCout(req.cout() != null ? req.cout() : BigDecimal.ZERO);
        i.setResultat(req.resultat());
        return InterventionDto.from(interventions.save(i));
    }

    /** Supprimer une intervention (administrateur). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void supprimer(@PathVariable Long id) {
        Intervention i = find(id);
        var equipement = i.getReclamation().getEquipement();
        interventions.delete(i);
        interventions.flush();
        etatSync.synchroniser(equipement);
    }

    private Intervention find(Long id) {
        return interventions.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Intervention introuvable."));
    }
}
