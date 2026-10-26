import express from 'express';
import User from '../models/User.js';
import WalletTx from '../models/WalletTx.js';
import auth from '../middleware/auth.js';
import { CURRENCIES } from '../utils/validate.js';
import { round2, walletSummary } from '../utils/wallet.js';

const router = express.Router();
router.use(auth);

const MAX_AMOUNT = 10000000;
const txOut = (t) => ({
  id: t._id, type: t.type, delta: t.delta, balanceAfter: t.balanceAfter, currency: t.currency,
  note: t.note, subId: t.subId, subName: t.subName, forDate: t.forDate, provider: t.provider, createdAt: t.createdAt,
});
const parseAmount = (v) => {
  const n = round2(Number(v));
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : null;
};

// GET /api/wallet
router.get('/', async (req, res) => {
  try {
    const wallet = await walletSummary(req.userId);
    const txs = await WalletTx.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100);
    res.json({ wallet, transactions: txs.map(txOut) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load wallet' });
  }
});

// POST /api/wallet/topup  { amount, note?, currency? }
// Simulated: this only adds a number to the balance. No real money moves.
router.post('/topup', async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ message: 'Enter an amount above 0 (up to 10,000,000)' });

    const current = await walletSummary(req.userId);
    const wanted = CURRENCIES.includes(req.body.currency) ? req.body.currency : current.currency;
    if (current.balance > 0 && wanted !== current.currency) {
      return res.status(400).json({ message: `Your wallet holds ${current.currency}. Empty it before switching to ${wanted}.` });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.userId },
      { $inc: { 'wallet.balance': amount }, $set: { 'wallet.currency': wanted } },
      { new: true }
    );
    const tx = await WalletTx.create({
      user: req.userId, type: 'topup', delta: amount, balanceAfter: round2(user.wallet.balance),
      currency: wanted, note: String(req.body.note || 'Added money (simulated)').slice(0, 120),
    });
    res.status(201).json({ wallet: { balance: round2(user.wallet.balance), currency: wanted }, transaction: txOut(tx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not add money' });
  }
});

// POST /api/wallet/withdraw  { amount, note? }  -> lowers the balance (for corrections)
router.post('/withdraw', async (req, res) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (!amount) return res.status(400).json({ message: 'Enter an amount above 0' });

    const current = await walletSummary(req.userId);
    const user = await User.findOneAndUpdate(
      { _id: req.userId, 'wallet.balance': { $gte: amount } },
      { $inc: { 'wallet.balance': -amount } },
      { new: true }
    );
    if (!user) return res.status(400).json({ message: 'Not enough balance in your wallet' });

    const tx = await WalletTx.create({
      user: req.userId, type: 'withdrawal', delta: -amount, balanceAfter: round2(user.wallet.balance),
      currency: current.currency, note: String(req.body.note || 'Removed money').slice(0, 120),
    });
    res.json({ wallet: { balance: round2(user.wallet.balance), currency: current.currency }, transaction: txOut(tx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not remove money' });
  }
});

export default router;
