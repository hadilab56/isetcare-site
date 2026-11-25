package com.isetcare.dto;

import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String motDePasse) {}
    public record LoginResponse(String token, UserDto utilisateur) {}
    /** Inscription libre (application mobile) : crée toujours un compte déclarant. */
    public record RegisterRequest(@NotBlank @Size(max = 60) String nom,
                                  @NotBlank @Size(max = 60) String prenom,
                                  @NotBlank @Email String email,
                                  @NotBlank @Size(min = 8, message = "8 caractères minimum") String motDePasse,
                                  String departement,
                                  String fonction) {}
    public record ProfileRequest(@NotBlank String nom, @NotBlank String prenom, String telephone) {}
    public record PasswordRequest(@NotBlank String ancienMotDePasse,
                                  @NotBlank @Size(min = 8, message = "8 caractères minimum") String nouveauMotDePasse) {}
}
