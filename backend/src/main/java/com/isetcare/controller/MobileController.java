package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.InterventionRequest;
import com.isetcare.dto.MaintenanceDtos.RealisationRequest;
import com.isetcare.dto.MobileDtos.*;
import com.isetcare.dto.ReclamationDtos.AffectationRequest;
import com.isetcare.dto.ReclamationDtos.ReclamationDto;
import com.isetcare.dto.ReclamationDtos.StatutRequest;
import com.isetcare.model.*;
import com.isetcare.repository.*;
import com.isetcare.service.InterventionService;
import com.isetcare.service.MobileMapper;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * API de l'application Android : même base PostgreSQL et mêmes règles métier que le site.
 * Les écritures réutilisent les contrôleurs/services du site (notifications, état des équipements,
 * workflow des statuts) : une réclamation créée sur le téléphone apparaît aussitôt sur le site, et inversement.
 */
@RestController
@RequestMapping("/api/mobile")
public class MobileController {

    private final UtilisateurRepository users;
    private final EquipementRepository equipements;
    private final ReclamationRepository reclamations;
    private final InterventionRepository interventions;
    private final MaintenanceRepository maintenances;
    private final NotificationRepository notifications;
    private final AnalyseIARepository analyses;
    private final ReclamationController reclamationController;
    private final MaintenanceController maintenanceController;
    private final NotificationController notificationController;
    private final InterventionService interventionService;

    public MobileController(UtilisateurRepository users, EquipementRepository equipements,
                            ReclamationRepository reclamations, InterventionRepository interventions,
                            MaintenanceRepository maintenances, NotificationRepository notifications,
                            AnalyseIARepository analyses, ReclamationController reclamationController,
                            MaintenanceController maintenanceController, NotificationController notificationController,
                            InterventionService interventionService) {
        this.users = users;
        this.equipements = equipements;
        this.reclamations = reclamations;
        this.interventions = interventions;
        this.maintenances = maintenances;
        this.notifications = notifications;
        this.analyses = analyses;
        this.reclamationController = reclamationController;
        this.maintenanceController = maintenanceController;
        this.notificationController = notificationController;
        this.interventionService = interventionService;
    }

    /** Toutes les données visibles par l'utilisateur connecté, en un seul appel. */
    @GetMapping("/sync")
    @Transactional(readOnly = true)
    public SyncM sync(@AuthenticationPrincipal Utilisateur moi) {
        // Mêmes règles de visibilité que le site (AccessService)
        Long declarantId = moi.getRole() == Role.DECLARANT ? moi.getId() : null;
        Long technicienId = moi.getRole() == Role.TECHNICIEN ? moi.getId() : null;
        List<Reclamation> recs = reclamations.findAll(
                ReclamationRepository.filtres(declarantId, technicienId, null, null, null),
                Sort.by(Sort.Direction.DESC, "dateCreation"));
        Set<Long> ids = recs.stream().map(Reclamation::getId).collect(Collectors.toSet());

        List<Intervention> ints = interventions.findAll().stream()
                .filter(i -> ids.contains(i.getReclamation().getId())).toList();
        Map<Long, List<Intervention>> intsParRec = ints.stream()
                .collect(Collectors.groupingBy(i -> i.getReclamation().getId()));
        Map<Long, AnalyseIA> iaParRec = new HashMap<>();
        for (AnalyseIA a : analyses.findAll()) iaParRec.put(a.getReclamation().getId(), a);

        List<MaintenancePreventive> mps = moi.getRole() == Role.DECLARANT ? List.of()
                : maintenances.findAll().stream()
                        .filter(m -> m.getStatut() != StatutMaintenance.ANNULEE)
                        .filter(m -> moi.getRole() == Role.ADMINISTRATEUR
                                || (m.getTechnicien() != null && m.getTechnicien().getId().equals(moi.getId())))
                        .toList();

        return new SyncM(
                MobileMapper.user(moi),
                users.findAll().stream().filter(Utilisateur::isActif).map(MobileMapper::user).toList(),
                equipements.findAll().stream().map(MobileMapper::equipement).toList(),
                recs.stream().map(r -> MobileMapper.reclamation(r,
                        intsParRec.getOrDefault(r.getId(), List.of()), iaParRec.get(r.getId()))).toList(),
                ints.stream().map(MobileMapper::intervention).toList(),
                mps.stream().map(MobileMapper::maintenance).toList(),
                notifications.findTop50ByUtilisateurIdOrderByDateEnvoiDesc(moi.getId()).stream()
                        .map(MobileMapper::notification).toList());
    }

    /** Signaler une panne (déclarant). La suggestion IA validée dans la pop-up est conservée (AnalyseIA). */
    @PostMapping("/reclamations")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ReclamationM creer(@AuthenticationPrincipal Utilisateur moi, @RequestBody NouvelleReclamation req) {
        if (moi.getRole() != Role.DECLARANT) throw forbidden("Seuls les déclarants peuvent signaler une panne.");
        if (req.equipementId() == null || req.description() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Équipement et description obligatoires.");
        Priorite p = MobileMapper.priorite(req.priorite());
        Float score = req.confiance() == null ? null : req.confiance().floatValue();
        ReclamationDto dto = reclamationController.create(req.equipementId(), req.description(), req.categorie(), p,
                req.categorie(), p, null, score, null, moi);
        Reclamation r = reclamations.findById(dto.id()).orElseThrow();
        return MobileMapper.reclamation(r, List.of(), null);
    }

    /** Affecter un technicien (administrateur). */
    @PutMapping("/reclamations/{id}/affectation")
    @Transactional
    public void affecter(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id, @RequestBody Affectation req) {
        if (moi.getRole() != Role.ADMINISTRATEUR) throw forbidden("Réservé à l'administrateur.");
        if (req.technicienId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technicien obligatoire.");
        reclamationController.affecter(id, new AffectationRequest(req.technicienId()));
    }

    /** Saisir une intervention (technicien affecté). « Résolu » fait passer la réclamation à Résolue. */
    @PostMapping("/interventions")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public void intervention(@AuthenticationPrincipal Utilisateur moi, @RequestBody NouvelleIntervention req) {
        if (moi.getRole() != Role.TECHNICIEN) throw forbidden("Réservé aux techniciens.");
        if (req.reclamationId() == null || req.diagnostic() == null || req.diagnostic().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Diagnostic obligatoire.");
        boolean resolu = Boolean.TRUE.equals(req.resolu());
        interventionService.creer(req.reclamationId(), new InterventionRequest(
                req.diagnostic(), req.action(), MobileMapper.date(req.dateDebut()), LocalDateTime.now(),
                BigDecimal.valueOf(req.cout() == null ? 0 : Math.max(0, req.cout())),
                resolu ? "Résolu" : "Non résolu"), moi);
        if (resolu) reclamationController.changerStatut(req.reclamationId(), new StatutRequest(StatutReclamation.RESOLU), moi);
    }

    /** Clôturer une maintenance préventive (technicien concerné) ; la suivante est planifiée par le site. */
    @PutMapping("/maintenances/{id}/realisation")
    @Transactional
    public void realiser(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id, @RequestBody Realisation req) {
        String rapport = req.rapport() == null || req.rapport().isBlank() ? "Maintenance réalisée." : req.rapport();
        maintenanceController.realiser(id, new RealisationRequest(rapport, null), moi);
    }

    @PutMapping("/notifications/{id}/lue")
    @Transactional
    public void lue(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id) {
        notificationController.marquerLue(id, moi);
    }

    private static ResponseStatusException forbidden(String msg) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, msg);
    }
}
