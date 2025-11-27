// Catch-all serverless function for all /api/* routes on Vercel
const { createApp } = require('../app');

// Singleton: réutilise la même instance d'app pour les invocations "warm"
let app;

module.exports = (req, res) => {
  if (!app) {
    app = createApp();
  }
  app(req, res);
};
