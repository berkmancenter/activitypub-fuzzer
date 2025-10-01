import express from 'express'; // Import express module
import { parseJSON } from '../utils.js';

const router = express.Router();

router.get('/nodeinfo', async (req, res) => {
  const { DOMAIN } = req.app.get('config');
  res.json({ links: [{ rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0', href: `https://${DOMAIN}/nodeinfo/2.0` }] });
});

router.get('/webfinger', async (req, res) => {
  const { resource } = req.query;
  if (!resource || !resource.includes('acct:')) {
    return res
      .status(400)
      .json({ error: 'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.' });
  }

  const name = resource.replace('acct:', '').replace(/@.*$/, '');
  const query = `select webfinger from accounts where name = '${name}'`;
  const fuzzdb = req.app.get('fuzzdb');
  return fuzzdb.get(query, (err, row) => {
    if (err) {
      console.log('error', err);
    }
    console.log('row', row);
    if (err) {
      return res.status(500).json({ error: `Internal server error: ${err.message}` });
    }
    if (!row) {
      return res.status(404).json({ error: `No webfinger record found for ${name}.` });
    }
    return res.json(parseJSON(row.webfinger));
  });
});

export default router;
