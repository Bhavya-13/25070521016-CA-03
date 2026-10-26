import express from 'express';
import auth from '../middleware/auth.js';
import { getRates } from '../utils/fx.js';

const router = express.Router();
router.use(auth);

// GET /api/fx            -> cached rates (refreshed automatically after 12 hours)
// GET /api/fx?refresh=1  -> ask for a refresh (limited to once per 10 minutes)
router.get('/', async (req, res) => {
  try {
    res.json(await getRates({ force: req.query.refresh === '1' }));
  } catch (err) {
    console.error(err);
    res.status(503).json({ message: 'Exchange rates are not available right now' });
  }
});

export default router;
