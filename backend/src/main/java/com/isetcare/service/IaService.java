package com.isetcare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.isetcare.dto.AiDtos.AiAnalysis;
import com.isetcare.dto.AiDtos.AiRecommendation;
import com.isetcare.dto.AiDtos.ChatMessage;
import com.isetcare.dto.AiDtos.ChatReply;
import com.isetcare.dto.InterventionDtos.HistoriqueDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * IA d'ISETCare, partagée par le site web et l'application Android.
 *
 * Analyse d'une réclamation : Gemini (Google AI Studio) si GEMINI_API_KEY est défini,
 * sinon (ou en cas d'erreur) classification par mots-clés. La clé reste sur le serveur.
 * Règle de sécurité : un danger (fumée, étincelle...) force toujours la priorité URGENTE.
 */
@Service
public class IaService {

    private static final Logger log = LoggerFactory.getLogger(IaService.class);
    private static final List<String> CATEGORIES = List.of(RulesClassifier.CATEGORIES);
    private static final List<String> PRIORITES = List.of("BASSE", "MOYENNE", "HAUTE", "URGENTE");

    private final String apiKey;
    private final String model;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public IaService(@Value("${app.gemini.api-key:}") String apiKey,
                     @Value("${app.gemini.model:gemini-3.1-flash-lite}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        log.info(this.apiKey.isEmpty()
                ? "IA : pas de clé GEMINI_API_KEY, analyse par mots-clés."
                : "IA : Gemini activé (modèle " + model + ").");
    }

    // ------------------------------------------------------------- Analyse

    public AiAnalysis analyser(String description, String typeEquipement) {
        AiAnalysis regles = RulesClassifier.analyser(description, typeEquipement);
        if (apiKey.isEmpty() || description == null || description.isBlank()) return regles;
        try {
            AiAnalysis g = gemini(description, typeEquipement);
            if (regles.regleSecuriteAppliquee() && !"URGENTE".equals(g.prioriteSuggeree())) {
                return new AiAnalysis(g.categorieSuggeree(), g.typePanneProbable(), "URGENTE", g.scoreConfiance(),
                        g.confiances(), true, g.aVerifier(), g.source(),
                        g.explication() + " Priorité urgente imposée par la règle de sécurité.");
            }
            return g;
        } catch (Exception e) {
            log.warn("Gemini indisponible ({}), repli sur les mots-clés.", e.getMessage());
            return regles;
        }
    }

    private AiAnalysis gemini(String description, String typeEquipement) throws Exception {
        String prompt = """
                Tu es l'assistant de maintenance de l'ISET de Radès (Tunisie).
                Analyse la réclamation technique ci-dessous.
                Catégories possibles : %s.
                Priorités : BASSE (gêne mineure), MOYENNE (équipement inutilisable),
                HAUTE (salle entière touchée, cours ou examen bloqué), URGENTE (danger pour les personnes).
                Équipement concerné : %s
                Description : "%s"
                Réponds uniquement en JSON :
                {"categorie": "...", "typePanne": "cause probable en quelques mots", "priorite": "...",
                 "confiance": nombre entre 0 et 1, "explication": "une phrase courte en français"}
                """.formatted(String.join(", ", CATEGORIES),
                typeEquipement == null || typeEquipement.isBlank() ? "non précisé" : typeEquipement,
                description.replace("\"", "'"));

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json", "temperature", 0.2));
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());

        String texte = null;
        for (JsonNode part : json.readTree(res.body()).path("candidates").path(0).path("content").path("parts")) {
            if (part.hasNonNull("text") && !part.path("thought").asBoolean(false)) texte = part.get("text").asText();
        }
        if (texte == null) throw new IllegalStateException("réponse vide");
        JsonNode r = json.readTree(texte.replace("```json", "").replace("```", "").trim());

        String categorie = r.path("categorie").asText("Autre");
        if (!CATEGORIES.contains(categorie)) categorie = "Autre";
        String priorite = RulesClassifier.normaliser(r.path("priorite").asText("MOYENNE")).toUpperCase();
        if (!PRIORITES.contains(priorite)) priorite = "MOYENNE";
        double confiance = Math.max(0, Math.min(1, r.path("confiance").asDouble(0.7)));
        return new AiAnalysis(categorie, r.path("typePanne").asText("Non déterminé"), priorite,
                Math.round(confiance * 100) / 100.0, Map.of(categorie, confiance),
                false, confiance < 0.6, "gemini", r.path("explication").asText(""));
    }

    // ------------------------------------------------- Assistant de discussion

    private static final String CHAT_CONSIGNES = """
            Tu es l'assistant virtuel d'ISETCare, la plateforme de gestion de la maintenance (GMAO)
            de l'ISET de Radès (Tunisie). Réponds en français (ou dans la langue de l'utilisateur),
            de façon courte, claire et polie.
            Ce que fait ISETCare :
            - Les déclarants (enseignants, personnel) signalent une panne via « Signaler une panne »
              ou en scannant le QR code collé sur l'équipement ; ils suivent leurs réclamations.
            - L'IA propose une catégorie, une cause probable et une priorité ; un danger (fumée,
              étincelle, odeur de brûlé) est toujours URGENT.
            - L'administrateur affecte la réclamation à un technicien, fixe la priorité et la clôture ;
              il gère salles, types d'équipement, utilisateurs et consulte « Statistiques & IA ».
            - Le technicien prend en charge, saisit ses interventions et marque la réclamation résolue ;
              il réalise aussi la maintenance préventive planifiée.
            - Une application Android ISETCare (téléchargeable depuis la page de connexion) donne
              les mêmes fonctions sur téléphone.
            Tu peux aussi donner des conseils de dépannage simples et sans danger (redémarrer,
            vérifier un câble, etc.). En cas de danger électrique ou d'incendie : dire de s'éloigner,
            prévenir l'administration et signaler la panne en priorité urgente.
            Tu n'as pas accès aux données de la base : si on te demande l'état d'une réclamation
            précise, indique où la consulter dans le site. N'invente jamais de numéros ou de noms.
            """;

    /** Réponse de l'assistant à partir de l'historique de la conversation (les 12 derniers messages). */
    public ChatReply discuter(List<ChatMessage> messages) {
        if (apiKey.isEmpty()) {
            return new ChatReply("L'assistant IA n'est pas encore activé sur ce serveur (clé Gemini manquante). "
                    + "Pour signaler une panne, utilisez « Signaler une panne » dans le menu ; "
                    + "pour suivre une demande, ouvrez « Mes réclamations ».", "hors-ligne");
        }
        List<Map<String, Object>> contents = new ArrayList<>();
        List<ChatMessage> recents = messages.subList(Math.max(0, messages.size() - 12), messages.size());
        for (ChatMessage m : recents) {
            if (m == null || m.text() == null || m.text().isBlank()) continue;
            String role = "model".equals(m.role()) ? "model" : "user";
            String texte = m.text().length() > 2000 ? m.text().substring(0, 2000) : m.text();
            contents.add(Map.of("role", role, "parts", List.of(Map.of("text", texte))));
        }
        if (contents.isEmpty()) return new ChatReply("Posez-moi votre question.", "hors-ligne");
        try {
            Map<String, Object> body = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", CHAT_CONSIGNES))),
                    "contents", contents,
                    "generationConfig", Map.of("temperature", 0.5, "maxOutputTokens", 800));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) throw new IllegalStateException("HTTP " + res.statusCode());
            StringBuilder texte = new StringBuilder();
            for (JsonNode part : json.readTree(res.body()).path("candidates").path(0).path("content").path("parts")) {
                if (part.hasNonNull("text") && !part.path("thought").asBoolean(false)) texte.append(part.get("text").asText());
            }
            if (texte.isEmpty()) throw new IllegalStateException("réponse vide");
            return new ChatReply(texte.toString().trim(), "gemini");
        } catch (Exception e) {
            log.warn("Assistant Gemini indisponible : {}", e.getMessage());
            return new ChatReply("L'assistant est momentanément indisponible. Réessayez dans un instant.", "hors-ligne");
        }
    }

    // --------------------------------------------- Recommandation de remplacement

    /**
     * Réparer / surveiller / remplacer, à partir de l'historique de l'équipement (US33).
     * Calcul déterministe et explicable : chaque raison est listée.
     */
    public AiRecommendation recommander(HistoriqueDto h, LocalDate dateAcquisition, Integer dureeVieMois) {
        double prix = h.prixAchat() == null ? 0 : h.prixAchat().doubleValue();
        double cout = h.coutCumule() == null ? 0 : h.coutCumule().doubleValue();
        double ratio = prix > 0 ? Math.round(100.0 * cout / prix) / 100.0 : 0;
        long pannes12 = h.reclamations().stream()
                .filter(r -> r.dateCreation() != null && r.dateCreation().isAfter(LocalDateTime.now().minusMonths(12)))
                .count();

        List<String> raisons = new ArrayList<>();
        int score = 0;
        if (ratio >= 0.8) { score += 50; raisons.add("Les réparations ont coûté " + pct(ratio) + " du prix d'achat."); }
        else if (ratio >= 0.4) { score += 25; raisons.add("Les réparations atteignent " + pct(ratio) + " du prix d'achat."); }
        else if (prix > 0) raisons.add("Coût des réparations faible (" + pct(ratio) + " du prix d'achat).");

        if (pannes12 >= 5) { score += 30; raisons.add(pannes12 + " pannes sur les 12 derniers mois : équipement peu fiable."); }
        else if (pannes12 >= 3) { score += 15; raisons.add(pannes12 + " pannes sur les 12 derniers mois."); }
        else raisons.add(pannes12 + " panne(s) sur les 12 derniers mois.");

        if (dateAcquisition != null && dureeVieMois != null && dureeVieMois > 0) {
            long age = ChronoUnit.MONTHS.between(dateAcquisition, LocalDate.now());
            if (age >= dureeVieMois) { score += 20; raisons.add("Durée de vie estimée dépassée (" + age + " mois / " + dureeVieMois + ")."); }
            else if (age >= dureeVieMois * 0.8) { score += 10; raisons.add("Proche de la fin de vie (" + age + " mois / " + dureeVieMois + ")."); }
        }
        if (h.dureeIndisponibiliteJours() >= 14) {
            score += 10;
            raisons.add(h.dureeIndisponibiliteJours() + " jours d'indisponibilité cumulés.");
        }

        score = Math.min(score, 100);
        String decision = score >= 60 ? "REMPLACER" : score >= 30 ? "SURVEILLER" : "REPARER";
        String message = switch (decision) {
            case "REMPLACER" -> "Le remplacement est recommandé : l'équipement coûte plus qu'il ne rapporte.";
            case "SURVEILLER" -> "À surveiller : pannes ou coûts en hausse, réévaluer à la prochaine panne.";
            default -> "La réparation reste rentable.";
        };
        return new AiRecommendation(decision, message, score, ratio, raisons);
    }

    private static String pct(double ratio) {
        return Math.round(ratio * 100) + " %";
    }
}
