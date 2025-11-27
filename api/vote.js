const { createApp } = require('../app');
let app;
module.exports = (req, res) => {
  if (!app) app = createApp();
  app(req, res);
};
