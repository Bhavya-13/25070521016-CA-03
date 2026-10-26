import { isISO } from './dates.js';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: 'INR',
  locale: 'en-IN',
  dateFormat: 'auto',
  timezone: 'auto',
  budget: { monthly: null, annual: null, savingsTarget: null },
  goal: null,
  notifications: {
    renewals: true,
    dueToday: true,
    budget: true,
    insights: true,
    overdue: true,
    defaultReminderDays: 3,
  },
  insightStates: {},
  readNotifications: [],
};

const THEMES = ['dark', 'light', 'system'];
const DATE_FORMATS = ['auto', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'];

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);
const numOrNull = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function resolveSettings(stored) {
  const s = isPlain(stored) ? stored : {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    budget: { ...DEFAULT_SETTINGS.budget, ...(isPlain(s.budget) ? s.budget : {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(isPlain(s.notifications) ? s.notifications : {}) },
    insightStates: isPlain(s.insightStates) ? s.insightStates : {},
    readNotifications: Array.isArray(s.readNotifications) ? s.readNotifications : [],
  };
}

// Applies a partial update, ignoring anything invalid or unknown.
export function applySettingsPatch(stored, patch) {
  const next = resolveSettings(stored);
  if (!isPlain(patch)) return next;

  if (THEMES.includes(patch.theme)) next.theme = patch.theme;
  if (CURRENCIES.includes(patch.currency)) next.currency = patch.currency;
  if (typeof patch.locale === 'string' && patch.locale.length <= 16) next.locale = patch.locale;
  if (DATE_FORMATS.includes(patch.dateFormat)) next.dateFormat = patch.dateFormat;
  if (typeof patch.timezone === 'string' && patch.timezone.length <= 60) next.timezone = patch.timezone;

  if (isPlain(patch.budget)) {
    for (const k of ['monthly', 'annual', 'savingsTarget']) {
      if (k in patch.budget) {
        const v = numOrNull(patch.budget[k]);
        if (v !== undefined) next.budget[k] = v;
      }
    }
  }

  if ('goal' in patch) {
    const g = patch.goal;
    if (g === null) next.goal = null;
    else if (isPlain(g)) {
      const percent = Number(g.percent);
      const baseline = Number(g.baselineMonthly);
      if (percent >= 1 && percent <= 90 && Number.isFinite(baseline) && baseline >= 0 && isISO(g.setAt)) {
        next.goal = {
          percent,
          baselineMonthly: baseline,
          currency: CURRENCIES.includes(g.currency) ? g.currency : next.currency,
          setAt: g.setAt,
        };
      }
    }
  }

  if (isPlain(patch.notifications)) {
    for (const k of ['renewals', 'dueToday', 'budget', 'insights', 'overdue']) {
      if (typeof patch.notifications[k] === 'boolean') next.notifications[k] = patch.notifications[k];
    }
    const d = Math.round(Number(patch.notifications.defaultReminderDays));
    if (Number.isFinite(d) && d >= 0 && d <= 60) next.notifications.defaultReminderDays = d;
  }

  if (isPlain(patch.insightStates)) {
    const map = { ...next.insightStates };
    for (const [key, val] of Object.entries(patch.insightStates)) {
      if (key.length > 120) continue;
      if (val === null) delete map[key];
      else if (isPlain(val) && ['dismissed', 'resolved', 'snoozed'].includes(val.status)) {
        map[key] = { status: val.status, ...(isISO(val.until) ? { until: val.until } : {}) };
      }
    }
    next.insightStates = map;
  }

  if (Array.isArray(patch.readNotifications)) {
    next.readNotifications = patch.readNotifications
      .filter((x) => typeof x === 'string' && x.length <= 140)
      .slice(-300);
  }

  return next;
}
