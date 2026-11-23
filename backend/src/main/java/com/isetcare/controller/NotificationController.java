package com.isetcare.controller;

import com.isetcare.dto.NotificationStatsDtos.NotificationDto;
import com.isetcare.model.Notification;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/** Notifications de l'utilisateur connecté (étape 6) : chacun ne voit que les siennes. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationDto> list(@AuthenticationPrincipal Utilisateur current) {
        return notifications.findTop50ByUtilisateurIdOrderByDateEnvoiDesc(current.getId())
                .stream().map(NotificationDto::from).toList();
    }

    @GetMapping("/non-lues")
    @Transactional(readOnly = true)
    public Map<String, Long> nonLues(@AuthenticationPrincipal Utilisateur current) {
        return Map.of("count", notifications.countByUtilisateurIdAndLueFalse(current.getId()));
    }

    @PatchMapping("/{id}/lue")
    @Transactional
    public NotificationDto marquerLue(@PathVariable Long id, @AuthenticationPrincipal Utilisateur current) {
        Notification n = notifications.findById(id)
                .filter(x -> x.getUtilisateur().getId().equals(current.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable."));
        n.setLue(true);
        return NotificationDto.from(notifications.save(n));
    }

    @PatchMapping("/lues")
    @Transactional
    public Map<String, Integer> toutMarquerLu(@AuthenticationPrincipal Utilisateur current) {
        return Map.of("modifiees", notifications.marquerToutesLues(current.getId()));
    }
}
