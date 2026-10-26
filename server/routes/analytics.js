import express from 'express';
import Snapshot from '../models/Snapshot.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

// GET /api/analytics/history  -> recorded monthly recurring commitments
router.get('/history', async (req, res) => {
  try {
    const rows = await Snapshot.find({ user: req.userId }).sort({ month: 1 }).lean();
    res.json(rows.map((r) => ({ month: r.month, data: r.data })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load history' });
  }
});

export default router;
