# 🎁 Jeu Instant Gagnant — Mister Coque × Arabian Seduct

Outil de jeu-concours **instantané** avec tirage pondéré côté serveur, QCM,
consentements RGPD et espace admin de validation des gains.

## Stack
- Frontend : HTML/CSS/JS **vanilla**, modules ES, **zéro dépendance**.
- Backend : **Node.js** (module `http` natif), **zéro dépendance**.
- Stockage : fichier JSON local (`data/db.json`), écritures atomiques.

## 🚀 Lancer
```bash
node server.js
```
- Jeu : http://localhost:8000
- Admin : http://localhost:8000/admin.html

Mot de passe admin par défaut (dev) : `mistercoque2025` — en production, si `ADMIN_PASSWORD` est absent, un mot de passe aléatoire est généré au démarrage.

Variables d'environnement optionnelles :
- `ADMIN_PASSWORD` : mot de passe admin.
- `ADMIN_SECRET` : secret de signature des jetons admin.
- `PORT` : port d'écoute (défaut 8000).

> ⚠️ Les modules ES imposent de passer par un serveur HTTP (ne pas ouvrir
> `index.html` directement en `file://`).

## ⚙️ Fonctionnement
- **Pyramide de gains** : 26 lots / 99 unités (`assets/lots.js`).
- **Tirage côté serveur** : pondéré par le stock restant, avec réservation.
- **Connexion automatique (admin)** : case « Connexion automatique » sur l'écran de connexion
  (cochée par défaut) — le mot de passe est mémorisé localement et reconnecte l'admin
  automatiquement à l'ouverture de la page.
- **Lots de secours** (`LOT_FALLBACK`) : tirés uniquement quand la pyramide est épuisée.
- **QCM** (`assets/questions.js`) : la **dernière question** est en choix unique (radio).
- **Consentements** : Règles + RGPD **obligatoires** (non pré-cochés), Marketing +
  Partenaires **facultatifs**. Le serveur refuse (400 `CONSENT_REQUIRED`) avant toute
  réservation si les consentements obligatoires manquent. IP, user-agent, versions et
  date sont stockés comme preuve.
- **Validation des gains (admin)** : chaque gain est créé en `pending`, puis **validé**
  (`approved`) ou **refusé** (`rejected`). La validation attribue le stock ; le refus le
  libère. L'admin peut aussi **supprimer** une participation (erreur / fraude / test),
  ce qui libère le stock et est tracé dans l'audit.

> ✅ Le parcours client reste **instantané** : le participant voit son gain immédiatement.
> L'admin garde simplement la main ensuite (valider, refuser, supprimer).

## 🔌 API
- `GET /healthz` (contrôle de santé)
- `POST /api/participate`
- `POST /api/admin/login`
- `GET /api/admin/participants`
- `GET /api/admin/prize-claims?status=&q=`
- `PATCH /api/admin/prize-claims/:id/approve`
- `PATCH /api/admin/prize-claims/:id/reject`
- `DELETE /api/admin/prize-claims/:id`
- `GET /api/admin/stocks`
- `GET /api/admin/audit`
- `GET /api/admin/export` (sauvegarde complète des données, fichier JSON)
- `GET /api/claims/:code` (vérification du code de retrait)

## 📁 Structure
```
mister-coque-jeu/
├── server.js          # Serveur HTTP + API (zéro dépendance)
├── package.json
├── server/
│   ├── store.js       # Stockage JSON atomique
│   └── auth.js        # Jetons admin HMAC
├── assets/
│   ├── lots.js        # Pyramide de gains + lots de secours
│   ├── questions.js   # Schéma du QCM (partagé front/back)
│   ├── config.js      # Versions des consentements
│   ├── api.js         # Client API (fetch)
│   ├── jeu.js         # Logique du jeu (formulaire + tirage)
│   ├── admin.js       # Interface admin
│   └── style.css
├── index.html
├── admin.html
└── data/db.json       # Données (généré au 1er lancement)
```

## 🔐 Sécurité
- Routes admin protégées par jeton HMAC signé (vérification du rôle côté serveur).
- Validation **serveur** obligatoire (consentements, champs, QCM, anti-doublon téléphone).
- Aucune décrémentation de stock côté client : tout passe par le serveur.
- Changez `ADMIN_PASSWORD` (et idéalement `ADMIN_SECRET`) avant la mise en production.

## 🚀 Mise en production

> ⚠️ Le jeu est une app **Node avec état** (tirage serveur + fichier `data/db.json`).
> Il ne peut **pas** tourner sur **Vercel** (serverless, pas de stockage persistant).
> Il s'exécute en **instance unique** : ne pas activer d'auto-scaling horizontal.

Fichiers fournis : `Dockerfile`, `docker-compose.yml`, `fly.toml`, `Procfile`,
`.env.example`, `start.bat` / `start.sh`.

### Option A — Railway (le plus simple, sans ligne de commande)
1. Pousse le dossier `mister-coque-jeu/` sur un dépôt GitHub.
2. Sur [Railway](https://railway.app) : **New Project → Deploy from GitHub repo** → choisis le dépôt (le `Dockerfile` est détecté automatiquement).
3. Ajoute un **Volume** monté sur `/app/data` (données persistantes).
4. Dans **Variables**, ajoute `ADMIN_PASSWORD` (mot de passe admin) et `ADMIN_SECRET` (chaîne longue et aléatoire).
5. Railway fournit une URL HTTPS (`https://<app>.up.railway.app`). Pour un domaine personnalisé `jeu.mistercoque.fr`, ajoute un CNAME vers cette URL.

### Option B — Fly.io (config fournie)
```bash
fly launch --no-deploy          # nom de l'app + région (cdg = Paris)
fly volumes create jeu_data --size 1
fly secrets set ADMIN_PASSWORD=... ADMIN_SECRET=...
fly deploy
fly certs add jeu.mistercoque.fr
```
> Nécessite le [CLI Fly.io](https://fly.io/docs/flyctl/install/).

### Option C — VPS / machine avec Docker
```bash
cd mister-coque-jeu
cp .env.example .env           # renseigner ADMIN_PASSWORD + ADMIN_SECRET
docker compose up -d --build
```
Redémarrage automatique (`restart: unless-stopped`), données conservées dans le volume `jeu_data`.

### Option D — Render (gratuit, sans carte, déploiement automatique) ✅
1. Le fichier `render.yaml` est déjà fourni à la racine.
2. Sur [Render](https://render.com) : **New → Blueprint** → connecte le dépôt GitHub → **Apply**.
3. Choisis le plan **Free** (service `mister-coque-jeu`).
4. `ADMIN_PASSWORD` et `ADMIN_SECRET` sont générés automatiquement (lisibles dans l'onglet **Environment**).
5. URL fournie : `https://mister-coque-jeu.onrender.com` (HTTPS inclus).

> ⚠️ Le tier gratuit Render n'a **pas de disque persistant** : `data/db.json` survit à la
> mise en veille mais est **effacé à chaque redéploiement**. Avant toute mise à jour du code,
> clique sur **💾 Exporter** dans l'espace admin pour télécharger une sauvegarde complète.

### Rappels sécurité
- Définis **`ADMIN_PASSWORD`** et **`ADMIN_SECRET`** (jamais les valeurs par défaut).
- En production sans `ADMIN_PASSWORD`, un mot de passe **aléatoire** est généré et
  affiché dans les logs au démarrage.
- Conserve le volume `data/` : il contient participants, gains et audit (preuves RGPD).
- Endpoint de santé : `GET /healthz` (200 si OK).
