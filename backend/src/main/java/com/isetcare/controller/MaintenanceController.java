package com.isetcare.controller;

import com.isetcare.dto.MaintenanceDtos.MaintenanceDto;
import com.isetcare.dto.MaintenanceDtos.MaintenanceRequest;
import com.isetcare.dto.MaintenanceDtos.RealisationRequest;
import com.isetcare.model.*;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.MaintenanceRepository;
import com.isetcare.repository.UtilisateurRepository;
import com.isetcare.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Maintenance préventive (US21 à US25).
 * Lecture : administrateur et technicien (le technicien ne voit que les siennes).
 * Planification, modification, annulation : administrateur. Réalisation : technicien affecté.
 */
@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final MaintenanceRepository maintenances;
    private final EquipementRepository equipements;
    private final UtilisateurRepository users;
    private final NotificationService notifications;

    public MaintenanceController(MaintenanceRepository maintenances, EquipementRepository equipements,
                                 UtilisateurRepository users, NotificationService notifications) {
        this.maintenances = maintenances;
        this.equipements = equipements;
        this.users = users;
        this.notifications = notifications;
    }

    /** Liste (US24 : sert aussi au calendrier). Met d'abord à jour les retards. */
    @GetMapping
    @Transactional
    public List<MaintenanceDto> list(@RequestParam(required = false) StatutMaintenance statut,
                                     @RequestParam(required = false) Long equipementId,
                                     @AuthenticationPrincipal Utilisateur current) {
        maintenances.marquerEnRetard(LocalDate.now(), StatutMaintenance.EN_RETARD, StatutMaintenance.PLANIFIEE);
        Long technicienId = current.getRole() == Role.TECHNICIEN ? current.getId() : null;
        return maintenances.findAll(MaintenanceRepository.filtres(technicienId, statut, equipementId), Sort.by("datePlanifiee"))
                .stream().map(MaintenanceDto::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public MaintenanceDto get(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        MaintenancePreventive m = find(id);
        verifierAcces(m, current);
        return MaintenanceDto.from(m);
    }

    /** US22 : planifier une maintenance et l'affecter à un technicien (administrateur). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public MaintenanceDto create(@Valid @RequestBody MaintenanceRequest req) {
        Equipement e = equipements.findById(req.equipementId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Équipement introuvable."));
        Utilisateur tech = technicien(req.technicienId());
        MaintenancePreventive m = new MaintenancePreventive();
        m.setEquipement(e);
        m.setTechnicien(tech);
        m.setDatePlanifiee(req.datePlanifiee());
        // US21 : la fréquence vient du type d'équipement
        m.setFrequenceMois(e.getType() != null ? e.getType().getFrequenceMaintenanceMois() : null);
        MaintenancePreventive saved = maintenances.save(m);
        notifications.notifier(tech, TypeNotification.RAPPEL_MAINTENANCE,
                "Maintenance préventive planifiée : " + e.getReference() + " le " + saved.getDatePlanifiee().format(FR) + ".");
        return MaintenanceDto.from(saved);
    }

    /** Replanifier ou changer de technicien (administrateur), tant que la maintenance n'est pas réalisée ou annulée. */
    @PutMapping("/{id}")
    @Transactional
    public MaintenanceDto update(@PathVariable Long id, @Valid @RequestBody MaintenanceRequest req) {
        MaintenancePreventive m = find(id);
        if (m.getStatut() == StatutMaintenance.REALISEE || m.getStatut() == StatutMaintenance.ANNULEE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette maintenance est déjà réalisée ou annulée.");
        Utilisateur tech = technicien(req.technicienId());
        boolean technicienChange = m.getTechnicien() == null || !m.getTechnicien().getId().equals(tech.getId());
        m.setTechnicien(tech);
        m.setDatePlanifiee(req.datePlanifiee());
        m.setStatut(StatutMaintenance.PLANIFIEE); // la date est >= aujourd'hui (validation) : plus en retard
        MaintenancePreventive saved = maintenances.save(m);
        if (technicienChange)
            notifications.notifier(tech, TypeNotification.RAPPEL_MAINTENANCE,
                    "Maintenance préventive planifiée : " + m.getEquipement().getReference() + " le " + saved.getDatePlanifiee().format(FR) + ".");
        return MaintenanceDto.from(saved);
    }

    @PatchMapping("/{id}/annuler")
    @Transactional
    public MaintenanceDto annuler(@PathVariable Long id) {
        MaintenancePreventive m = find(id);
        if (m.getStatut() == StatutMaintenance.REALISEE || m.getStatut() == StatutMaintenance.ANNULEE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette maintenance est déjà réalisée ou annulée.");
        m.setStatut(StatutMaintenance.ANNULEE);
        return MaintenanceDto.from(maintenances.save(m));
    }

    /**
     * US23 : le technicien réalise la maintenance et saisit son rapport.
     * US25 : le système propose automatiquement la prochaine échéance (date de réalisation + fréquence du type).
     */
    @PatchMapping("/{id}/realiser")
    @Transactional
    public MaintenanceDto realiser(@PathVariable Long id, @Valid @RequestBody RealisationRequest req,
                                   @AuthenticationPrincipal Utilisateur current) {
        MaintenancePreventive m = find(id);
        verifierAcces(m, current);
        if (m.getStatut() != StatutMaintenance.PLANIFIEE && m.getStatut() != StatutMaintenance.EN_RETARD)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette maintenance est déjà réalisée ou annulée.");
        LocalDate date = req.dateRealisation() != null ? req.dateRealisation() : LocalDate.now();
        m.setDateRealisation(date);
        m.setRapport(req.rapport().trim());
        m.setStatut(StatutMaintenance.REALISEE);
        MaintenancePreventive saved = maintenances.save(m);

        if (m.getFrequenceMois() != null && m.getFrequenceMois() > 0) {
            MaintenancePreventive prochaine = new MaintenancePreventive();
            prochaine.setEquipement(m.getEquipement());
            prochaine.setTechnicien(m.getTechnicien());
            prochaine.setFrequenceMois(m.getFrequenceMois());
            prochaine.setDatePlanifiee(date.plusMonths(m.getFrequenceMois()));
            maintenances.save(prochaine);
        }
        return MaintenanceDto.from(saved);
    }

    private MaintenancePreventive find(Long id) {
        return maintenances.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Maintenance introuvable."));
    }

    private Utilisateur technicien(Long id) {
        return users.findById(id).filter(u -> u.getRole() == Role.TECHNICIEN && u.isActif())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technicien introuvable ou désactivé."));
    }

    /** Administrateur : tout. Technicien : seulement ses maintenances. */
    private void verifierAcces(MaintenancePreventive m, Utilisateur u) {
        boolean ok = u.getRole() == Role.ADMINISTRATEUR
                || (u.getRole() == Role.TECHNICIEN && m.getTechnicien() != null && m.getTechnicien().getId().equals(u.getId()));
        if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette maintenance ne vous concerne pas.");
    }
}
