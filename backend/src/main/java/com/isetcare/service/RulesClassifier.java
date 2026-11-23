package com.isetcare.service;

import com.isetcare.dto.AiDtos.AiAnalysis;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Classification par mots-clés : utilisée quand Gemini n'est pas configuré ou ne répond pas.
 * Résultat explicable (utile pour la soutenance) : on sait quels mots ont déclenché la décision.
 */
public final class RulesClassifier {

    public static final String[] CATEGORIES =
            {"Réseau", "Informatique", "Audiovisuel", "Impression", "Climatisation", "Électricité", "Autre"};

    private static final Map<String, String[]> MOTS = new LinkedHashMap<>();

    static {
        MOTS.put("Réseau", new String[]{"wifi", "wi-fi", "internet", "connexion", "reseau", "routeur", "switch",
                "ethernet", "rj45", "cable reseau", "point d'acces", "debit"});
        MOTS.put("Informatique", new String[]{"pc", "ordinateur", "ecran", "clavier", "souris", "demarre", "windows",
                "bloque", "lent", "unite centrale", "disque", "session", "virus", "logiciel"});
        MOTS.put("Audiovisuel", new String[]{"projecteur", "videoprojecteur", "datashow", "hdmi", "vga", "television",
                "tv", "image", "telecommande", "lampe", "son", "haut-parleur"});
        MOTS.put("Impression", new String[]{"imprimante", "imprime", "papier", "toner", "cartouche", "bourrage",
                "scanner", "photocopieuse", "encre"});
        MOTS.put("Climatisation", new String[]{"clim", "climatiseur", "climatisation", "froid", "chaud",
                "fuite d'eau", "filtre", "temperature", "ventilation"});
        MOTS.put("Électricité", new String[]{"prise", "courant", "electrique", "electricite", "eclairage", "lumiere",
                "neon", "disjoncteur", "interrupteur", "etincelle", "alimentation"});
    }

    /** Risque pour les personnes : priorité URGENTE quoi qu'il arrive (règle de sécurité). */
    private static final String[] DANGER = {"fumee", "brule", "etincelle", "odeur de brule", "feu", "incendie",
            "court-circuit", "electrocution", "danger", "fils denudes"};
    private static final String[] HAUTE = {"urgent", "examen", "plus de connexion", "ne demarre", "ne s'allume",
            "coupe", "tous les", "toute la salle", "aucun", "impossible", "bloque"};
    private static final String[] BASSE = {"lent", "bruit", "parfois", "rayure", "leger", "de temps en temps",
            "un peu", "sale", "esthetique"};

    private RulesClassifier() {}

    public static AiAnalysis analyser(String description, String typeEquipement) {
        String texte = normaliser(description);
        String type = normaliser(typeEquipement);

        Map<String, Double> scores = new LinkedHashMap<>();
        String meilleure = "Autre";
        String motDeclencheur = null;
        double meilleurScore = 0, total = 0;
        for (Map.Entry<String, String[]> e : MOTS.entrySet()) {
            double score = 0;
            String premier = null;
            for (String mot : e.getValue()) {
                if (contientMot(texte, mot)) { score += 1; if (premier == null) premier = mot; }
                if (!type.isEmpty() && contientMot(type, mot)) score += 1.5;
            }
            scores.put(e.getKey(), score);
            total += score;
            if (score > meilleurScore) { meilleurScore = score; meilleure = e.getKey(); motDeclencheur = premier; }
        }
        Map<String, Double> confiances = new LinkedHashMap<>();
        for (var e : scores.entrySet())
            confiances.put(e.getKey(), total == 0 ? 0 : Math.round(100 * e.getValue() / total) / 100.0);

        boolean danger = contientUn(texte, DANGER);
        String priorite = danger ? "URGENTE"
                : contientUn(texte, HAUTE) ? "HAUTE"
                : contientUn(texte, BASSE) ? "BASSE" : "MOYENNE";
        if ("Réseau".equals(meilleure) && "MOYENNE".equals(priorite)) priorite = "HAUTE"; // toute une salle touchée

        double confiance = total == 0 ? 0.40 : Math.min(0.95, 0.55 + 0.40 * (meilleurScore / total));
        String typePanne = motDeclencheur == null ? "Non déterminé" : "Problème lié à « " + motDeclencheur + " »";
        String explication = danger ? "Mot lié à un danger détecté : priorité urgente (règle de sécurité)."
                : motDeclencheur == null ? "Aucun mot-clé reconnu : catégorie à vérifier."
                : "Mots-clés reconnus dans la description (ex. « " + motDeclencheur + " »).";
        return new AiAnalysis(meilleure, typePanne, priorite, Math.round(confiance * 100) / 100.0, confiances,
                danger, confiance < 0.6, "regles", explication);
    }

    static boolean contientDanger(String description) {
        return contientUn(normaliser(description), DANGER);
    }

    private static boolean contientUn(String texte, String[] mots) {
        for (String m : mots) if (texte.contains(m)) return true;
        return false;
    }

    private static boolean contientMot(String texte, String mot) {
        int i = texte.indexOf(mot);
        while (i >= 0) {
            boolean debut = i == 0 || !Character.isLetterOrDigit(texte.charAt(i - 1));
            int fin = i + mot.length();
            boolean suite = fin >= texte.length() || !Character.isLetterOrDigit(texte.charAt(fin)) || mot.length() >= 5;
            if (debut && suite) return true;
            i = texte.indexOf(mot, i + 1);
        }
        return false;
    }

    public static String normaliser(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "").replace('’', '\'');
    }
}
