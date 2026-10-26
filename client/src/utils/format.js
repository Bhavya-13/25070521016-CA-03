import { diffDays, parseISO } from './dates.js';

const p2 = (n) => String(n).padStart(2, '0');

export function makeFormatters(settings) {
  const locale = settings.locale || 'en-IN';
  const currency = settings.currency || 'INR';

  const money = (n, cur = currency, opts = {}) => {
    const v = Number(n) || 0;
    const digits = opts.decimals ?? (Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: cur,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(v);
    } catch {
      return `${cur} ${v.toFixed(digits)}`;
    }
  };
  const moneyRound = (n, cur = currency) => money(n, cur, { decimals: 0 });
  const number = (n) => new Intl.NumberFormat(locale).format(Number(n) || 0);
  const percent = (x, d = 0) => `${((Number(x) || 0) * 100).toFixed(d)}%`;

  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const monthShortYear = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });

  const date = (iso) => {
    const d = parseISO(iso);
    if (!d) return '-';
    switch (settings.dateFormat) {
      case 'DD/MM/YYYY': return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
      case 'MM/DD/YYYY': return `${p2(d.getUTCMonth() + 1)}/${p2(d.getUTCDate())}/${d.getUTCFullYear()}`;
      case 'YYYY-MM-DD': return iso;
      default: return full.format(d);
    }
  };

  const wrap = (fmt) => (iso) => { const d = parseISO(iso); return d ? fmt.format(d) : '-'; };

  return {
    money,
    moneyRound,
    number,
    percent,
    date,
    shortDate: wrap(short),
    monthYear: wrap(monthYear),
    monthShort: wrap(monthShort),
    monthShortYear: wrap(monthShortYear),
    weekdayShort: wrap(weekdayShort),
    weekdayLong: wrap(weekdayLong),
  };
}

// How a subscription should be presented right now.
export function renewalState(sub, today) {
  if (sub.status === 'cancelled') return { key: 'cancelled', label: 'Cancelled', days: null };
  if (sub.status === 'paused') return { key: 'paused', label: 'Paused', days: null };
  const days = diffDays(sub.nextRenewal, today);
  if (days < 0) return { key: 'urgent', label: `Overdue by ${-days}d`, days };
  if (days === 0) return { key: 'today', label: 'Due today', days };
  if (days === 1) return { key: 'soon', label: 'Tomorrow', days };
  if (days <= 7) return { key: 'soon', label: `In ${days} days`, days };
  return { key: 'ok', label: `In ${days} days`, days };
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
