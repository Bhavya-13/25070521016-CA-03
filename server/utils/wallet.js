import User from '../models/User.js';

export const round2 = (n) => Math.round(n * 100) / 100;

// Atomic: only succeeds when the balance (in the same currency) covers the amount.
export function debitWallet(userId, amount, currency) {
  return User.findOneAndUpdate(
    { _id: userId, 'wallet.currency': currency, 'wallet.balance': { $gte: amount } },
    { $inc: { 'wallet.balance': -amount } },
    { new: true }
  );
}

export function creditWallet(userId, amount) {
  return User.findOneAndUpdate({ _id: userId }, { $inc: { 'wallet.balance': amount } }, { new: true });
}

export async function walletSummary(userId) {
  const u = await User.findById(userId, 'wallet');
  return { balance: round2(u?.wallet?.balance ?? 0), currency: u?.wallet?.currency || 'INR' };
}
