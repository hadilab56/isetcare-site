package com.isetcare.service;

import com.isetcare.model.Equipement;
import com.isetcare.model.EtatEquipement;
import com.isetcare.model.StatutReclamation;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.repository.ReclamationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Met à jour automatiquement l'état d'un équipement selon ses réclamations ouvertes :
 * une intervention en cours -> EN_MAINTENANCE ; une réclamation nouvelle/affectée -> EN_PANNE ; sinon EN_SERVICE.
 * Un équipement HORS_SERVICE n'est jamais modifié automatiquement (décision de l'administrateur).
 */
@Service
public class EtatSyncService {
    private final ReclamationRepository reclamations;
    private final EquipementRepository equipements;

    public EtatSyncService(ReclamationRepository reclamations, EquipementRepository equipements) {
        this.reclamations = reclamations;
        this.equipements = equipements;
    }

    public void synchroniser(Equipement e) {
        if (e.getEtat() == EtatEquipement.HORS_SERVICE) return;
        EtatEquipement cible;
        if (reclamations.existsByEquipementIdAndStatutIn(e.getId(), List.of(StatutReclamation.EN_COURS)))
            cible = EtatEquipement.EN_MAINTENANCE;
        else if (reclamations.existsByEquipementIdAndStatutIn(e.getId(), List.of(StatutReclamation.NOUVEAU, StatutReclamation.AFFECTEE)))
            cible = EtatEquipement.EN_PANNE;
        else
            cible = EtatEquipement.EN_SERVICE;
        if (e.getEtat() != cible) {
            e.setEtat(cible);
            equipements.save(e);
        }
    }
}
