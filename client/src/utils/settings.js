export const DEFAULT_SETTINGS = {
  theme: 'dark',
  currency: 'INR',
  locale: 'en-IN',
  dateFormat: 'auto',
  timezone: 'auto',
  budget: { monthly: null, annual: null, savingsTarget: null },
  goal: null,
  notifications: { renewals: true, dueToday: true, budget: true, insights: true, overdue: true, defaultReminderDays: 3 },
  insightStates: {},
  readNotifications: [],
};

const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Mirrors the server's merge so the UI can update instantly. A null insight state removes it.
export function mergeSettings(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'insightStates') {
      const map = { ...(base.insightStates || {}) };
      for (const [ik, iv] of Object.entries(v || {})) {
        if (iv === null) delete map[ik];
        else map[ik] = iv;
      }
      out.insightStates = map;
    } else if (isPlain(v) && isPlain(base[k])) {
      out[k] = { ...base[k], ...v };
    } else {
      out[k] = v;
    }
  }
  return out;
}
