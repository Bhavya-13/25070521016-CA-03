import express from 'express';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';
import auth from '../middleware/auth.js';
import { cleanSubscription, STATUSES } from '../utils/validate.js';
import { isISO, rollForward, localTodayISO } from '../utils/dates.js';
import { recordSnapshot } from '../utils/snapshot.js';
import { buildDemo } from '../utils/demo.js';

const router = express.Router();
router.use(auth);

const getToday = (req) => {
  const t = req.query.today || req.body?.today;
  return isISO(t) ? t : localTodayISO();
};
const badId = (res) => res.status(400).json({ message: 'Invalid subscription id' });
const byRenewal = (a, b) => a.nextRenewal.localeCompare(b.nextRenewal) || a.name.localeCompare(b.name);

// GET /api/subscriptions?today=YYYY-MM-DD
// Active subscriptions whose renewal date has passed are rolled forward to the next cycle.
router.get('/', async (req, res) => {
  try {
    const today = getToday(req);
    const subs = await Subscription.find({ user: req.userId });

    for (const s of subs) {
      if (s.status === 'active' && s.nextRenewal < today) {
        s.nextRenewal = rollForward(s.nextRenewal, s.cycle, s.customDays, today);
        await s.save();
      }
    }

    await recordSnapshot(req.userId, today);
    subs.sort(byRenewal);
    res.json(subs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load subscriptions' });
  }
});

// POST /api/subscriptions/import  { rows: [...] }  -> skips duplicates (same name + billing frequency)
router.post('/import', async (req, res) => {
  try {
    const today = getToday(req);
    const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 500) : [];
    if (rows.length === 0) return res.status(400).json({ message: 'No rows to import' });

    const existing = await Subscription.find({ user: req.userId }, 'name cycle');
    const seen = new Set(existing.map((s) => `${s.name.toLowerCase()}|${s.cycle}`));

    const created = [];
    const skipped = [];
    const invalid = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNo = rows[i]?._row || i + 2;
      const { data, error } = cleanSubscription(rows[i] || {});
      if (error) {
        invalid.push({ row: rowNo, name: String(rows[i]?.name || ''), message: error });
        continue;
      }
      const key = `${data.name.toLowerCase()}|${data.cycle}`;
      if (seen.has(key)) {
        skipped.push({ row: rowNo, name: data.name, message: 'Already exists' });
        continue;
      }
      seen.add(key);
      created.push({
        ...data,
        user: req.userId,
        priceHistory: [{ price: data.price, changedAt: today }],
        lastReviewedAt: today,
      });
    }

    if (created.length) await Subscription.insertMany(created);
    await recordSnapshot(req.userId, today);
    res.json({ created: created.length, skipped, invalid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
});

// POST /api/subscriptions/demo  -> adds clearly flagged sample data (once)
router.post('/demo', async (req, res) => {
  try {
    const today = getToday(req);
    const already = await Subscription.countDocuments({ user: req.userId, isDemo: true });
    if (already > 0) return res.status(409).json({ message: 'Demo data is already loaded' });

    const docs = buildDemo(today).map((d) => ({
      priceHistory: [{ price: d.price, changedAt: today }],
      lastReviewedAt: today,
      ...d,
      user: req.userId,
    }));
    await Subscription.insertMany(docs);
    await recordSnapshot(req.userId, today);
    res.status(201).json({ created: docs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load demo data' });
  }
});

// DELETE /api/subscriptions/demo  -> removes only demo records
router.delete('/demo', async (req, res) => {
  try {
    const result = await Subscription.deleteMany({ user: req.userId, isDemo: true });
    await recordSnapshot(req.userId, getToday(req));
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not clear demo data' });
  }
});

// DELETE /api/subscriptions?confirm=yes  -> wipes every subscription for this user
router.delete('/', async (req, res) => {
  try {
    if (req.query.confirm !== 'yes') {
      return res.status(400).json({ message: 'Confirmation required' });
    }
    const result = await Subscription.deleteMany({ user: req.userId });
    await recordSnapshot(req.userId, getToday(req));
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not reset workspace' });
  }
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  try {
    const today = getToday(req);
    const { data, error } = cleanSubscription(req.body);
    if (error) return res.status(400).json({ message: error });

    const sub = await Subscription.create({
      ...data,
      user: req.userId,
      priceHistory: [{ price: data.price, changedAt: today }],
      lastReviewedAt: today,
    });
    await recordSnapshot(req.userId, today);
    res.status(201).json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add subscription' });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const today = getToday(req);

    const { data, error } = cleanSubscription(req.body);
    if (error) return res.status(400).json({ message: error });

    const sub = await Subscription.findOne({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const priceChanged = sub.price !== data.price;
    sub.set(data);
    if (priceChanged) sub.priceHistory.push({ price: data.price, changedAt: today });
    if (sub.status === 'active' && sub.nextRenewal < today) {
      sub.nextRenewal = rollForward(sub.nextRenewal, sub.cycle, sub.customDays, today);
    }
    await sub.save();
    await recordSnapshot(req.userId, today);
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update subscription' });
  }
});

// PATCH /api/subscriptions/:id/status  { status: active | paused | cancelled }
// "cancelled" only marks it inside Watchdog. It does not cancel anything with the provider.
router.patch('/:id/status', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const today = getToday(req);
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const sub = await Subscription.findOne({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    sub.status = status;
    if (status === 'active' && sub.nextRenewal < today) {
      sub.nextRenewal = rollForward(sub.nextRenewal, sub.cycle, sub.customDays, today);
    }
    await sub.save();
    await recordSnapshot(req.userId, today);
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not change status' });
  }
});

// POST /api/subscriptions/:id/review  -> records that the user reviewed this subscription today
router.post('/:id/review', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { lastReviewedAt: getToday(req) },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not mark as reviewed' });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    await recordSnapshot(req.userId, getToday(req));
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete subscription' });
  }
});

export default router;
