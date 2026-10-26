// All rates are "units of this currency per 1 USD" (USD itself is 1).
// Your own rates (settings.fxManual) win over the live ones.
export function buildConverter({ rates, manual, enabled, display }) {
  const table = { USD: 1, ...(rates || {}), ...(manual || {}) };
  const ok = (a, b) => enabled !== false && table[a] > 0 && table[b] > 0;
  const rate = (from, to = display) => (from === to ? 1 : table[to] / table[from]);
  return {
    table,
    rate,
    has: (cur) => cur === display || ok(cur, display),
    convert: (amount, from, to = display) => (from === to ? amount : ok(from, to) ? amount * rate(from, to) : null),
    isManual: (cur) => Boolean(manual && manual[cur] > 0),
  };
}

// Turns recorded history (stored per currency) into one series in the display currency.
export function convertHistory(history, converter, display) {
  return history.map((h) => {
    let agg = null;
    for (const [cur, d] of Object.entries(h.data || {})) {
      const k = cur === display ? 1 : converter.has(cur) ? converter.rate(cur, display) : null;
      if (k == null) continue;
      if (!agg) agg = { monthly: 0, annual: 0, active: 0, categories: {} };
      agg.monthly += d.monthly * k;
      agg.annual += d.annual * k;
      agg.active += d.active;
      for (const [c, v] of Object.entries(d.categories || {})) agg.categories[c] = (agg.categories[c] || 0) + v * k;
    }
    return { month: h.month, data: agg ? { [display]: agg } : {} };
  });
}
