package com.isetcare.controller;

import com.isetcare.dto.AuthDtos.*;
import com.isetcare.dto.UserDto;
import com.isetcare.model.Role;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.UtilisateurRepository;
import com.isetcare.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UtilisateurRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UtilisateurRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    /** US01 : connexion par email + mot de passe. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        Utilisateur u = users.findByEmail(req.email().toLowerCase().trim()).orElse(null);
        if (u == null || !u.isActif() || !encoder.matches(req.motDePasse(), u.getMotDePasse()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants incorrects.");
        return new LoginResponse(jwt.generate(u.getEmail(), u.getRole().name()), UserDto.from(u));
    }

    /**
     * Inscription (application mobile) : un nouveau compte est toujours DÉCLARANT.
     * Les techniciens et administrateurs restent créés par l'administrateur depuis le site.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().toLowerCase().trim();
        if (users.findByEmail(email).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un compte existe déjà avec cette adresse e-mail.");
        Utilisateur u = new Utilisateur();
        u.setNom(req.nom().trim());
        u.setPrenom(req.prenom().trim());
        u.setEmail(email);
        u.setMotDePasse(encoder.encode(req.motDePasse()));
        u.setRole(Role.DECLARANT);
        u.setDepartement(req.departement() == null || req.departement().isBlank() ? null : req.departement().trim());
        u.setFonction(req.fonction() == null || req.fonction().isBlank() ? "Personnel" : req.fonction().trim());
        u = users.save(u);
        return new LoginResponse(jwt.generate(u.getEmail(), u.getRole().name()), UserDto.from(u));
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Utilisateur u) {
        return UserDto.from(u);
    }

    /** US03 : modifier mon profil. */
    @PutMapping("/profile")
    public UserDto updateProfile(@AuthenticationPrincipal Utilisateur u, @Valid @RequestBody ProfileRequest req) {
        u.setNom(req.nom());
        u.setPrenom(req.prenom());
        u.setTelephone(req.telephone());
        return UserDto.from(users.save(u));
    }

    /** US03 : modifier mon mot de passe. */
    @PutMapping("/password")
    public Map<String, String> changePassword(@AuthenticationPrincipal Utilisateur u, @Valid @RequestBody PasswordRequest req) {
        if (!encoder.matches(req.ancienMotDePasse(), u.getMotDePasse()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ancien mot de passe incorrect.");
        u.setMotDePasse(encoder.encode(req.nouveauMotDePasse()));
        users.save(u);
        return Map.of("message", "Mot de passe modifié.");
    }
}
