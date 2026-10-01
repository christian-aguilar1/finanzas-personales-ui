export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.__env = {
      apiUrl: "${process.env.API_URL}",
      auth0Domain: "${process.env.AUTH0_DOMAIN}",
      auth0ClientId: "${process.env.AUTH0_CLIENT_ID}",
      auth0Audience: "${process.env.AUTH0_AUDIENCE}"
    };
  `);
}
