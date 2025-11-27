// Handler serverless pour Vercel: adapter Express à la signature (req, res)
const { createApp } = require('../app');

// Singleton: réutilise la même instance d'app pour les invocations "warm"
let app;
module.exports = (req, res) => {
  if (!app) app = createApp();
  return app(req, res);
};
