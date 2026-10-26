import FxRate from '../models/FxRate.js';
import { CURRENCIES } from './validate.js';
import { toISO } from './dates.js';

const TTL_MS = 12 * 60 * 60 * 1000; // rates are reused for 12 hours
const MIN_REFRESH_MS = 10 * 60 * 1000; // a manual refresh is allowed at most every 10 minutes

// Free, key-less sources. The first covers every currency Watchdog supports; the second (ECB data) is the fallback.
const providers = () => [
  {
    name: 'ExchangeRate-API (open.er-api.com)',
    url: `${process.env.FX_BASE_URL || 'https://open.er-api.com'}/v6/latest/USD`,
    parse: (d) => {
      if (d.result !== 'success') throw new Error('unexpected payload');
      return { rates: d.rates, asOf: toISO(new Date(Number(d.time_last_update_unix) * 1000)) };
    },
  },
  {
    name: 'Frankfurter (European Central Bank)',
    url: `${process.env.FX_FALLBACK_URL || 'https://api.frankfurter.dev'}/v1/latest?base=USD`,
    parse: (d) => ({ rates: { ...d.rates, USD: 1 }, asOf: d.date }),
  },
];

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// keep only the currencies Watchdog supports, and only sane numbers
function clean(raw) {
  const rates = {};
  for (const c of CURRENCIES) {
    const v = Number(raw?.[c]);
    if (Number.isFinite(v) && v > 0) rates[c] = v;
  }
  rates.USD = 1;
  return rates;
}

async function fetchFresh() {
  let lastErr;
  for (const p of providers()) {
    try {
      const { rates, asOf } = p.parse(await fetchJson(p.url));
      const cleaned = clean(rates);
      if (Object.keys(cleaned).length < 5) throw new Error('too few rates returned');
      return { rates: cleaned, asOf: /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : toISO(new Date()), source: p.name };
    } catch (err) {
      lastErr = err;
      console.error(`Exchange rate source "${p.name}" failed:`, err.message);
    }
  }
  throw lastErr || new Error('no exchange rate source available');
}

const shape = (doc, stale) => ({
  base: 'USD',
  rates: doc.rates,
  asOf: doc.asOf,
  source: doc.source,
  fetchedAt: doc.fetchedAt,
  stale,
});

// Returns cached rates when they are fresh, otherwise fetches new ones.
// If every source is down it returns the last saved rates flagged stale (or throws when there are none).
export async function getRates({ force = false } = {}) {
  const cached = await FxRate.findOne({ key: 'latest' });
  const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity;
  if (cached && ((!force && age < TTL_MS) || (force && age < MIN_REFRESH_MS))) return shape(cached, false);

  try {
    const fresh = await fetchFresh();
    const doc = await FxRate.findOneAndUpdate(
      { key: 'latest' },
      { $set: { ...fresh, fetchedAt: new Date() } },
      { upsert: true, new: true }
    );
    return shape(doc, false);
  } catch (err) {
    if (cached) return shape(cached, true);
    throw err;
  }
}
