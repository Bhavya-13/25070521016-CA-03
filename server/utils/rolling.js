import { nth } from './dates.js';

export const MAX_PENDING = 12;

// Moves an active subscription's renewal date forward past today. Renewal dates that passed
// without a recorded payment are remembered in pendingDates so the user can mark them as paid or skip them.
export function rollWithPending(sub, today) {
  const paid = new Set((sub.payments || []).map((p) => p.forDate));
  const passed = [];
  let k = 0;
  let cur = sub.nextRenewal;
  while (cur < today && k < 5000) {
    passed.push(cur);
    k += 1;
    cur = nth(sub.nextRenewal, sub.cycle, sub.customDays, k);
  }
  const pending = new Set(sub.pendingDates || []);
  for (const d of passed) if (!paid.has(d)) pending.add(d);
  return { nextRenewal: cur, pendingDates: [...pending].sort().slice(-MAX_PENDING), changed: passed.length > 0 };
}

// the renewal date one billing cycle after the current one
export const advanceOne = (sub) => nth(sub.nextRenewal, sub.cycle, sub.customDays, 1);
