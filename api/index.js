// Handler serverless pour Vercel: adapter Express à la signature (req, res)
const { createApp } = require('../app');

const app = createApp();

module.exports = (req, res) => {
	return app(req, res);
};
