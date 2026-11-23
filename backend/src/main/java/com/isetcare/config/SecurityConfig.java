package com.isetcare.config;

import com.isetcare.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/health", "/api/auth/login").permitAll()
                // Page d'erreur interne de Spring : sans cette règle, un « accès refusé » (403)
                // y est redirigé, exige une connexion et devient un 401, ce qui déconnecte l'utilisateur du site.
                .requestMatchers("/error").permitAll()
                    .requestMatchers("/api/stats/**").hasRole("ADMINISTRATEUR")
                // Suivi d'un équipement : historique = admin + technicien ; décisions réparer/remplacer = admin
                .requestMatchers(HttpMethod.GET, "/api/equipements/*/historique").hasAnyRole("ADMINISTRATEUR", "TECHNICIEN")
                .requestMatchers("/api/equipements/*/decisions").hasRole("ADMINISTRATEUR")
                // Matériel : lecture pour tout utilisateur connecté, écriture réservée à l'administrateur.
                // L'ordre compte : la première règle qui correspond est appliquée.
                .requestMatchers(HttpMethod.GET, "/api/salles/**", "/api/types/**", "/api/equipements/**").authenticated()
                .requestMatchers("/api/salles/**", "/api/types/**", "/api/equipements/**").hasRole("ADMINISTRATEUR")
                // Réclamations : création = déclarant ; interventions et statut = technicien ;
                // affectation, priorité, clôture = administrateur ; lectures = connecté (le contrôleur limite à SES réclamations).
                .requestMatchers(HttpMethod.POST, "/api/reclamations").hasRole("DECLARANT")
                .requestMatchers(HttpMethod.POST, "/api/reclamations/*/interventions").hasRole("TECHNICIEN")
                .requestMatchers(HttpMethod.PATCH, "/api/reclamations/*/statut").hasRole("TECHNICIEN")
                .requestMatchers(HttpMethod.PATCH, "/api/reclamations/*/affectation",
                        "/api/reclamations/*/priorite", "/api/reclamations/*/cloture").hasRole("ADMINISTRATEUR")
                .requestMatchers(HttpMethod.GET, "/api/reclamations/*/interventions").hasAnyRole("ADMINISTRATEUR", "TECHNICIEN")
                .requestMatchers(HttpMethod.GET, "/api/reclamations/**").authenticated()
                // Maintenance préventive : réalisation = technicien ; lecture = admin + technicien ; le reste = admin
                .requestMatchers(HttpMethod.PATCH, "/api/maintenances/*/realiser").hasRole("TECHNICIEN")
                .requestMatchers(HttpMethod.GET, "/api/maintenances/**").hasAnyRole("ADMINISTRATEUR", "TECHNICIEN")
                .requestMatchers("/api/maintenances/**").hasRole("ADMINISTRATEUR")

                    .requestMatchers(HttpMethod.GET, "/api/interventions").hasAnyRole("ADMINISTRATEUR", "TECHNICIEN")


                // IA : analyse = tout utilisateur connecté ; recommandation de remplacement = administrateur
                .requestMatchers("/api/ai/recommend-replacement").hasRole("ADMINISTRATEUR")
                // Application Android : chaque action vérifie le rôle dans MobileController
                .requestMatchers("/api/mobile/**", "/api/ia/**").authenticated()
                // Notifications : tout utilisateur connecté (chacun ne voit que les siennes) -> anyRequest()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.asList(origins.split(",")));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }
}
