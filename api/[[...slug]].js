// Catch-all serverless function for all /api/* routes on Vercel
const { createApp } = require('../app');
const app = createApp();
module.exports = (req, res) => app(req, res);
