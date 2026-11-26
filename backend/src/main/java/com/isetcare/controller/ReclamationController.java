package com.isetcare.controller;

import com.isetcare.dto.ReclamationDtos.AffectationRequest;
import com.isetcare.dto.ReclamationDtos.ModificationRequest;
import com.isetcare.dto.ReclamationDtos.PrioriteRequest;
import com.isetcare.dto.ReclamationDtos.ReclamationDto;
import com.isetcare.dto.ReclamationDtos.StatutRequest;
import com.isetcare.model.*;
import com.isetcare.repository.AnalyseIARepository;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.repository.ReclamationRepository;
import com.isetcare.repository.UtilisateurRepository;
import com.isetcare.service.AccessService;
import com.isetcare.service.EtatSyncService;
import com.isetcare.service.FileStorageService;
import com.isetcare.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Réclamations (US11 à US16, US18, US26, US27, US30).
 * Règles par rôle (SecurityConfig) : POST = déclarant ; affectation / priorité / clôture = administrateur ;
 * changement de statut = technicien ; lectures = tout utilisateur connecté, limitées à SES réclamations.
 */
@RestController
@RequestMapping("/api/reclamations")
public class ReclamationController {
    private final ReclamationRepository reclamations;
    private final EquipementRepository equipements;
    private final UtilisateurRepository users;
    private final InterventionRepository interventions;
    private final AnalyseIARepository analyses;
    private final FileStorageService storage;
    private final AccessService access;
    private final NotificationService notifications;
    private final EtatSyncService etatSync;

    public ReclamationController(ReclamationRepository reclamations, EquipementRepository equipements,
                                 UtilisateurRepository users, InterventionRepository interventions,
                                 AnalyseIARepository analyses, FileStorageService storage, AccessService access,
                                 NotificationService notifications, EtatSyncService etatSync) {
        this.reclamations = reclamations;
        this.equipements = equipements;
        this.users = users;
        this.interventions = interventions;
        this.analyses = analyses;
        this.storage = storage;
        this.access = access;
        this.notifications = notifications;
        this.etatSync = etatSync;
    }

    /**
     * US11 : création (multipart : texte + photo optionnelle).
     * categorie / priorite = valeurs finales choisies par le déclarant (éventuellement corrigées après l'IA) ;
     * ia* = suggestion brute de l'IA, conservée dans AnalyseIA (étape 3).
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ReclamationDto create(@RequestParam Long equipementId,
                                 @RequestParam String description,
                                 @RequestParam(required = false) String categorie,
                                 @RequestParam(required = false) Priorite priorite,
                                 @RequestParam(required = false) String iaCategorie,
                                 @RequestParam(required = false) Priorite iaPriorite,
                                 @RequestParam(required = false) String iaTypePanne,
                                 @RequestParam(required = false) Float iaScore,
                                 @RequestParam(value = "photo", required = false) MultipartFile photo,
                                 @AuthenticationPrincipal Utilisateur current) {
        String desc = description.trim();
        if (desc.length() < 10)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Décrivez la panne en au moins 10 caractères.");
        if (desc.length() > 2000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description trop longue (2000 caractères maximum).");
        Equipement eq = equipements.findById(equipementId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Équipement introuvable."));

        Reclamation r = new Reclamation();
        r.setDescription(desc);
        r.setCategorie(categorie == null || categorie.isBlank() ? null : categorie.trim());
        if (priorite != null) r.setPriorite(priorite);
        r.setDeclarant(current);
        r.setEquipement(eq);
        r.setPhoto(storage.saveImage(photo)); // null si pas de photo
        Reclamation saved = reclamations.save(r);

        if ((iaCategorie != null && !iaCategorie.isBlank()) || iaPriorite != null) {
            AnalyseIA a = new AnalyseIA();
            a.setReclamation(saved);
            a.setCategorieSuggeree(iaCategorie);
            a.setPrioriteSuggeree(iaPriorite);
            a.setTypePanneProbable(iaTypePanne);
            a.setScoreConfiance(iaScore);
            analyses.save(a);
        }

        // US26 : notifier les administrateurs
        String extrait = desc.length() > 80 ? desc.substring(0, 80) + "…" : desc;
        notifications.notifierAdmins(TypeNotification.NOUVELLE_RECLAMATION,
                "Nouvelle réclamation #" + saved.getId() + " sur " + eq.getReference() + " : " + extrait);
        // US30 : 3 réclamations ou plus en 90 jours sur le même équipement
        long recentes = reclamations.countByEquipementIdAndDateCreationAfter(eq.getId(), LocalDateTime.now().minusDays(90));
        if (recentes >= 3)
            notifications.notifierAdmins(TypeNotification.PANNES_FREQUENTES,
                    "L'équipement " + eq.getReference() + " a eu " + recentes + " réclamations ces 90 derniers jours.");

        etatSync.synchroniser(eq);
        return ReclamationDto.from(saved);
    }

    /** US12 / US13 / US15 : liste filtrée selon le rôle de l'utilisateur connecté. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ReclamationDto> list(@RequestParam(required = false) StatutReclamation statut,
                                     @RequestParam(required = false) Priorite priorite,
                                     @RequestParam(required = false) Long equipementId,
                                     @AuthenticationPrincipal Utilisateur current) {
        Long declarantId = current.getRole() == Role.DECLARANT ? current.getId() : null;
        Long technicienId = current.getRole() == Role.TECHNICIEN ? current.getId() : null;
        return reclamations.findAll(
                        ReclamationRepository.filtres(declarantId, technicienId, statut, priorite, equipementId),
                        Sort.by(Sort.Direction.DESC, "dateCreation"))
                .stream().map(ReclamationDto::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ReclamationDto get(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        Reclamation r = find(id);
        access.verifierReclamation(r, current);
        return ReclamationDto.from(r);
    }

    /** La photo passe par l'API (et non par un lien public) : le contrôle d'accès s'applique aussi à l'image. */
    @GetMapping("/{id}/photo")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> photo(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        Reclamation r = find(id);
        access.verifierReclamation(r, current);
        if (r.getPhoto() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pas de photo.");
        return ResponseEntity.ok().contentType(storage.mediaType(r.getPhoto())).body(storage.read(r.getPhoto()));
    }

    /** US14 : affecter à un technicien (administrateur). */
    @PatchMapping("/{id}/affectation")
    @Transactional
    public ReclamationDto affecter(@PathVariable Long id, @Valid @RequestBody AffectationRequest req) {
        Reclamation r = find(id);
        if (r.getStatut() == StatutReclamation.RESOLU || r.getStatut() == StatutReclamation.CLOTURE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette réclamation est déjà résolue ou clôturée.");
        Utilisateur tech = users.findById(req.technicienId())
                .filter(u -> u.getRole() == Role.TECHNICIEN && u.isActif())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technicien introuvable ou désactivé."));
        boolean etaitNouvelle = r.getStatut() == StatutReclamation.NOUVEAU;
        r.setTechnicienAffecte(tech);
        if (etaitNouvelle) r.setStatut(StatutReclamation.AFFECTEE);
        Reclamation saved = reclamations.save(r);

        String ref = r.getEquipement().getReference();
        notifications.notifier(tech, TypeNotification.NOUVELLE_RECLAMATION,
                "La réclamation #" + r.getId() + " (" + ref + ") vous a été affectée."); // US26 : technicien concerné
        if (etaitNouvelle)
            notifications.notifier(r.getDeclarant(), TypeNotification.CHANGEMENT_STATUT,
                    "Votre réclamation #" + r.getId() + " (" + ref + ") est affectée à " + tech.getPrenom() + " " + tech.getNom() + "."); // US27
        etatSync.synchroniser(r.getEquipement());
        return ReclamationDto.from(saved);
    }

    /** US16 : modifier la priorité (administrateur). */
    @PatchMapping("/{id}/priorite")
    @Transactional
    public ReclamationDto changerPriorite(@PathVariable Long id, @Valid @RequestBody PrioriteRequest req) {
        Reclamation r = find(id);
        if (r.getStatut() == StatutReclamation.CLOTURE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette réclamation est clôturée.");
        r.setPriorite(req.priorite());
        return ReclamationDto.from(reclamations.save(r));
    }

    /**
     * US18 : le technicien affecté fait avancer le statut : AFFECTEE -> EN_COURS, puis EN_COURS -> RESOLU
     * (au moins une intervention doit être enregistrée avant de résoudre).
     */
    @PatchMapping("/{id}/statut")
    @Transactional
    public ReclamationDto changerStatut(@PathVariable Long id, @Valid @RequestBody StatutRequest req,
                                        @AuthenticationPrincipal Utilisateur current) {
        Reclamation r = find(id);
        access.verifierReclamation(r, current);
        StatutReclamation de = r.getStatut();
        StatutReclamation vers = req.statut();
        boolean permis = (de == StatutReclamation.AFFECTEE && vers == StatutReclamation.EN_COURS)
                || (de == StatutReclamation.EN_COURS && vers == StatutReclamation.RESOLU);
        if (!permis)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Changement de statut non autorisé : " + libelle(de) + " → " + libelle(vers) + ".");
        if (vers == StatutReclamation.RESOLU && interventions.countByReclamationId(id) == 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Enregistrez au moins une intervention avant de marquer la réclamation comme résolue.");
        r.setStatut(vers);
        Reclamation saved = reclamations.save(r);
        etatSync.synchroniser(r.getEquipement());
        notifications.notifier(r.getDeclarant(), TypeNotification.CHANGEMENT_STATUT,
                "Votre réclamation #" + r.getId() + " (" + r.getEquipement().getReference() + ") est maintenant : " + libelle(vers) + ".");
        return ReclamationDto.from(saved);
    }

    /** US16 : clôturer (administrateur). Le coût cumulé de l'équipement se calcule à partir des interventions. */
    @PatchMapping("/{id}/cloture")
    @Transactional
    public ReclamationDto cloturer(@PathVariable Long id) {
        Reclamation r = find(id);
        if (r.getStatut() == StatutReclamation.CLOTURE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette réclamation est déjà clôturée.");
        r.setStatut(StatutReclamation.CLOTURE);
        Reclamation saved = reclamations.save(r);
        etatSync.synchroniser(r.getEquipement());
        notifications.notifier(r.getDeclarant(), TypeNotification.CHANGEMENT_STATUT,
                "Votre réclamation #" + r.getId() + " (" + r.getEquipement().getReference() + ") a été clôturée.");
        return ReclamationDto.from(saved);
    }

    /** Modifier description, catégorie et priorité (administrateur). */
    @PutMapping("/{id}")
    @Transactional
    public ReclamationDto modifier(@PathVariable Long id, @Valid @RequestBody ModificationRequest req) {
        Reclamation r = find(id);
        r.setDescription(req.description().trim());
        r.setCategorie(req.categorie() == null || req.categorie().isBlank() ? null : req.categorie().trim());
        r.setPriorite(req.priorite());
        return ReclamationDto.from(reclamations.save(r));
    }

    /** Supprimer une réclamation avec ses interventions et son analyse (administrateur). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void supprimer(@PathVariable Long id) {
        Reclamation r = find(id);
        Equipement eq = r.getEquipement();
        interventions.deleteAll(interventions.findByReclamationId(id));
        analyses.findByReclamationId(id).ifPresent(analyses::delete);
        reclamations.delete(r);
        reclamations.flush();
        etatSync.synchroniser(eq);
    }

    private Reclamation find(Long id) {
        return reclamations.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Réclamation introuvable."));
    }

    private static String libelle(StatutReclamation s) {
        return switch (s) {
            case NOUVEAU -> "Nouvelle";
            case AFFECTEE -> "Affectée";
            case EN_COURS -> "En cours";
            case RESOLU -> "Résolue";
            case CLOTURE -> "Clôturée";
        };
    }
}
