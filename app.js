// Construction de l'application Express (réutilisable en local et sur Vercel)
const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

// Stockage global partagé entre toutes les instances sur Vercel (en mémoire)
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const USE_MEMORY = !!process.env.VERCEL;
let memoryDB = { users: [], songs: [], votes: [] };

// Singleton global pour l'app Express
let appInstance = null;

function createApp() {
  if (appInstance) return appInstance;
  
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  function ensureDataFile() {
    if (USE_MEMORY) return; // pas de fichier sur Vercel
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], songs: [], votes: [] }, null, 2));
  }

  function loadDB() {
    if (USE_MEMORY) return memoryDB;
    ensureDataFile();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  }

  function saveDB(db) {
    if (USE_MEMORY) { memoryDB = db; return; }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }

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

  app.post('/api/register', (req, res) => {
    const { firstName } = req.body;
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'Prénom invalide' });
    }
    const db = loadDB();
    const exists = db.users.find(u => u.firstName.toLowerCase() === firstName.trim().toLowerCase());
    if (exists) return res.status(409).json({ error: 'Ce prénom est déjà inscrit' });
    const user = { id: nanoid(8), firstName: firstName.trim() };
    db.users.push(user);
    saveDB(db);
    res.json({ success: true, user });
  });

  app.get('/api/users', (req, res) => {
    const db = loadDB();
    res.json(db.users);
  });

  app.post('/api/submit-song', (req, res) => {
    const { userId, title, artist, audioUrl } = req.body;
    if (!userId || !title || !artist) return res.status(400).json({ error: 'Champs requis manquants' });
    const db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const already = db.songs.find(s => s.userId === userId);
    if (already) return res.status(409).json({ error: 'Cet utilisateur a déjà soumis une chanson' });
    const song = { id: nanoid(10), userId, title: title.trim(), artist: artist.trim(), audioUrl: audioUrl ? String(audioUrl).trim() : '' };
    db.songs.push(song);
    saveDB(db);
    res.json({ success: true, song });
  });

  app.get('/api/songs', (req, res) => {
    const db = loadDB();
    res.json(db.songs);
  });

  app.post('/api/vote', (req, res) => {
    const { voterUserId, songId, guessedUserId } = req.body;
    if (!voterUserId || !songId || !guessedUserId) return res.status(400).json({ error: 'Champs requis manquants' });
    const db = loadDB();
    const voter = db.users.find(u => u.id === voterUserId);
    const song = db.songs.find(s => s.id === songId);
    const guessed = db.users.find(u => u.id === guessedUserId);
    if (!voter || !song || !guessed) return res.status(404).json({ error: 'Utilisateur ou chanson introuvable' });
    if (song.userId === voterUserId) return res.status(400).json({ error: 'Vous ne pouvez pas voter pour votre propre chanson' });
    const existing = db.votes.find(v => v.voterUserId === voterUserId && v.songId === songId);
    if (existing) return res.status(409).json({ error: 'Vous avez déjà voté pour cette chanson' });
    const isCorrect = guessedUserId === song.userId;
    const vote = { id: nanoid(12), voterUserId, songId, guessedUserId, isCorrect };
    db.votes.push(vote);
    saveDB(db);
    const voterScore = db.votes.filter(v => v.voterUserId === voterUserId && v.isCorrect).length;
    res.json({ success: true, vote, voterScore });
  });

  app.get('/api/results', (req, res) => {
    const db = loadDB();
    const scores = db.users.map(u => ({ userId: u.id, firstName: u.firstName, score: db.votes.filter(v => v.voterUserId === u.id && v.isCorrect).length }));
    res.json({ users: db.users, songs: db.songs, votes: db.votes, scores });
  });

  app.post('/api/reset', requireAdmin, (req, res) => {
    const db = loadDB();
    db.songs = [];
    db.votes = [];
    saveDB(db);
    res.json({ success: true });
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

  // Route racine explicite
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  // Gestionnaire d'erreurs global
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
  });

  appInstance = app;
  return app;
}

module.exports = { createApp };
