import { diffDays } from './dates.js';
import { totals } from './finance.js';

const ORDER = { critical: 0, warning: 1, info: 2 };

// Notifications are derived from real data only: renewal dates, budget and open insights.
export function buildNotifications({ counted, settings, today, insights, fmt }) {
  const n = settings.notifications || {};
  const list = [];

  for (const s of counted) {
    const days = diffDays(s.nextRenewal, today);
    if (days === 0 && n.dueToday) {
      list.push({
        id: `due:${s._id}:${s.nextRenewal}`, severity: 'warning', kind: 'due',
        title: `${s.name} renews today`,
        body: `${fmt.money(s.price, s.currency)} is scheduled for today.`,
        link: `/subscriptions/${s._id}`,
      });
    } else if (days > 0 && n.renewals) {
      const lead = Number.isFinite(s.reminderDays) ? s.reminderDays : n.defaultReminderDays;
      if (days <= lead) {
        list.push({
          id: `renew:${s._id}:${s.nextRenewal}`, severity: 'info', kind: 'renewal',
          title: `${s.name} renews in ${days} ${days === 1 ? 'day' : 'days'}`,
          body: `${fmt.money(s.price, s.currency)} on ${fmt.date(s.nextRenewal)}.`,
          link: `/subscriptions/${s._id}`,
        });
      }
    }
  }

  const budget = Number(settings.budget?.monthly) || 0;
  if (budget > 0 && n.budget) {
    const { monthly } = totals(counted);
    const month = today.slice(0, 7);
    if (monthly > budget) {
      list.push({
        id: `budget:over:${month}`, severity: 'critical', kind: 'budget',
        title: 'Over your monthly budget',
        body: `${fmt.money(monthly)} of ${fmt.money(budget)} budgeted.`,
        link: '/savings',
      });
    } else if (monthly >= budget * 0.9) {
      list.push({
        id: `budget:near:${month}`, severity: 'warning', kind: 'budget',
        title: 'Approaching your monthly budget',
        body: `${fmt.percent(monthly / budget)} of ${fmt.money(budget)} used.`,
        link: '/savings',
      });
    }
  }

  if (n.insights) {
    for (const i of insights) {
      if (i.severity === 'critical' || i.severity === 'warning') {
        list.push({ id: `insight:${i.key}`, severity: i.severity, kind: 'insight', title: i.title, body: i.impact, link: '/insights' });
      }
    }
  }

  return list.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
