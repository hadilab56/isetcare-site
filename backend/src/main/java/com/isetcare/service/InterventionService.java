package com.isetcare.service;

import com.isetcare.dto.InterventionDtos.InterventionRequest;
import com.isetcare.model.*;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.repository.ReclamationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Interventions des techniciens (US17 à US20).
 * Seul le technicien affecté peut saisir une intervention ; la réclamation passe alors « En cours ».
 */
@Service
public class InterventionService {

    private final InterventionRepository interventions;
    private final ReclamationRepository reclamations;
    private final AccessService access;
    private final EtatSyncService etatSync;
    private final NotificationService notifications;

    public InterventionService(InterventionRepository interventions, ReclamationRepository reclamations,
                               AccessService access, EtatSyncService etatSync, NotificationService notifications) {
        this.interventions = interventions;
        this.reclamations = reclamations;
        this.access = access;
        this.etatSync = etatSync;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<Intervention> parReclamation(Long reclamationId, Utilisateur current) {
        access.verifierReclamation(find(reclamationId), current);
        return interventions.findByReclamationIdOrderByIdDesc(reclamationId);
    }

    @Transactional
    public Intervention creer(Long reclamationId, InterventionRequest req, Utilisateur technicien) {
        Reclamation r = find(reclamationId);
        if (r.getTechnicienAffecte() == null || !r.getTechnicienAffecte().getId().equals(technicien.getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette réclamation ne vous est pas affectée.");
        if (r.getStatut() == StatutReclamation.RESOLU || r.getStatut() == StatutReclamation.CLOTURE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette réclamation est déjà résolue ou clôturée.");
        if (req.dateDebut() != null && req.dateFin() != null && req.dateFin().isBefore(req.dateDebut()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de fin doit être après la date de début.");

        Intervention i = new Intervention();
        i.setReclamation(r);
        i.setTechnicien(technicien);
        i.setDiagnostic(req.diagnostic().trim());
        i.setActionEffectuee(req.actionEffectuee() == null ? null : req.actionEffectuee().trim());
        i.setDateDebut(req.dateDebut() != null ? req.dateDebut() : LocalDateTime.now());
        i.setDateFin(req.dateFin());
        i.setCout(req.cout() != null ? req.cout() : BigDecimal.ZERO);
        i.setResultat(req.resultat());
        Intervention saved = interventions.save(i);

        // Première intervention : la réclamation passe « En cours » (jamais de retour en arrière).
        if (r.getStatut() == StatutReclamation.NOUVEAU || r.getStatut() == StatutReclamation.AFFECTEE) {
            r.setStatut(StatutReclamation.EN_COURS);
            reclamations.save(r);
            notifications.notifier(r.getDeclarant(), TypeNotification.CHANGEMENT_STATUT,
                    "Votre réclamation #" + r.getId() + " (" + r.getEquipement().getReference() + ") est maintenant : En cours.");
        }
        etatSync.synchroniser(r.getEquipement());
        return saved;
    }

    private Reclamation find(Long id) {
        return reclamations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réclamation introuvable."));
    }
}
