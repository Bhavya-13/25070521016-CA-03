import express from 'express';
import mongoose from 'mongoose';
import Subscription, { CYCLES, CATEGORIES } from '../models/Subscription.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

// ---------- helpers ----------

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// "2026-11-05" -> local Date at midnight (null if invalid)
function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// add one billing cycle, clamping the day (e.g. Jan 31 + 1 month = Feb 28)
function addCycle(date, cycle) {
  const day = date.getDate();
  const next = new Date(date);
  next.setDate(1);
  if (cycle === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

// roll a past renewal date forward until it is today or later
function rollForward(date, cycle) {
  const today = startOfToday();
  let next = new Date(date);
  let guard = 0;
  while (next < today && guard < 600) {
    next = addCycle(next, cycle);
    guard += 1;
  }
  return next;
}

function cleanPayload(body) {
  const name = String(body.name || '').trim();
  const price = Number(body.price);
  const cycle = body.cycle;
  const category = CATEGORIES.includes(body.category) ? body.category : 'Other';
  const color = /^#[0-9a-fA-F]{6}$/.test(body.color || '') ? body.color : '#6c8cff';
  const nextRenewal = parseDate(body.nextRenewal);

  if (!name) return { error: 'Name is required' };
  if (name.length > 60) return { error: 'Name is too long' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a valid price' };
  if (!CYCLES.includes(cycle)) return { error: 'Billing cycle must be monthly or yearly' };
  if (!nextRenewal) return { error: 'Choose a valid renewal date' };

  return { data: { name, price, cycle, category, color, nextRenewal } };
}

const badId = (res) => res.status(400).json({ message: 'Invalid subscription id' });

// ---------- routes ----------

// GET /api/subscriptions
router.get('/', async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.userId });
    const today = startOfToday();

    for (const sub of subs) {
      if (sub.nextRenewal < today) {
        sub.nextRenewal = rollForward(sub.nextRenewal, sub.cycle);
        await sub.save();
      }
    }

    subs.sort((a, b) => a.nextRenewal - b.nextRenewal);
    res.json(subs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load subscriptions' });
  }
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  try {
    const { data, error } = cleanPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const sub = await Subscription.create({ ...data, user: req.userId });
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

    const { data, error } = cleanPayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update subscription' });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not delete subscription' });
  }
});

export default router;
