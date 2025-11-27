# Jeu musical de classe

Application web simple (Node.js + Express, front en HTML/CSS/JS) pour organiser un jeu musical avec inscriptions, soumissions de morceaux, votes et affichage des résultats.

## Lancement

Prérequis: Node.js installé.

```bash
# Depuis le dossier du projet
npm install
npm start
# Ouvrir http://localhost:3000
```

## Pages
- `/index.html` — Accueil
- `/register.html` — Inscription (prénom), stocke `userId` dans localStorage
- `/submit.html` — Soumettre un titre + artiste + lien audio optionnel (YouTube/Spotify/MP3)
- `/vote.html` — Voter: deviner à qui appartient chaque chanson (sélectionner un prénom)
- `/admin.html` — Admin: voir toutes les chansons, jouer le lien, reset chansons+votes
	- Affiche aussi les scores et les détails des votes

## API
- `POST /api/register` — body: `{ firstName }`
- `GET  /api/users`
- `POST /api/submit-song` — body: `{ userId, title, artist, audioUrl? }`
- `GET  /api/songs`
- `POST /api/vote` — body: `{ voterUserId, songId, guessedUserId }`
- `GET  /api/results`
- `POST /api/reset`

## Stockage
- Fichier `data/db.json` contient `{ users: [], songs: [], votes: [] }`.
- Sauvegarde synchrone simple (suffisant pour usage en classe). Pour production, utiliser une base.

## Déploiement sur Vercel
- Le projet inclut `api/index.js` (handler serverless) et `vercel.json` (rewrites) pour faire tourner l'app sur Vercel.
- Les fichiers statiques du front sont servis depuis `public/` par Vercel.
- La page admin est protégée par code et servie depuis `views/admin.html` via la route `/admin` (et `/admin.html`).
- Important: en environnement Vercel, le stockage est en mémoire (temporaire et non persistant). Les données peuvent être perdues au redéploiement ou au redémarrage de l'instance. Pour persistance, connecter une base (ex: Vercel KV, Supabase, etc.).

### Déployer
```bash
# Option A: via le CLI
npm i -g vercel
vercel

# Option B: via le dashboard Vercel
# - Importer le repo
# - Root: le dossier du projet (avec package.json)
# - Aucun build step requis pour le backend; static depuis public/
```

## Notes
- Le serveur interdit de voter pour sa propre chanson et un seul vote par chanson.
- Les commentaires dans le code expliquent chaque partie.
- Design minimaliste et responsive.
