# ISETCare : corrections et intégration (site web + application Android)

## Une seule base PostgreSQL pour le site et l'application

Le site (React + Spring Boot) et l'application Android utilisent maintenant **le même backend
et la même base PostgreSQL**. Une réclamation signalée sur le téléphone apparaît aussitôt sur
le site, et une affectation faite sur le site arrive dans l'application.

- Nouvelle API pour l'application : `/api/mobile/**` (`MobileController`). Les écritures
  réutilisent les règles du site (statuts, notifications, état des équipements, droits par rôle).
- Les mots de passe ne quittent jamais le serveur (BCrypt) ; l'application reçoit un token JWT.

## IA (Gemini)

Le site appelait `/api/ai/analyze` et `/api/ai/recommend-replacement`, mais **ces endpoints
n'existaient pas** (service Python absent) : l'IA ne pouvait jamais répondre.

- `IaService` : analyse par **Gemini** si `GEMINI_API_KEY` est défini (fichier
  `gemini-key.txt` à côté de `start.bat`), sinon classification par mots-clés.
- Règle de sécurité : fumée, étincelle, odeur de brûlé... → priorité **URGENTE** dans tous les cas.
- Recommandation réparer / surveiller / remplacer calculée et justifiée (coûts, pannes, âge).
- Même IA pour l'application Android (`/api/ia/analyser`).

## Bugs corrigés (backend)

1. **Interventions** : les endpoints renvoyaient les entités JPA brutes → erreur de sérialisation
   (relations LAZY) et risque d'exposer les mots de passe chiffrés. Ils renvoient maintenant des DTO.
2. Un technicien pouvait saisir une intervention sur **n'importe quelle** réclamation : seul le
   technicien affecté le peut désormais ; une réclamation résolue ne repasse plus « En cours ».
3. Erreurs `RuntimeException` (erreur 500) remplacées par des messages clairs (404, 403, 409).
4. `GET /api/interventions` : un technicien ne voit que ses interventions.

## Bugs corrigés (site web)

1. `npm run build` échouait (34 imports inutilisés) : le site ne pouvait pas être déployé.
2. Menu « Statistiques & IA » : la page n'existait pas (retour à l'accueil). Page créée
   (indicateurs, graphiques, aide à la décision IA).
3. Fiche réclamation : boutons de statut toujours refusés par le serveur, lien « Créer une
   intervention » vers une page inexistante, et aucune action administrateur. Corrigé :
   affectation, priorité, clôture (admin) ; prise en charge, intervention, résolution (technicien) ;
   photo et liste des interventions.
4. « Signaler une panne » : la suggestion de l'IA n'était jamais montrée au déclarant.
   Remplacée par une **pop-up de suggestion** (catégorie, priorité, cause probable, confiance),
   avec avertissement si la description change après l'analyse.
5. « Parc matériel » visible dans le menu du déclarant mais « Accès refusé » : corrigé.
6. ~60 classes CSS utilisées mais jamais définies (fenêtres modales, calendrier de maintenance,
   tableaux, badges...) : ajoutées dans `src/components.css`.
7. `api/client.ts` : un second intercepteur pouvait remplacer le token par une mauvaise valeur ;
   port par défaut corrigé (8081).

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Administrateur | admin@isetcare.tn | Admin123! |
| Technicien | technicien@isetcare.tn | Tech1234! |
| Déclarant | enseignant@isetcare.tn | Ens12345! |
