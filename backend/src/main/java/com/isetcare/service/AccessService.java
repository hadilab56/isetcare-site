package com.isetcare.service;

import com.isetcare.model.Reclamation;
import com.isetcare.model.Utilisateur;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Qui a le droit de voir quelle réclamation ? Administrateur : tout. Déclarant : les siennes. Technicien : celles affectées. */
@Service
public class AccessService {

    public void verifierReclamation(Reclamation r, Utilisateur u) {
        boolean ok = switch (u.getRole()) {
            case ADMINISTRATEUR -> true;
            case DECLARANT -> r.getDeclarant().getId().equals(u.getId());
            case TECHNICIEN -> r.getTechnicienAffecte() != null && r.getTechnicienAffecte().getId().equals(u.getId());
        };
        if (!ok) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette réclamation ne vous concerne pas.");
    }
}
