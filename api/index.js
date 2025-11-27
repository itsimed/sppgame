// Redirection racine vers register.html
const { createApp } = require('../app');

module.exports = (req, res) => {
  // Simple redirection sans passer par Express
  res.writeHead(302, { Location: '/register.html' });
  res.end();
};
