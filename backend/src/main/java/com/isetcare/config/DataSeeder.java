package com.isetcare.config;

import com.isetcare.model.*;
import com.isetcare.repository.*;
import com.isetcare.service.EtatSyncService;
import com.isetcare.service.NotificationService;
import net.datafaker.Faker;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(UtilisateurRepository users,
                           SalleRepository salles,
                           TypeEquipementRepository types,
                           EquipementRepository equipements,
                           ReclamationRepository reclamations,
                           InterventionRepository interventions,
                           AnalyseIARepository analyses,
                           MaintenanceRepository maintenances,
                           EtatSyncService etatSync,
                           NotificationService notifications,
                           PasswordEncoder encoder) {
        return args -> {
            if (users.count() > 0) {
                // Garde-fou : sans administrateur actif, plus personne ne peut gérer le site.
                // On restaure alors le compte admin de démonstration.
                boolean adminActif = users.findByRole(Role.ADMINISTRATEUR).stream().anyMatch(Utilisateur::isActif);
                if (!adminActif) {
                    Utilisateur admin = users.findByEmail("admin@isetcare.tn").orElse(null);
                    if (admin == null) {
                        users.save(user("Admin", "ISET", "admin@isetcare.tn", "Admin123!", Role.ADMINISTRATEUR,
                                null, null, null, encoder));
                    } else {
                        admin.setRole(Role.ADMINISTRATEUR);
                        admin.setActif(true);
                        users.save(admin);
                    }
                }
                return;
            }

            Faker faker = new Faker(Locale.FRENCH);
            Random random = new Random();

            // 1. COMPTES DE TEST FIXES (Pour vos connexions de démonstration)
            users.save(user("Admin", "ISET", "admin@isetcare.tn", "Admin123!", Role.ADMINISTRATEUR, null, null, null, encoder));
            users.save(user("Ben Ali", "Karim", "technicien@isetcare.tn", "Tech1234!", Role.TECHNICIEN, "Informatique", null, null, encoder));
            users.save(user("Trabelsi", "Sonia", "enseignant@isetcare.tn", "Ens12345!", Role.DECLARANT, null, "Informatique", "Enseignante", encoder));

            // 2. GÉNÉRATION DE TECHNICIENS SUPPLÉMENTAIRES
            String[] specialites = {"Informatique", "Électronique & Réseaux", "Climatisation", "Électricité générale"};
            for (int i = 0; i < 4; i++) {
                String nom = faker.name().lastName();
                String prenom = faker.name().firstName();
                String email = nettoyerEmail(prenom + "." + nom) + "@isetcare.tn";
                users.save(user(nom, prenom, email, "Tech1234!", Role.TECHNICIEN, specialites[i], null, null, encoder));
            }

            // 3. GÉNÉRATION DE 15 DÉCLARANTS (Enseignants & Personnel)
            String[] departements = {"Informatique", "Génie Électrique", "Génie Mécanique", "Sciences Économiques", "Administration"};
            String[] fonctions = {"Enseignant(e)", "Chef de département", "Technicien(ne) de labo", "Agent administratif"};
            for (int i = 0; i < 15; i++) {
                String nom = faker.name().lastName();
                String prenom = faker.name().firstName();
                String email = nettoyerEmail(prenom + "." + nom) + (i + 1) + "@isetcare.tn";
                String dept = departements[random.nextInt(departements.length)];
                String fct = fonctions[random.nextInt(fonctions.length)];
                users.save(user(nom, prenom, email, "Ens12345!", Role.DECLARANT, null, dept, fct, encoder));
            }

            // 4. TYPES D'ÉQUIPEMENTS
            TypeEquipement pc = types.save(type("PC de laboratoire", 6, 60));
            TypeEquipement imprimante = types.save(type("Imprimante", 3, 48));
            TypeEquipement datashow = types.save(type("Vidéoprojecteur / Datashow", 6, 72));
            TypeEquipement clim = types.save(type("Climatiseur", 4, 120));
            TypeEquipement switchReseau = types.save(type("Switch Réseau", 12, 84));

            // 5. SALLES
            List<Salle> listeSalles = new ArrayList<>();
            listeSalles.add(salles.save(salle("Salle INFO-1", "Bloc A", 1)));
            listeSalles.add(salles.save(salle("Salle INFO-2", "Bloc A", 1)));
            listeSalles.add(salles.save(salle("Labo Réseaux", "Bloc A", 2)));
            listeSalles.add(salles.save(salle("Labo Électronique", "Bloc B", 0)));
            listeSalles.add(salles.save(salle("Amphi Ibn Khaldoun", "Bloc B", 0)));
            listeSalles.add(salles.save(salle("Salle Cours B12", "Bloc B", 1)));
            listeSalles.add(salles.save(salle("Salle des Enseignants", "Bloc C", 0)));

            // Liste pour stocker tous les équipements générés
            List<Equipement> tousEquipements = new ArrayList<>();

            // 6. GÉNÉRATION DE 30 PC DE LABORATOIRE
            String[] marquesPC = {"HP", "Dell", "Lenovo", "Asus"};
            String[] modelesPC = {"ProDesk 400 G7", "OptiPlex 7090", "ThinkCentre M70q", "ExpertCenter D5"};

            for (int i = 1; i <= 30; i++) {
                int idx = random.nextInt(marquesPC.length);
                Salle salleAttribuee = listeSalles.get(i % listeSalles.size());
                tousEquipements.add(equipements.save(equipement(
                        String.format("PC-%03d", i),
                        marquesPC[idx],
                        modelesPC[idx],
                        faker.bothify("SN-PC-######??").toUpperCase(),
                        LocalDate.now().minusDays(random.nextInt(1000)),
                        BigDecimal.valueOf(1500 + random.nextInt(900)),
                        salleAttribuee,
                        pc
                )));
            }

            // 7. GÉNÉRATION DE DATASHOWS & CLIMATISEURS DANS TOUTES LES SALLES
            int num = 1;
            for (Salle s : listeSalles) {
                tousEquipements.add(equipements.save(equipement(
                        String.format("DS-%03d", num),
                        "Epson",
                        "EB-X49",
                        faker.bothify("SN-DS-######??").toUpperCase(),
                        LocalDate.now().minusDays(random.nextInt(1200)),
                        new BigDecimal("1450.00"),
                        s,
                        datashow
                )));

                tousEquipements.add(equipements.save(equipement(
                        String.format("CLIM-%03d", num),
                        random.nextBoolean() ? "LG" : "Samsung",
                        "Inverter 18000 BTU",
                        faker.bothify("SN-CL-######??").toUpperCase(),
                        LocalDate.now().minusDays(random.nextInt(1500)),
                        new BigDecimal("2400.00"),
                        s,
                        clim
                )));
                num++;
            }

            // 8. QUELQUES IMPRIMANTES ET SWITCHS RÉSEAUX
            for (int i = 1; i <= 4; i++) {
                tousEquipements.add(equipements.save(equipement(
                        String.format("IMP-%03d", i),
                        random.nextBoolean() ? "HP" : "Brother",
                        "LaserJet Pro M404dn",
                        faker.bothify("SN-IMP-#####??").toUpperCase(),
                        LocalDate.now().minusDays(random.nextInt(800)),
                        new BigDecimal("780.00"),
                        listeSalles.get(listeSalles.size() - 1),
                        imprimante
                )));
            }

            for (int i = 1; i <= 3; i++) {
                tousEquipements.add(equipements.save(equipement(
                        String.format("SW-%03d", i),
                        "Cisco",
                        "Catalyst 2960-X",
                        faker.bothify("SN-SW-#####??").toUpperCase(),
                        LocalDate.now().minusDays(random.nextInt(1100)),
                        new BigDecimal("3100.00"),
                        listeSalles.get(2),
                        switchReseau
                )));
            }

            // 9. GÉNÉRATION DE 20 RÉCLAMATIONS ET INTERVENTIONS DE TEST
            List<Utilisateur> listeTechniciens = users.findAll().stream()
                    .filter(u -> u.getRole() == Role.TECHNICIEN)
                    .toList();

            List<Utilisateur> listeDeclarants = users.findAll().stream()
                    .filter(u -> u.getRole() == Role.DECLARANT)
                    .toList();

            if (!listeTechniciens.isEmpty() && !listeDeclarants.isEmpty() && !tousEquipements.isEmpty()) {
                // Comptes de démonstration : on leur donne des réclamations pour que chaque rôle ait quelque chose à voir
                Utilisateur techDemo = users.findByEmail("technicien@isetcare.tn").orElseThrow();
                Utilisateur declarantDemo = users.findByEmail("enseignant@isetcare.tn").orElseThrow();

                // Tout le cycle de vie, 4 réclamations par statut ; les plus anciennes sont les plus avancées
                StatutReclamation[] cycle = {
                        StatutReclamation.CLOTURE, StatutReclamation.RESOLU, StatutReclamation.EN_COURS,
                        StatutReclamation.AFFECTEE, StatutReclamation.NOUVEAU
                };
                List<Equipement> melange = new ArrayList<>(tousEquipements);
                java.util.Collections.shuffle(melange, random);
                java.util.Set<Equipement> touches = new java.util.LinkedHashSet<>();

                for (int i = 0; i < 20; i++) {
                    Equipement eq = melange.get(i);
                    List<Panne> possibles = pannesPour(eq.getType().getLibelle());
                    Panne p = possibles.get(random.nextInt(possibles.size()));
                    StatutReclamation statut = cycle[i / 4];
                    Utilisateur declarant = i % 3 == 0 ? declarantDemo : listeDeclarants.get(random.nextInt(listeDeclarants.size()));
                    Utilisateur tech = i % 2 == 0 ? techDemo : listeTechniciens.get(random.nextInt(listeTechniciens.size()));
                    // CLOTURE : il y a 16 à 20 jours ... NOUVEAU : dans les 2 derniers jours
                    int ageJours = (4 - i / 4) * 4 + random.nextInt(3);
                    LocalDateTime creation = LocalDateTime.now().minusDays(ageJours).minusHours(random.nextInt(8));

                    Reclamation rec = new Reclamation();
                    rec.setDescription(p.description());
                    rec.setCategorie(p.categorie());
                    rec.setPriorite(p.priorite());
                    rec.setStatut(statut);
                    rec.setDateCreation(creation);
                    rec.setEquipement(eq);
                    rec.setDeclarant(declarant);
                    if (statut != StatutReclamation.NOUVEAU) rec.setTechnicienAffecte(tech);
                    rec = reclamations.save(rec);

                    // Suggestion de l'IA enregistrée au moment du signalement
                    AnalyseIA analyse = new AnalyseIA();
                    analyse.setReclamation(rec);
                    analyse.setCategorieSuggeree(p.categorie());
                    analyse.setPrioriteSuggeree(p.priorite());
                    analyse.setTypePanneProbable(p.typePanne());
                    analyse.setScoreConfiance(0.75f + random.nextInt(20) / 100f);
                    analyses.save(analyse);

                    // EN_COURS : intervention commencée ; RESOLU / CLOTURE : intervention terminée
                    if (statut == StatutReclamation.EN_COURS || statut == StatutReclamation.RESOLU
                            || statut == StatutReclamation.CLOTURE) {
                        Intervention inter = new Intervention();
                        inter.setReclamation(rec);
                        inter.setTechnicien(tech);
                        inter.setDiagnostic(p.diagnostic());
                        inter.setDateDebut(creation.plusHours(20));
                        if (statut == StatutReclamation.EN_COURS) {
                            inter.setActionEffectuee("Diagnostic réalisé, pièce de rechange commandée.");
                            inter.setResultat("En attente de la pièce");
                            inter.setCout(BigDecimal.valueOf(30));
                        } else {
                            inter.setActionEffectuee(p.action());
                            inter.setDateFin(creation.plusHours(22 + random.nextInt(24)));
                            inter.setResultat("Réparé, équipement remis en service");
                            inter.setCout(BigDecimal.valueOf(40 + random.nextInt(260)));
                        }
                        interventions.save(inter);
                    }

                    // Notifications, comme le ferait l'application
                    String ref = "Réclamation #" + rec.getId() + " (" + eq.getReference() + ")";
                    if (statut == StatutReclamation.NOUVEAU)
                        notifications.notifierAdmins(TypeNotification.NOUVELLE_RECLAMATION,
                                "Nouvelle réclamation #" + rec.getId() + " (" + eq.getReference() + ") : " + p.description());
                    else if (statut == StatutReclamation.AFFECTEE || statut == StatutReclamation.EN_COURS)
                        notifications.notifier(tech, TypeNotification.NOUVELLE_RECLAMATION, ref + " vous a été affectée.");
                    if (statut == StatutReclamation.RESOLU)
                        notifications.notifier(declarant, TypeNotification.CHANGEMENT_STATUT, ref + " est résolue.");
                    touches.add(eq);
                }

                // État des équipements : en panne / en maintenance selon leurs réclamations ouvertes
                for (Equipement eq : touches) etatSync.synchroniser(eq);

                // Maintenance préventive : réalisées, en retard, à venir (dont une dans 2 jours -> rappel)
                int[] decalages = {-60, -30, -5, 2, 6, 14, 21, 35};
                for (int k = 0; k < decalages.length; k++) {
                    Equipement eq = melange.get(20 + k);
                    MaintenancePreventive m = new MaintenancePreventive();
                    m.setEquipement(eq);
                    m.setTechnicien(k % 2 == 0 ? techDemo : listeTechniciens.get(random.nextInt(listeTechniciens.size())));
                    m.setFrequenceMois(eq.getType().getFrequenceMaintenanceMois());
                    m.setDatePlanifiee(LocalDate.now().plusDays(decalages[k]));
                    if (decalages[k] <= -30) {
                        m.setStatut(StatutMaintenance.REALISEE);
                        m.setDateRealisation(m.getDatePlanifiee().plusDays(1));
                        m.setRapport("Nettoyage, contrôle général et tests : RAS.");
                    } else if (decalages[k] < 0) {
                        m.setStatut(StatutMaintenance.EN_RETARD);
                    } else {
                        m.setStatut(StatutMaintenance.PLANIFIEE);
                    }
                    maintenances.save(m);
                }
            }

            System.out.println(">>> [DataSeeder] Base de données IsetCare enrichie avec succès : Utilisateurs, Équipements, Réclamations et Interventions créés ! <<<");
        };
    }

    // --- Méthodes utilitaires ---

    private static String nettoyerEmail(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return normalized.replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
                .replaceAll("[^a-zA-Z0-9.]", "")
                .toLowerCase();
    }

    private static Utilisateur user(String nom, String prenom, String email, String pwd, Role role,
                                    String specialite, String departement, String fonction, PasswordEncoder enc) {
        Utilisateur u = new Utilisateur();
        u.setNom(nom);
        u.setPrenom(prenom);
        u.setEmail(email);
        u.setMotDePasse(enc.encode(pwd));
        u.setRole(role);
        u.setSpecialite(specialite);
        u.setDepartement(departement);
        u.setFonction(fonction);
        return u;
    }

    private static TypeEquipement type(String libelle, int freq, int vie) {
        TypeEquipement t = new TypeEquipement();
        t.setLibelle(libelle);
        t.setFrequenceMaintenanceMois(freq);
        t.setDureeVieEstimeeMois(vie);
        return t;
    }

    private static Salle salle(String nom, String batiment, int etage) {
        Salle s = new Salle();
        s.setNom(nom);
        s.setBatiment(batiment);
        s.setEtage(etage);
        return s;
    }

    private static Equipement equipement(String ref, String marque, String modele, String sn,
                                         LocalDate dateAcq, BigDecimal prix, Salle salle, TypeEquipement type) {
        Equipement e = new Equipement();
        e.setReference(ref);
        e.setMarque(marque);
        e.setModele(modele);
        e.setNumeroSerie(sn);
        e.setDateAcquisition(dateAcq);
        e.setPrixAchat(prix);
        e.setSalle(salle);
        e.setType(type);
        e.setQrCode("ISETCARE:" + ref);
        return e;
    }

    /** Une panne type, cohérente avec le type d'équipement : symptôme signalé, puis diagnostic et réparation. */
    private record Panne(String description, String categorie, Priorite priorite,
                         String typePanne, String diagnostic, String action) {}

    private static List<Panne> pannesPour(String libelleType) {
        return switch (libelleType) {
            case "PC de laboratoire" -> List.of(
                    new Panne("Écran bleu récurrent pendant les travaux pratiques.", "Informatique", Priorite.MOYENNE,
                            "Mémoire vive défectueuse", "Barrette de RAM défectueuse détectée par MemTest86.",
                            "Remplacement de la barrette de RAM 8 Go, tests de stabilité concluants."),
                    new Panne("Le poste ne démarre plus, aucun voyant ne s'allume.", "Informatique", Priorite.HAUTE,
                            "Alimentation hors service", "Bloc d'alimentation grillé.",
                            "Remplacement du bloc d'alimentation 300 W, démarrage vérifié."),
                    new Panne("Pas d'accès au réseau : le poste n'obtient pas d'adresse IP.", "Réseau", Priorite.MOYENNE,
                            "Câble réseau endommagé", "Câble RJ45 sectionné dans la goulotte murale.",
                            "Nouveau câble et sertissage, test de connectivité réussi."));
            case "Imprimante" -> List.of(
                    new Panne("Bourrage papier persistant dans le bac d'alimentation.", "Impression", Priorite.BASSE,
                            "Galets d'entraînement usés", "Galets d'entraînement lisses et encrassés.",
                            "Nettoyage puis remplacement des galets, 50 pages de test sans bourrage."),
                    new Panne("Impressions pâles avec des traînées grises.", "Impression", Priorite.BASSE,
                            "Toner épuisé", "Toner presque vide et tambour encrassé.",
                            "Remplacement du toner et nettoyage du tambour."));
            case "Vidéoprojecteur / Datashow" -> List.of(
                    new Panne("Le projecteur ne s'allume plus, le voyant lampe clignote en rouge.", "Audiovisuel", Priorite.HAUTE,
                            "Lampe grillée", "Lampe hors service après une surtension.",
                            "Remplacement de la lampe et remise à zéro du compteur d'heures."),
                    new Panne("Image floue et couleurs jaunâtres pendant les cours.", "Audiovisuel", Priorite.MOYENNE,
                            "Surchauffe du projecteur", "Filtre à air colmaté, surchauffe du bloc optique.",
                            "Nettoyage du filtre et réglage de la mise au point."));
            case "Climatiseur" -> List.of(
                    new Panne("Bruit anormal et fort au niveau du compresseur.", "Climatisation", Priorite.MOYENNE,
                            "Compresseur mal fixé", "Fixations du compresseur desserrées.",
                            "Resserrage et pose de silentblocs neufs."),
                    new Panne("Le climatiseur souffle de l'air tiède, il ne refroidit plus.", "Climatisation", Priorite.HAUTE,
                            "Manque de fluide frigorigène", "Fuite sur un raccord du circuit frigorifique.",
                            "Réparation du raccord, recharge en R32 et nettoyage des filtres."),
                    new Panne("Odeur de brûlé et étincelles près du boîtier électrique.", "Électricité", Priorite.URGENTE,
                            "Court-circuit électrique", "Bornier d'alimentation carbonisé.",
                            "Remplacement du bornier et contrôle du disjoncteur."));
            default -> List.of(
                    new Panne("Plusieurs postes du laboratoire n'ont plus de réseau.", "Réseau", Priorite.HAUTE,
                            "Port du switch défaillant", "Port uplink défaillant sur le switch.",
                            "Basculement sur un port de secours et mise à jour du firmware."));
        };
    }
}