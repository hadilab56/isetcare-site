package com.isetcare.controller;

import com.isetcare.dto.InterventionDtos.InterventionRequest;
import com.isetcare.dto.MaintenanceDtos.RealisationRequest;
import com.isetcare.dto.MobileDtos.*;
import com.isetcare.dto.ReclamationDtos.AffectationRequest;
import com.isetcare.dto.ReclamationDtos.ReclamationDto;
import com.isetcare.dto.ReclamationDtos.StatutRequest;
import com.isetcare.model.*;
import com.isetcare.repository.*;
import com.isetcare.service.EtatSyncService;
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
    private final EtatSyncService etatSync;

    public MobileController(UtilisateurRepository users, EquipementRepository equipements,
                            ReclamationRepository reclamations, InterventionRepository interventions,
                            MaintenanceRepository maintenances, NotificationRepository notifications,
                            AnalyseIARepository analyses, ReclamationController reclamationController,
                            MaintenanceController maintenanceController, NotificationController notificationController,
                            InterventionService interventionService, EtatSyncService etatSync) {
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
        this.etatSync = etatSync;
    }

    /** Toutes les données visibles par l'utilisateur connecté, en un seul appel. */
    @GetMapping("/sync")
    @Transactional(readOnly = true)
    public SyncM sync(@AuthenticationPrincipal Utilisateur moi) {
        List<Reclamation> recs = reclamationsVisibles(moi);
        return new SyncM(
                MobileMapper.user(moi),
                utilisateursActifs(),
                equipements.findAll().stream().map(MobileMapper::equipement).toList(),
                versMobile(recs),
                interventionsDe(recs).stream().map(MobileMapper::intervention).toList(),
                maintenancesVisibles(moi).stream().map(MobileMapper::maintenance).toList(),
                notificationsDe(moi));
    }

    // ------------------------------------------------------------------
    // Lecture entité par entité (GET) — mêmes règles de visibilité que /sync
    // ------------------------------------------------------------------

    @GetMapping("/moi")
    public UserM moi(@AuthenticationPrincipal Utilisateur moi) {
        return MobileMapper.user(moi);
    }

    @GetMapping("/utilisateurs")
    @Transactional(readOnly = true)
    public List<UserM> utilisateurs() {
        return utilisateursActifs();
    }

    @GetMapping("/equipements")
    @Transactional(readOnly = true)
    public List<EquipementM> equipements() {
        return equipements.findAll().stream().map(MobileMapper::equipement).toList();
    }

    @GetMapping("/reclamations")
    @Transactional(readOnly = true)
    public List<ReclamationM> reclamations(@AuthenticationPrincipal Utilisateur moi) {
        return versMobile(reclamationsVisibles(moi));
    }

    @GetMapping("/reclamations/{id}")
    @Transactional(readOnly = true)
    public ReclamationM reclamation(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id) {
        return versMobile(List.of(reclamationVisible(moi, id))).get(0);
    }

    @GetMapping("/interventions")
    @Transactional(readOnly = true)
    public List<InterventionM> interventions(@AuthenticationPrincipal Utilisateur moi) {
        return interventionsDe(reclamationsVisibles(moi)).stream().map(MobileMapper::intervention).toList();
    }

    @GetMapping("/maintenances")
    @Transactional(readOnly = true)
    public List<MaintenanceM> maintenances(@AuthenticationPrincipal Utilisateur moi) {
        return maintenancesVisibles(moi).stream().map(MobileMapper::maintenance).toList();
    }

    @GetMapping("/notifications")
    @Transactional(readOnly = true)
    public List<NotificationM> notifications(@AuthenticationPrincipal Utilisateur moi) {
        return notificationsDe(moi);
    }

    // ------------------------------------------------------------------
    // Modification (PUT) et suppression (DELETE)
    // ------------------------------------------------------------------

    /** Le déclarant corrige la description de SA réclamation tant qu'elle n'est pas prise en charge. */
    @PutMapping("/reclamations/{id}")
    @Transactional
    public ReclamationM modifier(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id,
                                 @RequestBody ModificationReclamation req) {
        Reclamation r = reclamationModifiable(moi, id);
        String desc = req.description() == null ? "" : req.description().trim();
        if (desc.length() < 10)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Décrivez la panne en au moins 10 caractères.");
        if (desc.length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description trop longue (2000 caractères maximum).");
        r.setDescription(desc);
        if (req.categorie() != null && !req.categorie().isBlank()) r.setCategorie(req.categorie().trim());
        Priorite p = MobileMapper.priorite(req.priorite());
        if (p != null) r.setPriorite(p);
        return versMobile(List.of(reclamations.save(r))).get(0);
    }

    /** Le déclarant (ou l'administrateur) retire une réclamation encore « Nouveau ». */
    @DeleteMapping("/reclamations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void supprimer(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id) {
        Reclamation r = reclamationModifiable(moi, id);
        if (!interventions.findByReclamationId(id).isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Une intervention existe déjà : suppression impossible.");
        analyses.findByReclamationId(id).ifPresent(analyses::delete);
        Equipement eq = r.getEquipement();
        reclamations.delete(r);
        reclamations.flush();
        etatSync.synchroniser(eq);
    }

    /** Chacun peut supprimer SES notifications. */
    @DeleteMapping("/notifications/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void supprimerNotification(@AuthenticationPrincipal Utilisateur moi, @PathVariable Long id) {
        Notification n = notifications.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable."));
        if (!n.getUtilisateur().getId().equals(moi.getId())) throw forbidden("Cette notification ne vous appartient pas.");
        notifications.delete(n);
    }

    // ------------------------------------------------------------------ Outils

    /** Mêmes règles de visibilité que le site (AccessService). */
    private List<Reclamation> reclamationsVisibles(Utilisateur moi) {
        Long declarantId = moi.getRole() == Role.DECLARANT ? moi.getId() : null;
        Long technicienId = moi.getRole() == Role.TECHNICIEN ? moi.getId() : null;
        return reclamations.findAll(
                ReclamationRepository.filtres(declarantId, technicienId, null, null, null),
                Sort.by(Sort.Direction.DESC, "dateCreation"));
    }

    private Reclamation reclamationVisible(Utilisateur moi, Long id) {
        Reclamation r = reclamations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réclamation introuvable."));
        boolean visible = moi.getRole() == Role.ADMINISTRATEUR
                || (moi.getRole() == Role.DECLARANT && r.getDeclarant().getId().equals(moi.getId()))
                || (moi.getRole() == Role.TECHNICIEN && r.getTechnicienAffecte() != null
                        && r.getTechnicienAffecte().getId().equals(moi.getId()));
        if (!visible) throw forbidden("Cette réclamation ne vous est pas accessible.");
        return r;
    }

    /** Modifier / supprimer : auteur (ou admin), et seulement au statut « Nouveau ». */
    private Reclamation reclamationModifiable(Utilisateur moi, Long id) {
        Reclamation r = reclamationVisible(moi, id);
        if (moi.getRole() == Role.TECHNICIEN) throw forbidden("Réservé au déclarant ou à l'administrateur.");
        if (r.getStatut() != StatutReclamation.NOUVEAU)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La réclamation est déjà prise en charge : elle ne peut plus être modifiée.");
        return r;
    }

    private List<Intervention> interventionsDe(List<Reclamation> recs) {
        Set<Long> ids = recs.stream().map(Reclamation::getId).collect(Collectors.toSet());
        return interventions.findAll().stream().filter(i -> ids.contains(i.getReclamation().getId())).toList();
    }

    private List<ReclamationM> versMobile(List<Reclamation> recs) {
        Map<Long, List<Intervention>> intsParRec = interventionsDe(recs).stream()
                .collect(Collectors.groupingBy(i -> i.getReclamation().getId()));
        Map<Long, AnalyseIA> iaParRec = new HashMap<>();
        for (AnalyseIA a : analyses.findAll()) iaParRec.put(a.getReclamation().getId(), a);
        return recs.stream().map(r -> MobileMapper.reclamation(r,
                intsParRec.getOrDefault(r.getId(), List.of()), iaParRec.get(r.getId()))).toList();
    }

    private List<MaintenancePreventive> maintenancesVisibles(Utilisateur moi) {
        if (moi.getRole() == Role.DECLARANT) return List.of();
        return maintenances.findAll().stream()
                .filter(m -> m.getStatut() != StatutMaintenance.ANNULEE)
                .filter(m -> moi.getRole() == Role.ADMINISTRATEUR
                        || (m.getTechnicien() != null && m.getTechnicien().getId().equals(moi.getId())))
                .toList();
    }

    private List<UserM> utilisateursActifs() {
        return users.findAll().stream().filter(Utilisateur::isActif).map(MobileMapper::user).toList();
    }

    private List<NotificationM> notificationsDe(Utilisateur moi) {
        return notifications.findTop50ByUtilisateurIdOrderByDateEnvoiDesc(moi.getId()).stream()
                .map(MobileMapper::notification).toList();
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
