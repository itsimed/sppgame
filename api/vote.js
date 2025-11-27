const { createApp } = require('../app');

const app = createApp();

module.exports = async (req, res) => {
  // Gérer plusieurs routes de vote dans un seul endpoint
  const path = req.url.split('?')[0];
  
  if (path === '/api/start-vote' || path === '/start-vote') {
    req.url = '/api/start-vote';
  } else if (path === '/api/active-vote' || path === '/active-vote') {
    req.url = '/api/active-vote';
  } else if (path === '/api/stop-vote' || path === '/stop-vote') {
    req.url = '/api/stop-vote';
  } else {
    req.url = '/api/vote';
  }
  
  await app(req, res);
};
