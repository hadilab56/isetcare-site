# Mettre ISETCare en ligne (gratuitement)

Le projet a 4 morceaux, chacun hébergé sur un service gratuit :

| Morceau | Service gratuit | Adresse obtenue (exemple) |
|---|---|---|
| Base de données PostgreSQL | **Neon** (neon.tech) | `ep-xxx.eu-central-1.aws.neon.tech` |
| API Spring Boot (`backend/`) | **Render** (render.com) | `https://isetcare-api.onrender.com` |
| Site React (`isetcare-frontend/`) | **Netlify** (netlify.com) | `https://isetcare.netlify.app` |
| Application Android (APK) | **GitHub Releases** | lien « Télécharger » de la page de connexion |
| IA (Gemini) | **Google AI Studio** | clé `GEMINI_API_KEY` |

Faites les étapes **dans l'ordre** : chaque étape a besoin de l'adresse de la précédente.

---

## 0. Envoyer le code sur GitHub

1. Sur github.com, créez un dépôt **vide** nommé `isetcare-site` (sans README).
2. Dans ce dossier, lancez :
   ```powershell
   git remote add origin https://github.com/<votre-compte>/isetcare-site.git
   git push -u origin main
   ```

## 1. Base de données : Neon

1. Créez un compte sur neon.tech, puis un projet (région Europe, ex. Frankfurt).
2. Dans **Connection details**, choisissez le format **Java / JDBC**. Vous obtenez :
   - `DB_URL` = `jdbc:postgresql://ep-xxx....neon.tech/neondb?sslmode=require`
   - `DB_USER` = `neondb_owner`
   - `DB_PASSWORD` = le mot de passe affiché
   Les tables et les comptes de démonstration sont créés automatiquement au premier démarrage de l'API.

## 2. Clé IA gratuite : Google AI Studio

1. Allez sur aistudio.google.com/apikey et cliquez **Create API key**.
2. Gardez la clé : c'est `GEMINI_API_KEY`. Elle reste sur le serveur, jamais dans le site.

## 3. API : Render

1. Créez un compte sur render.com (connexion avec GitHub).
2. **New → Blueprint**, choisissez le dépôt `isetcare-site` : Render lit `render.yaml`.
3. Renseignez `DB_URL`, `DB_USER`, `DB_PASSWORD`, `GEMINI_API_KEY`.
   Pour `CORS_ORIGINS`, mettez provisoirement `http://localhost:5173` (on le corrige à l'étape 4).
4. Attendez la fin du build (5 à 10 min la première fois), puis ouvrez
   `https://<votre-service>.onrender.com/api/health` → `{"status":"ok"}`.

> Offre gratuite Render : le serveur **s'endort après 15 min sans visite** ; la première requête
> suivante prend ~1 min. Les **photos envoyées** sont stockées sur le disque du serveur et
> **disparaissent à chaque redémarrage** (il faudrait un stockage externe pour les conserver).

## 4. Site : Netlify

1. Créez un compte sur netlify.com (connexion avec GitHub).
2. **Add new site → Import an existing project →** dépôt `isetcare-site`.
   Les réglages viennent de `netlify.toml` (dossier `isetcare-frontend`, commande `npm run build`).
3. **Site configuration → Environment variables**, ajoutez :
   - `VITE_API_URL` = `https://<votre-service>.onrender.com/api`
4. Lancez **Deploy**. Notez l'adresse du site (ex. `https://isetcare.netlify.app`, renommable dans
   *Site configuration → Change site name*).
5. Retournez sur Render → **Environment** → `CORS_ORIGINS` = l'adresse Netlify exacte
   (sans `/` à la fin), puis enregistrez (Render redémarre l'API).

## 5. Application Android : publier l'APK

1. Dans Android Studio (projet `Downloads\ISETCare`) :
   - (conseillé) dans `app/src/main/java/tn/isetrades/isetcare/network/ApiClient.java`, remplacez
     `DEFAULT_URL` par `https://<votre-service>.onrender.com/` pour que l'application se connecte
     directement au serveur en ligne ;
   - **Build → Generate Signed App Bundle / APK → APK**, version *release*.
2. Renommez le fichier obtenu en **`ISETCare.apk`** (nom exact attendu par le bouton).
3. Sur github.com/hadilab56/ISETCare → **Releases → Draft a new release**, tag `v1.0`,
   glissez `ISETCare.apk`, puis **Publish release**.
4. Le bouton « Télécharger » de la page de connexion pointe vers
   `https://github.com/hadilab56/ISETCare/releases/latest/download/ISETCare.apk`.
   Pour un autre lien (Google Play...), définissez `VITE_APK_URL` sur Netlify et redéployez.

Sur le téléphone, il faut autoriser l'installation depuis une « source inconnue ».

## 6. Après la mise en ligne

- Les comptes de démonstration (`admin@isetcare.tn` / `Admin123!`...) sont **publics** puisqu'ils
  sont affichés sur la page de connexion. Pour un vrai usage, changez ces mots de passe
  et retirez le bloc « Comptes de démonstration » de `LoginPage.tsx`.
- Chaque `git push` sur `main` redéploie automatiquement Netlify et Render.

## Modifier le code en local

```powershell
cd isetcare-frontend
npm install
npm run dev
```
L'API locale nécessite Java 17, Maven et PostgreSQL (voir `CORRECTIONS.md`).

## Ce qui a été ajouté pour la mise en ligne

- `backend/Dockerfile`, `render.yaml` : build et lancement de l'API sur Render.
- `application.yml` : base, port, CORS et dossier d'upload configurables par variables d'environnement.
- **Assistant IA** : bulle de discussion en bas à droite du site (`ChatWidget.tsx`), qui appelle
  `POST /api/ai/chat` → Gemini côté serveur. Les consignes de l'assistant sont dans
  `IaService.CHAT_CONSIGNES` : modifiez-les pour « entraîner » l'assistant sur vos informations
  (horaires, contacts, procédures de l'ISET...).
- **Bouton « Télécharger l'application »** sur la page de connexion.
- `netlify.toml` : build du site et redirections pour React Router.
