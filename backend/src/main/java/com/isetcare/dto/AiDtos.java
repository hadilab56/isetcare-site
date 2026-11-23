package com.isetcare.dto;

import java.util.List;
import java.util.Map;

/** Échanges du module IA (site web : /api/ai/... ; application Android : /api/ia/analyser). */
public final class AiDtos {
    private AiDtos() {}

    public record AnalyzeRequest(String description, Long equipementId) {}

    /** Format attendu par le site (src/api/types.ts : AiAnalysis). prioriteSuggeree : BASSE..URGENTE. */
    public record AiAnalysis(String categorieSuggeree, String typePanneProbable, String prioriteSuggeree,
                             double scoreConfiance, Map<String, Double> confiances,
                             boolean regleSecuriteAppliquee, boolean aVerifier,
                             String source, String explication) {}

    public record RecommendRequest(Long equipementId) {}

    /** Format attendu par le site (AiRecommendation). decision : REPARER, SURVEILLER ou REMPLACER. */
    public record AiRecommendation(String decision, String message, int score, double ratioCout, List<String> raisons) {}

    /** Assistant de discussion du site. role : "user" (utilisateur) ou "model" (assistant). */
    public record ChatMessage(String role, String text) {}

    public record ChatRequest(List<ChatMessage> messages) {}

    /** source : "gemini" ou "hors-ligne" (aucune clé configurée ou Gemini indisponible). */
    public record ChatReply(String reply, String source) {}

    /** Format attendu par l'application Android. priorite : FAIBLE, MOYENNE ou ELEVEE. */
    public record AnalyseMobile(String categorie, String priorite, double confiance, String source, String explication) {}
}
