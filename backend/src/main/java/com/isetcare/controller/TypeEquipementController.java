package com.isetcare.controller;

import com.isetcare.dto.MaterielDtos.TypeDto;
import com.isetcare.dto.MaterielDtos.TypeRequest;
import com.isetcare.model.TypeEquipement;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.TypeEquipementRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Gestion des types d'équipement. Lecture : tout utilisateur connecté. Écriture : administrateur. */
@RestController
@RequestMapping("/api/types")
public class TypeEquipementController {
    private final TypeEquipementRepository types;
    private final EquipementRepository equipements;

    public TypeEquipementController(TypeEquipementRepository types, EquipementRepository equipements) {
        this.types = types;
        this.equipements = equipements;
    }

    @GetMapping
    public List<TypeDto> list() {
        return types.findAll(Sort.by("libelle")).stream().map(TypeDto::from).toList();
    }

    @GetMapping("/{id}")
    public TypeDto get(@PathVariable Long id) {
        return TypeDto.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TypeDto create(@Valid @RequestBody TypeRequest req) {
        String libelle = req.libelle().trim();
        if (types.existsByLibelleIgnoreCase(libelle))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce type existe déjà.");
        TypeEquipement t = new TypeEquipement();
        apply(t, req, libelle);
        return TypeDto.from(types.save(t));
    }

    @PutMapping("/{id}")
    public TypeDto update(@PathVariable Long id, @Valid @RequestBody TypeRequest req) {
        TypeEquipement t = find(id);
        String libelle = req.libelle().trim();
        if (types.existsByLibelleIgnoreCaseAndIdNot(libelle, id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce type existe déjà.");
        apply(t, req, libelle);
        return TypeDto.from(types.save(t));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        TypeEquipement t = find(id);
        if (equipements.existsByTypeId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Impossible de supprimer : des équipements utilisent ce type.");
        types.delete(t);
    }

    private TypeEquipement find(Long id) {
        return types.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Type introuvable."));
    }

    private void apply(TypeEquipement t, TypeRequest r, String libelle) {
        t.setLibelle(libelle);
        t.setFrequenceMaintenanceMois(r.frequenceMaintenanceMois() != null ? r.frequenceMaintenanceMois() : 6);
        t.setDureeVieEstimeeMois(r.dureeVieEstimeeMois());
    }
}
