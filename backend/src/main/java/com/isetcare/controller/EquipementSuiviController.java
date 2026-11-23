package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.*;
import com.isetcare.dto.ReclamationDtos.ReclamationDto;
import com.isetcare.model.*;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.repository.RecommandationRepository;
import com.isetcare.repository.ReclamationRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Suivi d'un équipement : historique des pannes et interventions avec coût cumulé (US09, US20),
 * et décisions réparer / remplacer (US33, US34).
 * Historique : administrateur et technicien. Décisions : administrateur (voir SecurityConfig).
 */
@RestController
@RequestMapping("/api/equipements/{id}")
public class EquipementSuiviController {
    private final EquipementRepository equipements;
    private final ReclamationRepository reclamations;
    private final InterventionRepository interventions;
    private final RecommandationRepository recommandations;

    public EquipementSuiviController(EquipementRepository equipements, ReclamationRepository reclamations,
                                     InterventionRepository interventions, RecommandationRepository recommandations) {
        this.equipements = equipements;
        this.reclamations = reclamations;
        this.interventions = interventions;
        this.recommandations = recommandations;
    }

    @GetMapping("/historique")
    @Transactional(readOnly = true)
    public HistoriqueDto historique(@PathVariable Long id) {
        return calculer(find(id));
    }

    @GetMapping("/decisions")
    @Transactional(readOnly = true)
    public List<DecisionDto> decisions(@PathVariable Long id) {
        find(id);
        return recommandations.findByEquipementIdOrderByIdDesc(id).stream().map(DecisionDto::from).toList();
    }

    /** US34 : l'administrateur enregistre sa décision, avec une photographie des chiffres du moment. */
    @PostMapping("/decisions")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public DecisionDto decider(@PathVariable Long id, @Valid @RequestBody DecisionRequest req) {
        if (req.decision() == Decision.EN_ATTENTE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez « Réparer » ou « Remplacer ».");
        Equipement e = find(id);
        HistoriqueDto h = calculer(e);
        RecommandationRemplacement r = new RecommandationRemplacement();
        r.setEquipement(e);
        r.setNbPannes(h.nbPannes());
        r.setNbInterventions(h.nbInterventions());
        r.setCoutCumuleReparations(h.coutCumule());
        r.setCoutRemplacementEstime(req.coutRemplacementEstime() != null ? req.coutRemplacementEstime() : e.getPrixAchat());
        r.setDureeIndisponibiliteJours(h.dureeIndisponibiliteJours());
        r.setDecision(req.decision());
        return DecisionDto.from(recommandations.save(r));
    }

    private Equipement find(Long id) {
        return equipements.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Équipement introuvable."));
    }

    private HistoriqueDto calculer(Equipement e) {
        List<Reclamation> recs = reclamations.findByEquipementIdOrderByDateCreationDesc(e.getId());
        List<Intervention> ints = interventions.findByReclamationEquipementIdOrderByIdDesc(e.getId());
        BigDecimal cout = ints.stream().map(Intervention::getCout).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Durée d'indisponibilité : pour chaque panne, du dépôt de la réclamation à la dernière fin d'intervention
        long heures = 0;
        for (Reclamation r : recs) {
            LocalDateTime fin = ints.stream()
                    .filter(i -> i.getReclamation().getId().equals(r.getId()))
                    .map(Intervention::getDateFin).filter(Objects::nonNull)
                    .max(Comparator.naturalOrder()).orElse(null);
            if (fin != null && fin.isAfter(r.getDateCreation()))
                heures += Duration.between(r.getDateCreation(), fin).toHours();
        }
        return new HistoriqueDto(
                e.getId(), e.getReference(), e.getPrixAchat(), recs.size(), ints.size(), cout,
                (int) Math.ceil(heures / 24.0),
                recs.stream().map(ReclamationDto::from).toList(),
                ints.stream().map(InterventionDto::from).toList());
    }
}
