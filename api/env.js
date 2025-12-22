export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.__env = {
      apiUrl: "${process.env.API_URL}"
    };
  `);
}
