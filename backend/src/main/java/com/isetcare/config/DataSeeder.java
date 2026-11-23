package com.isetcare.config;

import com.isetcare.model.*;
import com.isetcare.repository.*;
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
                           PasswordEncoder encoder) {
        return args -> {
            if (users.count() > 0) return;

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
                String[] pannes = {
                        "Le projecteur ne s'allume plus, voyant lampe clignotant rouge.",
                        "Impossible de se connecter au réseau filaire (pas d'adresse IP attribuée).",
                        "Bruit anormal et fort au niveau du compresseur du climatiseur.",
                        "Écran bleu récurrent sur le poste de travail pendant les cours pratiques.",
                        "Bourrage papier persistant dans le bac d'alimentation de l'imprimante."
                };

                String[] diagnostics = {
                        "Lampe du vidéoprojecteur hors service suite à une surtension, remplacement effectué.",
                        "Câble RJ45 sectionné au niveau de la goulotte murale, nouveau sertissage réalisé.",
                        "Manque de fluide frigorigène (fuite sur raccord) + nettoyage complet des filtres.",
                        "Barrette de RAM défectueuse détectée par diagnostic MemTest, remplacement effectué.",
                        "Nettoyage des galets d'entraînement et du four de fusion."
                };

                StatutReclamation[] statuts = {
                        StatutReclamation.NOUVEAU,
                        StatutReclamation.EN_COURS,
                        StatutReclamation.RESOLU,
                        StatutReclamation.CLOTURE
                };

                Priorite[] priorites = {
                        Priorite.BASSE,
                        Priorite.MOYENNE,
                        Priorite.HAUTE,
                        Priorite.URGENTE
                };

                for (int i = 1; i <= 20; i++) {
                    Equipement eqAleatoire = tousEquipements.get(random.nextInt(tousEquipements.size()));
                    Utilisateur declarantAleatoire = listeDeclarants.get(random.nextInt(listeDeclarants.size()));
                    Utilisateur techAleatoire = listeTechniciens.get(random.nextInt(listeTechniciens.size()));

                    Reclamation rec = new Reclamation();
                    rec.setDescription(pannes[random.nextInt(pannes.length)] + " (Ticket #" + i + ")");
                    rec.setPriorite(priorites[random.nextInt(priorites.length)]);

                    // On répartit les statuts
                    StatutReclamation statutActuel = statuts[random.nextInt(statuts.length)];
                    rec.setStatut(statutActuel);
                    rec.setDateCreation(LocalDateTime.now().minusDays(random.nextInt(15)).minusHours(random.nextInt(24)));
                    rec.setEquipement(eqAleatoire);
                    rec.setDeclarant(declarantAleatoire);

                    // Si le statut n'est pas NOUVELLE, on lui assigne un technicien
                    if (statutActuel != StatutReclamation.NOUVEAU) {
                        rec.setTechnicienAffecte(techAleatoire);
                    }

                    Reclamation savedRec = reclamations.save(rec);

                    // Si la réclamation est EN_COURS, RESOLUE ou CLOTUREE, on crée une Intervention associée
                    if (statutActuel != StatutReclamation.NOUVEAU) {
                        Intervention inter = new Intervention();
                        inter.setDiagnostic(diagnostics[random.nextInt(diagnostics.length)]);
                        inter.setActionEffectuee("Intervention sur site effectuée. Vérification des paramètres et tests de bon fonctionnement.");
                        inter.setDateDebut(savedRec.getDateCreation().plusHours(2));

                        if (statutActuel == StatutReclamation.RESOLU || statutActuel == StatutReclamation.CLOTURE) {
                            inter.setDateFin(savedRec.getDateCreation().plusHours(5));
                            inter.setResultat("Réparé avec succès");
                        } else {
                            inter.setResultat("En cours de diagnostic approfondi");
                        }

                        inter.setCout(BigDecimal.valueOf(50 + random.nextInt(350)));
                        inter.setReclamation(savedRec);
                        inter.setTechnicien(techAleatoire);

                        interventions.save(inter);
                    }
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
        return e;
    }
}