import express from 'express';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';
import WalletTx from '../models/WalletTx.js';
import auth from '../middleware/auth.js';
import { cleanSubscription, STATUSES } from '../utils/validate.js';
import { isISO, rollForward, localTodayISO } from '../utils/dates.js';
import { rollWithPending, advanceOne } from '../utils/rolling.js';
import { creditWallet, debitWallet, round2, walletSummary } from '../utils/wallet.js';
import User from '../models/User.js';
import { resolveSettings } from '../utils/settings.js';
import { getRates } from '../utils/fx.js';
import { recordSnapshot } from '../utils/snapshot.js';
import { buildDemo } from '../utils/demo.js';

const router = express.Router();
router.use(auth);

const getToday = (req) => {
  const t = req.query.today || req.body?.today;
  return isISO(t) ? t : localTodayISO();
};
const badId = (res) => res.status(400).json({ message: 'Invalid subscription id' });

// How much the wallet is charged for a payment. When the wallet holds another currency, the amount is
// converted at the current rate (your own rates from Settings win over the live ones).
async function walletCharge(userId, sub, amount) {
  const wallet = await walletSummary(userId);
  if (wallet.currency === sub.currency) return { debitAmount: amount, debitCurrency: sub.currency, rate: 1 };

  const user = await User.findById(userId, 'settings');
  const settings = resolveSettings(user?.settings);
  if (settings.convert === false) {
    return { error: `Your wallet holds ${wallet.currency}. Turn on currency conversion in Settings to pay a ${sub.currency} subscription from it.` };
  }
  let live = null;
  try { live = (await getRates()).rates; } catch { /* fall back to your own rates only */ }
  const table = { USD: 1, ...(live || {}), ...settings.fxManual };
  if (!(table[wallet.currency] > 0 && table[sub.currency] > 0)) {
    return { error: `No exchange rate is available between ${sub.currency} and ${wallet.currency}.` };
  }
  const rate = table[wallet.currency] / table[sub.currency];
  return { debitAmount: round2(amount * rate), debitCurrency: wallet.currency, rate };
}
const byRenewal = (a, b) => a.nextRenewal.localeCompare(b.nextRenewal) || a.name.localeCompare(b.name);

// GET /api/subscriptions?today=YYYY-MM-DD
// Active subscriptions whose renewal date has passed are rolled forward to the next cycle.
router.get('/', async (req, res) => {
  try {
    const today = getToday(req);
    const subs = await Subscription.find({ user: req.userId });

    for (const s of subs) {
      if (s.status === 'active' && s.nextRenewal < today) {
        const r = rollWithPending(s, today);
        s.nextRenewal = r.nextRenewal;
        s.pendingDates = r.pendingDates;
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
        nextRenewal: data.status === 'active' && data.nextRenewal < today
          ? rollForward(data.nextRenewal, data.cycle, data.customDays, today)
          : data.nextRenewal,
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
      nextRenewal: data.status === 'active' && data.nextRenewal < today
        ? rollForward(data.nextRenewal, data.cycle, data.customDays, today)
        : data.nextRenewal,
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
    if (sub.status !== 'active') sub.pendingDates = [];
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
    if (status !== 'active') sub.pendingDates = [];
    await sub.save();
    await recordSnapshot(req.userId, today);
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not change status' });
  }
});

// POST /api/subscriptions/:id/pay
// body: { forDate?, source?: 'manual' | 'wallet', paidOn?, amount?, note? }
// - forDate is one of pendingDates: records the payment for that missed renewal.
// - otherwise it pays the upcoming renewal and moves nextRenewal forward one billing cycle.
// - source 'wallet' deducts the simulated wallet balance. It does not pay the provider.
router.post('/:id/pay', async (req, res) => {
  let debited = null;
  let tx = null;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const today = getToday(req);

    const sub = await Subscription.findOne({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    if (sub.status !== 'active') {
      return res.status(400).json({ message: 'Only active subscriptions can be marked as paid. Resume it first.' });
    }

    const source = req.body.source === 'wallet' ? 'wallet' : 'manual';
    const wanted = req.body.forDate;
    const isPending = Boolean(wanted) && sub.pendingDates.includes(wanted);
    if (wanted && !isPending && wanted !== sub.nextRenewal) {
      return res.status(400).json({ message: 'That renewal date is not open for payment' });
    }
    const forDate = isPending ? wanted : sub.nextRenewal;
    if (sub.payments.some((p) => p.forDate === forDate)) {
      return res.status(409).json({ message: 'That renewal is already marked as paid' });
    }

    const amount = round2(req.body.amount === undefined || req.body.amount === '' ? sub.price : Number(req.body.amount));
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: 'Enter a valid amount' });

    let paidOn = source === 'wallet' ? today : req.body.paidOn || today;
    if (!isISO(paidOn)) return res.status(400).json({ message: 'Payment date is not valid' });
    if (paidOn > today) return res.status(400).json({ message: 'The payment date cannot be in the future' });
    const note = String(req.body.note || '').trim().slice(0, 200);

    let charge = null;
    if (source === 'wallet') {
      charge = await walletCharge(req.userId, sub, amount);
      if (charge.error) return res.status(400).json({ message: charge.error });
      const updated = await debitWallet(req.userId, charge.debitAmount, charge.debitCurrency);
      if (!updated) {
        return res.status(400).json({ message: `Not enough balance in your ${charge.debitCurrency} wallet. Add money first.` });
      }
      debited = charge.debitAmount;
      const converted = charge.debitCurrency !== sub.currency ? ` (${sub.currency} ${amount} at ${Number(charge.rate.toPrecision(5))})` : '';
      tx = await WalletTx.create({
        user: req.userId, type: 'payment', delta: -charge.debitAmount, balanceAfter: round2(updated.wallet.balance),
        currency: charge.debitCurrency, note: `${note || `${sub.name} renewal`}${converted}`, subId: String(sub._id), subName: sub.name, forDate,
      });
    }

    sub.payments.push({
      forDate, paidOn, amount, currency: sub.currency, source, advanced: !isPending,
      walletTxId: tx ? String(tx._id) : null,
      walletAmount: charge ? charge.debitAmount : null, walletCurrency: charge ? charge.debitCurrency : null, note,
    });
    if (isPending) sub.pendingDates = sub.pendingDates.filter((d) => d !== forDate);
    else sub.nextRenewal = advanceOne(sub);
    await sub.save();
    res.json(sub);
  } catch (err) {
    console.error(err);
    if (debited !== null) {
      try {
        await creditWallet(req.userId, debited);
        if (tx) await WalletTx.deleteOne({ _id: tx._id });
      } catch (e) {
        console.error('Could not reverse wallet debit:', e.message);
      }
    }
    res.status(500).json({ message: 'Could not record the payment' });
  }
});

// POST /api/subscriptions/:id/pay/undo  -> removes the most recent payment (refunds the wallet if it was used)
router.post('/:id/pay/undo', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    if (!sub.payments.length) return res.status(400).json({ message: 'There is no payment to undo' });

    const last = sub.payments[sub.payments.length - 1];
    const payment = last.toObject();
    if (payment.advanced) {
      if (sub.nextRenewal > payment.forDate) sub.nextRenewal = payment.forDate;
    } else if (sub.status === 'active' && !sub.pendingDates.includes(payment.forDate)) {
      sub.pendingDates = [...sub.pendingDates, payment.forDate].sort();
    }
    sub.payments.pull(last._id);
    await sub.save();

    if (payment.source === 'wallet') {
      const refund = payment.walletAmount ?? payment.amount; // what the wallet was actually charged
      const updated = await creditWallet(req.userId, refund);
      await WalletTx.create({
        user: req.userId, type: 'refund', delta: refund, balanceAfter: round2(updated.wallet.balance),
        currency: payment.walletCurrency || payment.currency, note: `Undone payment for ${sub.name}`,
        subId: String(sub._id), subName: sub.name, forDate: payment.forDate,
      });
    }
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not undo the payment' });
  }
});

// POST /api/subscriptions/:id/skip  { forDate }  -> dismisses a missed renewal without recording a payment
router.post('/:id/skip', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.userId });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    if (!sub.pendingDates.includes(req.body.forDate)) {
      return res.status(400).json({ message: 'That renewal is not waiting to be marked' });
    }
    sub.pendingDates = sub.pendingDates.filter((d) => d !== req.body.forDate);
    await sub.save();
    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not skip that renewal' });
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
