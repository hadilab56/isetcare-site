package com.isetcare.controller;

import com.isetcare.dto.MaterielDtos.SalleDto;
import com.isetcare.dto.MaterielDtos.SalleRequest;
import com.isetcare.model.Salle;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.SalleRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Gestion des salles. Lecture : tout utilisateur connecté. Écriture : administrateur (voir SecurityConfig). */
@RestController
@RequestMapping("/api/salles")
public class SalleController {
    private final SalleRepository salles;
    private final EquipementRepository equipements;

    public SalleController(SalleRepository salles, EquipementRepository equipements) {
        this.salles = salles;
        this.equipements = equipements;
    }

    @GetMapping
    public List<SalleDto> list() {
        return salles.findAll(Sort.by("nom")).stream().map(SalleDto::from).toList();
    }

    @GetMapping("/{id}")
    public SalleDto get(@PathVariable Long id) {
        return SalleDto.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SalleDto create(@Valid @RequestBody SalleRequest req) {
        Salle s = new Salle();
        apply(s, req);
        return SalleDto.from(salles.save(s));
    }

    @PutMapping("/{id}")
    public SalleDto update(@PathVariable Long id, @Valid @RequestBody SalleRequest req) {
        Salle s = find(id);
        apply(s, req);
        return SalleDto.from(salles.save(s));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        Salle s = find(id);
        if (equipements.existsBySalleId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Impossible de supprimer : cette salle contient encore des équipements.");
        salles.delete(s);
    }

    private Salle find(Long id) {
        return salles.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Salle introuvable."));
    }

    private void apply(Salle s, SalleRequest r) {
        s.setNom(r.nom().trim());
        s.setBatiment(r.batiment() == null || r.batiment().isBlank() ? null : r.batiment().trim());
        s.setEtage(r.etage());
    }
}
