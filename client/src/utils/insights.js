import { addDays, diffDays } from './dates.js';
import { annualCost, annualFactor, monthlyCost, scheduledCharges, sumCharges, totals } from './finance.js';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, positive: 3 };

export const INSIGHT_TYPES = {
  budget: 'Budget',
  cost: 'High cost',
  cluster: 'Renewal cluster',
  overlap: 'Overlap review',
  price: 'Price change',
  plan: 'Plan comparison',
  review: 'Review reminder',
};

const joinNames = (names) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const cycleWord = { weekly: 'weekly', monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' };

// Rule-based, automated Watchdog insights. Every number comes from the user's own records.
export function buildInsights({ counted, settings, today, fmt }) {
  const out = [];
  const { monthly: total } = totals(counted);
  const byCost = [...counted].sort((a, b) => monthlyCost(b) - monthlyCost(a));
  const month = today.slice(0, 7);

  // Budget
  const budget = Number(settings.budget?.monthly) || 0;
  if (budget > 0 && total > 0) {
    if (total > budget) {
      out.push({
        key: `budget:over:${month}`, type: 'budget', severity: 'critical',
        title: 'Recurring costs are over your budget',
        body: `Your active subscriptions come to ${fmt.money(total)} a month against a budget of ${fmt.money(budget)}.`,
        impact: `${fmt.money(total - budget)} over budget each month`,
        action: 'Open the Savings Planner to test what-if scenarios.',
        link: '/savings', subIds: [],
      });
    } else if (total >= budget * 0.9) {
      out.push({
        key: `budget:near:${month}`, type: 'budget', severity: 'warning',
        title: 'Close to your monthly budget',
        body: `You are using ${fmt.percent(total / budget)} of your ${fmt.money(budget)} monthly budget.`,
        impact: `${fmt.money(budget - total)} of headroom left`,
        action: 'Check upcoming renewals before adding anything new.',
        link: '/savings', subIds: [],
      });
    }
  }

  // High cost
  if (counted.length >= 3 && total > 0) {
    const top = byCost[0];
    const share = monthlyCost(top) / total;
    if (share >= 0.25) {
      out.push({
        key: `cost:${top._id}`, type: 'cost', severity: share >= 0.5 ? 'warning' : 'info',
        title: `${top.name} is ${Math.round(share * 100)}% of your recurring spend`,
        body: `It costs about ${fmt.money(monthlyCost(top))} a month (${fmt.money(annualCost(top))} a year) out of ${fmt.money(total)} a month in total.`,
        impact: `${fmt.money(annualCost(top))} per year`,
        action: 'Check that you still use it enough to justify the cost.',
        link: `/subscriptions/${top._id}`, subIds: [top._id],
      });
    }
  }

  // Renewal clusters: busiest 7-day window in the next 60 days with 3 or more charges
  if (counted.length >= 3) {
    const charges = scheduledCharges(counted, today, addDays(today, 60));
    let best = null;
    for (let i = 0; i <= 53; i += 1) {
      const start = addDays(today, i);
      const end = addDays(start, 6);
      const items = charges.filter((c) => c.date >= start && c.date <= end);
      if (items.length >= 3 && (!best || items.length > best.items.length)) best = { start, end, items };
    }
    if (best) {
      const est = best.items.filter((c) => c.estimated).length;
      out.push({
        key: `cluster:${best.start}`, type: 'cluster', severity: 'info',
        title: `${best.items.length} renewals land between ${fmt.shortDate(best.start)} and ${fmt.shortDate(best.end)}`,
        body: `${joinNames([...new Set(best.items.map((c) => c.sub.name))])} renew within the same week${est ? ` (${est} of these ${est === 1 ? 'is an estimate' : 'are estimates'} based on the billing cycle)` : ''}.`,
        impact: `${fmt.money(sumCharges(best.items))} in one week`,
        action: 'Make sure enough money is available that week.',
        link: '/calendar', subIds: best.items.map((c) => c.sub._id),
      });
    }
  }

  // Overlap: only subscriptions the user has explicitly grouped together
  const groups = new Map();
  for (const s of counted) {
    const g = (s.overlapGroup || '').trim();
    if (!g) continue;
    const k = g.toLowerCase();
    if (!groups.has(k)) groups.set(k, { label: g, items: [] });
    groups.get(k).items.push(s);
  }
  for (const [k, g] of groups) {
    if (g.items.length < 2) continue;
    const cheapest = [...g.items].sort((a, b) => monthlyCost(a) - monthlyCost(b))[0];
    out.push({
      key: `overlap:${k}`, type: 'overlap', severity: 'info',
      title: `${g.items.length} subscriptions grouped as "${g.label}"`,
      body: `You grouped ${joinNames(g.items.map((s) => s.name))} together as overlapping services. It may be worth checking whether you need all of them.`,
      impact: `Dropping the cheapest (${cheapest.name}) would lower recurring cost by ${fmt.money(monthlyCost(cheapest))} a month (hypothetical)`,
      action: 'Review how often you use each one.',
      link: '/subscriptions', subIds: g.items.map((s) => s._id),
    });
  }

  // Price increases from recorded price history
  for (const s of counted) {
    const h = s.priceHistory || [];
    if (h.length < 2) continue;
    const last = h[h.length - 1];
    const prev = h[h.length - 2];
    if (last.price > prev.price) {
      const delta = last.price - prev.price;
      out.push({
        key: `price:${s._id}:${last.changedAt}`, type: 'price', severity: 'warning',
        title: `${s.name} price went up by ${fmt.money(delta, s.currency)}`,
        body: `The recorded price changed from ${fmt.money(prev.price, s.currency)} to ${fmt.money(last.price, s.currency)} on ${fmt.date(last.changedAt)}.`,
        impact: `${fmt.money(delta * annualFactor(s.cycle, s.customDays), s.currency)} more per year`,
        action: 'Decide whether it is still worth it at the new price.',
        link: `/subscriptions/${s._id}`, subIds: [s._id],
      });
    }
  }

  // Plan comparison, only where the user entered a real alternative price
  for (const s of counted) {
    if (!s.altCycle || s.altPrice == null) continue;
    const alt = s.altPrice * annualFactor(s.altCycle);
    const cur = annualCost(s);
    if (alt < cur - 0.5) {
      out.push({
        key: `plan:${s._id}:${s.altCycle}:${s.altPrice}`, type: 'plan', severity: 'positive',
        title: `${cycleWord[s.altCycle] || s.altCycle} billing could cost less for ${s.name}`,
        body: `Using the alternative price you entered (${fmt.money(s.altPrice, s.currency)} ${cycleWord[s.altCycle] || ''}), the yearly cost would be ${fmt.money(alt, s.currency)} instead of ${fmt.money(cur, s.currency)}.`,
        impact: `${fmt.money(cur - alt, s.currency)} less per year`,
        action: 'Confirm the price with the provider before switching.',
        link: `/subscriptions/${s._id}`, subIds: [s._id],
      });
    }
  }

  // Review reminders
  for (const s of counted) {
    if (!s.lastReviewedAt) continue;
    const days = diffDays(today, s.lastReviewedAt);
    if (days >= 90) {
      out.push({
        key: `review:${s._id}`, type: 'review', severity: 'info',
        title: `${s.name} has not been reviewed in ${days} days`,
        body: `You last marked it as reviewed on ${fmt.date(s.lastReviewedAt)}.`,
        impact: `${fmt.money(annualCost(s), s.currency)} per year`,
        action: 'Open it and mark it as reviewed if it is still useful.',
        link: `/subscriptions/${s._id}`, subIds: [s._id],
      });
    }
  }

  return out.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title)
  );
}

export function isInsightHidden(state, today) {
  if (!state) return false;
  if (state.status === 'snoozed') return !state.until || today < state.until;
  return true; // dismissed or resolved
}
