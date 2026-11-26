package com.isetcare.controller;

import com.isetcare.dto.UserDto;
import com.isetcare.dto.UserRequest;
import com.isetcare.model.Role;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.InterventionRepository;
import com.isetcare.repository.MaintenanceRepository;
import com.isetcare.repository.NotificationRepository;
import com.isetcare.repository.ReclamationRepository;
import com.isetcare.repository.UtilisateurRepository;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** US02 : gestion des comptes (réservé à l'administrateur, voir SecurityConfig). */
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UtilisateurRepository users;
    private final PasswordEncoder encoder;
    private final ReclamationRepository reclamations;
    private final InterventionRepository interventions;
    private final MaintenanceRepository maintenances;
    private final NotificationRepository notifications;

    public UserController(UtilisateurRepository users, PasswordEncoder encoder, ReclamationRepository reclamations,
                          InterventionRepository interventions, MaintenanceRepository maintenances,
                          NotificationRepository notifications) {
        this.users = users;
        this.encoder = encoder;
        this.reclamations = reclamations;
        this.interventions = interventions;
        this.maintenances = maintenances;
        this.notifications = notifications;
    }

    @GetMapping
    public List<UserDto> list(@RequestParam(required = false) Role role) {
        List<Utilisateur> list = role == null ? users.findAll() : users.findByRole(role);
        return list.stream().map(UserDto::from).toList();
    }

    @GetMapping("/{id}")
    public UserDto get(@PathVariable Long id) {
        return UserDto.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody UserRequest req) {
        if (req.motDePasse() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mot de passe requis.");
        String email = req.email().toLowerCase().trim();
        if (users.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet email existe déjà.");
        Utilisateur u = new Utilisateur();
        apply(u, req);
        u.setEmail(email);
        u.setMotDePasse(encoder.encode(req.motDePasse()));
        return UserDto.from(users.save(u));
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UserRequest req) {
        Utilisateur u = find(id);
        String email = req.email().toLowerCase().trim();
        if (!email.equals(u.getEmail()) && users.existsByEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet email existe déjà.");
        apply(u, req);
        u.setEmail(email);
        if (req.motDePasse() != null) u.setMotDePasse(encoder.encode(req.motDePasse()));
        return UserDto.from(users.save(u));
    }

    /** Désactivation / réactivation (pas de suppression : l'historique des pannes est conservé). */
    @PatchMapping("/{id}/actif")
    public UserDto setActif(@PathVariable Long id, @RequestBody Map<String, Boolean> body,
                            @AuthenticationPrincipal Utilisateur current) {
        Utilisateur u = find(id);
        if (u.getId().equals(current.getId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas désactiver votre propre compte.");
        u.setActif(Boolean.TRUE.equals(body.get("actif")));
        return UserDto.from(users.save(u));
    }

    /**
     * Supprimer un compte (administrateur). Possible seulement s'il n'a aucun historique
     * (réclamation, intervention, maintenance) ; sinon il faut le désactiver.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        Utilisateur u = find(id);
        if (u.getId().equals(current.getId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas supprimer votre propre compte.");
        if (reclamations.existsByDeclarantIdOrTechnicienAffecteId(id, id) || interventions.existsByTechnicienId(id)
                || maintenances.existsByTechnicienId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ce compte a un historique (réclamations, interventions ou maintenances) : désactivez-le plutôt.");
        notifications.deleteByUtilisateurId(id);
        users.delete(u);
    }

    private Utilisateur find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable."));
    }

    private void apply(Utilisateur u, UserRequest r) {
        u.setNom(r.nom());
        u.setPrenom(r.prenom());
        u.setTelephone(r.telephone());
        u.setRole(r.role());
        u.setDepartement(r.departement());
        u.setFonction(r.fonction());
        u.setService(r.service());
        u.setSpecialite(r.specialite());
        if (r.disponible() != null) u.setDisponible(r.disponible());
    }
}
