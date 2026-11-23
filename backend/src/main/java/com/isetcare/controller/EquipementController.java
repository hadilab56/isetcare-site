package com.isetcare.controller;

import com.isetcare.dto.MaterielDtos.EquipementDto;
import com.isetcare.dto.MaterielDtos.EquipementRequest;
import com.isetcare.dto.MaterielDtos.EtatRequest;
import com.isetcare.model.Equipement;
import com.isetcare.model.EtatEquipement;
import com.isetcare.model.Salle;
import com.isetcare.model.TypeEquipement;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.SalleRepository;
import com.isetcare.repository.TypeEquipementRepository;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Gestion du matériel. Lecture : tout utilisateur connecté. Écriture : administrateur (voir SecurityConfig).
 * @Transactional : les relations salle/type sont LAZY et open-in-view est désactivé ;
 * il faut donc rester dans une transaction pour construire le DTO.
 */
@RestController
@RequestMapping("/api/equipements")
public class EquipementController {
    private final EquipementRepository equipements;
    private final SalleRepository salles;
    private final TypeEquipementRepository types;

    public EquipementController(EquipementRepository equipements, SalleRepository salles, TypeEquipementRepository types) {
        this.equipements = equipements;
        this.salles = salles;
        this.types = types;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<EquipementDto> list(@RequestParam(required = false) String q,
                                    @RequestParam(required = false) Long typeId,
                                    @RequestParam(required = false) Long salleId,
                                    @RequestParam(required = false) EtatEquipement etat) {
        return equipements.findAll(EquipementRepository.filtres(q, typeId, salleId, etat), Sort.by("reference"))
                .stream().map(EquipementDto::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public EquipementDto get(@PathVariable Long id) {
        return EquipementDto.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public EquipementDto create(@Valid @RequestBody EquipementRequest req) {
        String ref = req.reference().trim();
        if (equipements.existsByReference(ref))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette référence existe déjà.");
        Equipement e = new Equipement();
        e.setReference(ref);
        e.setQrCode(EquipementDto.qrContent(ref));
        apply(e, req);
        return EquipementDto.from(equipements.save(e));
    }

    /** La référence n'est PAS modifiable : le QR code déjà collé sur le matériel resterait valide. */
    @PutMapping("/{id}")
    @Transactional
    public EquipementDto update(@PathVariable Long id, @Valid @RequestBody EquipementRequest req) {
        Equipement e = find(id);
        apply(e, req);
        return EquipementDto.from(equipements.save(e));
    }

    @PatchMapping("/{id}/etat")
    @Transactional
    public EquipementDto setEtat(@PathVariable Long id, @Valid @RequestBody EtatRequest req) {
        Equipement e = find(id);
        e.setEtat(req.etat());
        return EquipementDto.from(equipements.save(e));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        Equipement e = find(id);
        try {
            equipements.delete(e);
            equipements.flush(); // force l'exécution du DELETE ici pour attraper l'erreur de clé étrangère
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Impossible de supprimer : cet équipement a un historique (réclamations, interventions). "
                            + "Passez-le plutôt à l'état « Hors service ».");
        }
    }

    private Equipement find(Long id) {
        return equipements.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Équipement introuvable."));
    }

    /** Copie les champs modifiables (sans la référence ni le QR code). */
    private void apply(Equipement e, EquipementRequest r) {
        Salle salle = salles.findById(r.salleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Salle introuvable."));
        TypeEquipement type = types.findById(r.typeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type d'équipement introuvable."));
        e.setMarque(blankToNull(r.marque()));
        e.setModele(blankToNull(r.modele()));
        e.setNumeroSerie(blankToNull(r.numeroSerie()));
        e.setDateAcquisition(r.dateAcquisition());
        e.setPrixAchat(r.prixAchat());
        if (r.etat() != null) e.setEtat(r.etat());
        e.setSalle(salle);
        e.setType(type);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
