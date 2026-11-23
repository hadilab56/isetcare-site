package com.isetcare.service;

import com.isetcare.model.Notification;
import com.isetcare.model.Role;
import com.isetcare.model.TypeNotification;
import com.isetcare.model.Utilisateur;
import com.isetcare.repository.NotificationRepository;
import com.isetcare.repository.UtilisateurRepository;
import org.springframework.stereotype.Service;

/** Création des notifications (US26 à US30). Les méthodes sont appelées depuis les contrôleurs, dans leur transaction. */
@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final UtilisateurRepository users;

    public NotificationService(NotificationRepository notifications, UtilisateurRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    public void notifier(Utilisateur destinataire, TypeNotification type, String message) {
        if (destinataire == null) return;
        Notification n = new Notification();
        n.setUtilisateur(destinataire);
        n.setType(type);
        n.setMessage(message.length() > 255 ? message.substring(0, 252) + "..." : message);
        notifications.save(n);
    }

    public void notifierAdmins(TypeNotification type, String message) {
        for (Utilisateur a : users.findByRole(Role.ADMINISTRATEUR)) {
            if (a.isActif()) notifier(a, type, message);
        }
    }

    /** Pour les rappels automatiques : n'envoie pas deux fois exactement le même message. */
    public void notifierUneFois(Utilisateur destinataire, TypeNotification type, String message) {
        if (destinataire == null) return;
        String msg = message.length() > 255 ? message.substring(0, 252) + "..." : message;
        if (!notifications.existsByUtilisateurIdAndTypeAndMessage(destinataire.getId(), type, msg))
            notifier(destinataire, type, msg);
    }

    public void notifierAdminsUneFois(TypeNotification type, String message) {
        for (Utilisateur a : users.findByRole(Role.ADMINISTRATEUR)) {
            if (a.isActif()) notifierUneFois(a, type, message);
        }
    }
}
