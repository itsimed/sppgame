// Construction de l'application Express (réutilisable en local et sur Vercel)
const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const db = require('./db');

// Singleton global pour l'app Express
let appInstance = null;

function createApp() {
  if (appInstance) return appInstance;
  
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookies / Auth admin simple
  function parseCookies(req) {
    const header = req.headers.cookie || '';
    return Object.fromEntries(
      header.split(';').map(v => v.trim()).filter(Boolean).map(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return [pair, ''];
        return [decodeURIComponent(pair.slice(0, idx)), decodeURIComponent(pair.slice(1 + idx))];
      })
    );
  }
  const ADMIN_CODE = '13091996';
  function requireAdmin(req, res, next) {
    const cookies = parseCookies(req);
    if (cookies.admin_code === ADMIN_CODE) return next();
    if (req.accepts(['html', 'json']) === 'html') return res.redirect('/admin-login.html');
    return res.status(401).json({ error: 'Non autorisé' });
  }

  // Favicon (évite erreur 500)
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // API
  app.post('/api/admin/login', (req, res) => {
    const { code } = req.body || {};
    if (String(code) === ADMIN_CODE) {
      res.setHeader('Set-Cookie', `admin_code=${ADMIN_CODE}; Path=/; HttpOnly; SameSite=Lax`);
      return res.json({ success: true });
    }
    return res.status(401).json({ error: 'Code incorrect' });
  });

  app.post('/api/register', async (req, res) => {
    try {
      const { firstName } = req.body;
      if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
        return res.status(400).json({ error: 'Prénom invalide' });
      }
      const exists = await db.findUserByFirstName(firstName.trim());
      if (exists) return res.status(409).json({ error: 'Ce prénom est déjà inscrit' });
      const user = { id: nanoid(8), firstName: firstName.trim() };
      await db.createUser(user);
      res.json({ success: true, user });
    } catch (err) {
      console.error('Erreur register:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.getUsers();
      res.json(users);
    } catch (err) {
      console.error('Erreur get users:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/submit-song', async (req, res) => {
    try {
      const { userId, title, artist, audioUrl } = req.body;
      if (!userId || !title || !artist) return res.status(400).json({ error: 'Champs requis manquants' });
      const user = await db.findUserById(userId);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const already = await db.findSongByUserId(userId);
      if (already) return res.status(409).json({ error: 'Cet utilisateur a déjà soumis une chanson' });
      const song = { id: nanoid(10), userId, title: title.trim(), artist: artist.trim(), audioUrl: audioUrl ? String(audioUrl).trim() : '' };
      await db.createSong(song);
      res.json({ success: true, song });
    } catch (err) {
      console.error('Erreur submit song:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/songs', async (req, res) => {
    try {
      const songs = await db.getSongs();
      res.json(songs);
    } catch (err) {
      console.error('Erreur get songs:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/vote', async (req, res) => {
    try {
      const { voterUserId, songId, guessedUserId } = req.body;
      if (!voterUserId || !songId || !guessedUserId) return res.status(400).json({ error: 'Champs requis manquants' });
      const [voter, song, guessed] = await Promise.all([
        db.findUserById(voterUserId),
        db.findSongById(songId),
        db.findUserById(guessedUserId)
      ]);
      if (!voter || !song || !guessed) return res.status(404).json({ error: 'Utilisateur ou chanson introuvable' });
      if (song.userId === voterUserId) return res.status(400).json({ error: 'Vous ne pouvez pas voter pour votre propre chanson' });
      const existing = await db.findVote(voterUserId, songId);
      if (existing) return res.status(409).json({ error: 'Vous avez déjà voté pour cette chanson' });
      const isCorrect = guessedUserId === song.userId;
      const vote = { id: nanoid(12), voterUserId, songId, guessedUserId, isCorrect };
      await db.createVote(vote);
      const allVotes = await db.getVotes();
      const voterScore = allVotes.filter(v => v.voterUserId === voterUserId && v.isCorrect).length;
      res.json({ success: true, vote, voterScore });
    } catch (err) {
      console.error('Erreur vote:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/results', async (req, res) => {
    try {
      const [users, songs, votes] = await Promise.all([
        db.getUsers(),
        db.getSongs(),
        db.getVotes()
      ]);
      const scores = users.map(u => ({ 
        userId: u.id, 
        firstName: u.firstName, 
        score: votes.filter(v => v.voterUserId === u.id && v.isCorrect).length 
      }));
      res.json({ users, songs, votes, scores });
    } catch (err) {
      console.error('Erreur results:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/reset', requireAdmin, async (req, res) => {
    try {
      await Promise.all([
        db.deleteAllSongs(),
        db.deleteAllVotes()
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error('Erreur reset:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Pages
  // Admin protégé -> renvoie l'HTML directement (évite l'accès fichier en serverless)
  // Ajoute les variantes /api/admin* pour support via rewrite Vercel
  const adminHtml = () => `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Admin</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header>
      <h1>Administration</h1>
      <nav>
        <a href="/index.html">Accueil</a>
        <a href="/register.html">Inscription</a>
        <a href="/submit.html">Soumettre une chanson</a>
        <a href="/vote.html">Vote</a>
        <a href="/admin">Admin</a>
      </nav>
    </header>
    <main>
      <section class="grid">
        <div class="card">
          <h2>Chansons soumises</h2>
          <div id="songsList" class="list"></div>
        </div>
        <div class="card">
          <h2>Actions</h2>
          <button id="resetBtn">Réinitialiser chansons et votes</button>
          <p id="adminMsg" class="small"></p>
        </div>
        <div class="card">
          <h2>Résultats</h2>
          <div class="grid">
            <div>
              <h3>Scores par participant</h3>
              <table class="table" id="scoresTableAdmin">
                <thead><tr><th>Prénom</th><th>Score</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <div>
              <h3>Détails des votes</h3>
              <table class="table" id="votesTableAdmin">
                <thead><tr><th>Votant</th><th>Chanson</th><th>Choix</th><th>Correct</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
          <button id="refreshResultsBtn">Rafraîchir les résultats</button>
        </div>
      </section>
    </main>
    <script src="/scripts/admin.js"></script>
  </body>
  </html>`;

  app.get(['/admin', '/admin.html', '/api/admin', '/api/admin.html'], requireAdmin, (req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8').send(adminHtml());
  });

  // Servir statiques depuis /public (utile en local; sur Vercel, les fichiers sont servis par la plateforme)
  // IMPORTANT: placé après la route /admin.html pour éviter un contournement via le fichier statique
  app.use(express.static(path.join(__dirname, 'public')));

  // Route racine redirige vers l'inscription (début du flow)
  app.get('/', (req, res) => res.redirect('/register.html'));

  // Gestionnaire d'erreurs global
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
  });

  appInstance = app;
  return app;
}

module.exports = { createApp };
