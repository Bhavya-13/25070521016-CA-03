import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { resolveSettings, applySettingsPatch } from '../utils/settings.js';

const router = express.Router();
router.use(auth);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ settings: resolveSettings(user.settings) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load settings' });
  }
});

// PUT /api/settings  (partial update)
router.put('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.settings = applySettingsPatch(user.settings, req.body);
    user.markModified('settings');
    await user.save();
    res.json({ settings: resolveSettings(user.settings) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not save settings' });
  }
});

export default router;
