const { createApp } = require('../app');

const app = createApp();

module.exports = async (req, res) => {
  await app(req, res);
};
