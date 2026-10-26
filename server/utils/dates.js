const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return toISO(d) === s ? d : null;
}

export const isISO = (s) => parseISO(s) !== null;

export function addDays(s, n) {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

// a - b in whole days
export function diffDays(a, b) {
  return Math.round((parseISO(a) - parseISO(b)) / 86400000);
}

export function addMonths(s, n) {
  const d = parseISO(s);
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return toISO(t);
}

export const startOfMonth = (s) => `${s.slice(0, 7)}-01`;
export const endOfMonth = (s) => {
  const d = parseISO(startOfMonth(s));
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
};
export const dayOfWeek = (s) => parseISO(s).getUTCDay(); // 0 = Sunday

// k-th renewal after `start` (k = 0 is `start` itself). Computed from the anchor, so months never drift.
export function nth(start, cycle, customDays, k) {
  switch (cycle) {
    case 'weekly': return addDays(start, 7 * k);
    case 'quarterly': return addMonths(start, 3 * k);
    case 'yearly': return addMonths(start, 12 * k);
    case 'custom': return addDays(start, Math.max(1, customDays || 30) * k);
    default: return addMonths(start, k);
  }
}

export function rollForward(start, cycle, customDays, today) {
  let k = 0;
  let cur = start;
  while (cur < today && k < 5000) {
    k += 1;
    cur = nth(start, cycle, customDays, k);
  }
  return cur;
}

export function localTodayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// Today's calendar date in the given IANA time zone ('auto' or empty = this device's zone)
export function todayISO(tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz && tz !== 'auto' ? tz : undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return localTodayISO();
  }
}
