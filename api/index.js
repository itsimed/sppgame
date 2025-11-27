// Redirection racine vers register.html
module.exports = (req, res) => {
  res.writeHead(302, { Location: '/register.html' });
  res.end();
};
