import { addDays, addMonths, nth } from './dates.js';

// ---- the single source of truth for every cost calculation in the app ----

export function annualFactor(cycle, customDays) {
  switch (cycle) {
    case 'weekly': return 52;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    case 'custom': return 365 / Math.max(1, customDays || 30);
    default: return 12;
  }
}

export const annualCost = (s) => (Number(s.price) || 0) * annualFactor(s.cycle, s.customDays);
export const monthlyCost = (s) => annualCost(s) / 12;

export const totals = (subs) => ({
  monthly: subs.reduce((t, s) => t + monthlyCost(s), 0),
  annual: subs.reduce((t, s) => t + annualCost(s), 0),
  count: subs.length,
});

export function cycleText(s) {
  if (s.cycle === 'custom') return `Every ${s.customDays} days`;
  return { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }[s.cycle] || 'Monthly';
}

export function cycleShort(s) {
  if (s.cycle === 'custom') return `/${s.customDays}d`;
  return { weekly: '/wk', monthly: '/mo', quarterly: '/qtr', yearly: '/yr' }[s.cycle] || '/mo';
}

export function categoryBreakdown(subs) {
  const map = new Map();
  for (const s of subs) {
    const cur = map.get(s.category) || { name: s.category, monthly: 0, annual: 0, count: 0 };
    cur.monthly += monthlyCost(s);
    cur.annual += annualCost(s);
    cur.count += 1;
    map.set(s.category, cur);
  }
  const total = [...map.values()].reduce((t, c) => t + c.monthly, 0);
  return [...map.values()]
    .map((c) => ({ ...c, share: total ? c.monthly / total : 0 }))
    .sort((a, b) => b.monthly - a.monthly);
}

export function cycleBreakdown(subs) {
  const map = new Map();
  for (const s of subs) {
    const cur = map.get(s.cycle) || { cycle: s.cycle, monthly: 0, count: 0 };
    cur.monthly += monthlyCost(s);
    cur.count += 1;
    map.set(s.cycle, cur);
  }
  return [...map.values()].sort((a, b) => b.monthly - a.monthly);
}

// Renewal dates of one subscription inside [from, to].
// The date saved on the subscription is the scheduled charge; later cycles are estimates.
export function occurrences(sub, from, to) {
  const out = [];
  for (let k = 0; k < 3000; k += 1) {
    const date = nth(sub.nextRenewal, sub.cycle, sub.customDays, k);
    if (date > to) break;
    if (date >= from) out.push({ sub, date, estimated: k > 0 });
  }
  return out;
}

export function scheduledCharges(subs, from, to) {
  const out = [];
  for (const s of subs) out.push(...occurrences(s, from, to));
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.sub.name.localeCompare(b.sub.name));
}

export const sumCharges = (list) => list.reduce((t, c) => t + (Number(c.sub.price) || 0), 0);

// "Next N days" = today through today + N, inclusive.
export function windowTotals(subs, today, days) {
  const list = scheduledCharges(subs, today, addDays(today, days));
  const confirmed = list.filter((c) => !c.estimated);
  const estimated = list.filter((c) => c.estimated);
  return {
    list,
    count: list.length,
    confirmed: sumCharges(confirmed),
    confirmedCount: confirmed.length,
    estimated: sumCharges(estimated),
    estimatedCount: estimated.length,
    total: sumCharges(list),
  };
}

// Upcoming scheduled charges grouped into consecutive windows starting today.
export function bucketCharges(subs, today, mode) {
  const step = mode === 'year' ? 12 : mode === 'quarter' ? 3 : 1;
  const n = mode === 'year' ? 3 : mode === 'quarter' ? 4 : 12;
  const lastDay = addDays(addMonths(today, step * n), -1);
  const all = scheduledCharges(subs, today, lastDay);
  const buckets = [];
  for (let i = 0; i < n; i += 1) {
    const start = addMonths(today, step * i);
    const end = addDays(addMonths(today, step * (i + 1)), -1);
    const items = all.filter((c) => c.date >= start && c.date <= end);
    buckets.push({
      start,
      end,
      count: items.length,
      confirmed: sumCharges(items.filter((c) => !c.estimated)),
      estimated: sumCharges(items.filter((c) => c.estimated)),
    });
  }
  return buckets;
}

// Renewal dates that passed without being marked as paid or skipped (active subscriptions only).
export const unpaidItems = (subs) =>
  subs
    .filter((s) => s.status === 'active')
    .flatMap((s) => (s.pendingDates || []).map((date) => ({ sub: s, date })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sub.name.localeCompare(b.sub.name));

// A payment already covers the upcoming renewal when the latest payment is for today or later.
export function paidAhead(sub, today) {
  const last = (sub.payments || [])[(sub.payments || []).length - 1];
  return last && last.forDate >= today ? last : null;
}
