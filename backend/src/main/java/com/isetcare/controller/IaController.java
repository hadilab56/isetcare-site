package com.isetcare.controller;

import com.isetcare.dto.AiDtos.*;
import com.isetcare.model.Equipement;
import com.isetcare.repository.EquipementRepository;
import com.isetcare.service.IaService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Endpoints IA appelés par le site (src/api/ai.ts) et par l'application Android.
 * Le navigateur et le téléphone ne contactent jamais Gemini directement.
 */
@RestController
public class IaController {

    private final IaService ia;
    private final EquipementRepository equipements;
    private final EquipementSuiviController suivi;

    public IaController(IaService ia, EquipementRepository equipements, EquipementSuiviController suivi) {
        this.ia = ia;
        this.equipements = equipements;
        this.suivi = suivi;
    }

    /** Site web : suggestion de catégorie, type de panne et priorité. */
    @PostMapping("/api/ai/analyze")
    @Transactional(readOnly = true)
    public AiAnalysis analyze(@RequestBody AnalyzeRequest req) {
        if (req.description() == null || req.description().trim().length() < 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Décrivez la panne avant de lancer l'analyse.");
        return ia.analyser(req.description(), typeOf(req.equipementId()));
    }

    /** Site web : assistant de discussion (tout utilisateur connecté). */
    @PostMapping("/api/ai/chat")
    public ChatReply chat(@RequestBody ChatRequest req) {
        if (req == null || req.messages() == null || req.messages().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message vide.");
        return ia.discuter(req.messages());
    }

    /** Site web (administrateur) : réparer / surveiller / remplacer. */
    @PostMapping("/api/ai/recommend-replacement")
    @Transactional(readOnly = true)
    public AiRecommendation recommend(@RequestBody RecommendRequest req) {
        if (req.equipementId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez un équipement.");
        Equipement e = equipements.findById(req.equipementId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Équipement introuvable."));
        return ia.recommander(suivi.historique(e.getId()), e.getDateAcquisition(),
                e.getType() == null ? null : e.getType().getDureeVieEstimeeMois());
    }

    /** Application Android : même analyse, au format de l'application (priorité FAIBLE / MOYENNE / ELEVEE). */
    @PostMapping("/api/ia/analyser")
    @Transactional(readOnly = true)
    public AnalyseMobile analyser(@RequestBody AnalyzeRequest req) {
        AiAnalysis a = ia.analyser(req.description(), typeOf(req.equipementId()));
        String priorite = switch (a.prioriteSuggeree()) {
            case "BASSE" -> "FAIBLE";
            case "HAUTE", "URGENTE" -> "ELEVEE";
            default -> "MOYENNE";
        };
        String explication = a.explication() == null ? "" : a.explication();
        if (a.typePanneProbable() != null && !a.typePanneProbable().startsWith("Non"))
            explication = ("Cause probable : " + a.typePanneProbable() + ". " + explication).trim();
        return new AnalyseMobile(a.categorieSuggeree(), priorite, a.scoreConfiance(), a.source(), explication);
    }

    private String typeOf(Long equipementId) {
        if (equipementId == null) return "";
        return equipements.findById(equipementId)
                .map(e -> e.getType() == null ? "" : e.getType().getLibelle())
                .orElse("");
    }
}
