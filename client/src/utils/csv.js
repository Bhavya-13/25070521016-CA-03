import { annualCost, monthlyCost } from './finance.js';

export const CSV_COLUMNS = [
  'name', 'category', 'price', 'currency', 'cycle', 'custom_days', 'next_renewal', 'start_date',
  'payment_method', 'status', 'reminder_days', 'overlap_group', 'notes', 'monthly_cost', 'annual_cost',
];

const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const round2 = (n) => Math.round(n * 100) / 100;

export function subscriptionsToCSV(subs) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const s of subs) {
    lines.push(
      [
        s.name, s.category, s.price, s.currency, s.cycle, s.customDays ?? '', s.nextRenewal,
        s.startDate ?? '', s.paymentMethod, s.status, s.reminderDays, s.overlapGroup, s.notes,
        round2(monthlyCost(s)), round2(annualCost(s)),
      ].map(esc).join(',')
    );
  }
  return lines.join('\r\n');
}

export function historyToCSV(history, currency) {
  const lines = ['month,currency,monthly_recurring,annual_recurring,active_subscriptions'];
  for (const h of history) {
    const d = h.data?.[currency];
    if (d) lines.push([h.month, currency, d.monthly, d.annual, d.active].join(','));
  }
  return lines.join('\r\n');
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff' + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// Small RFC-4180 style parser (quotes, escaped quotes, CRLF).
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^\ufeff/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 1; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const ALIASES = {
  renewal_date: 'next_renewal', next_billing_date: 'next_renewal', billing_cycle: 'cycle',
  frequency: 'cycle', payment: 'payment_method', group: 'overlap_group',
};

export function parseSubscriptionCSV(text) {
  const table = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (table.length < 2) return { rows: [], errors: ['The file has no data rows.'] };

  const header = table[0].map((h) => {
    const k = h.trim().toLowerCase().replace(/\s+/g, '_');
    return ALIASES[k] || k;
  });
  const col = (name) => header.indexOf(name);
  const missing = ['name', 'price', 'next_renewal'].filter((c) => col(c) < 0);
  if (missing.length) return { rows: [], errors: [`Missing required column(s): ${missing.join(', ')}.`] };

  const get = (r, name) => (col(name) >= 0 ? String(r[col(name)] ?? '').trim() : '');
  const rows = table.slice(1).map((r, i) => ({
    _row: i + 2,
    name: get(r, 'name'),
    category: get(r, 'category') || 'Other',
    price: get(r, 'price'),
    currency: get(r, 'currency').toUpperCase() || undefined,
    cycle: (get(r, 'cycle') || 'monthly').toLowerCase(),
    customDays: get(r, 'custom_days'),
    nextRenewal: get(r, 'next_renewal'),
    startDate: get(r, 'start_date'),
    paymentMethod: get(r, 'payment_method'),
    status: (get(r, 'status') || 'active').toLowerCase(),
    reminderDays: get(r, 'reminder_days'),
    overlapGroup: get(r, 'overlap_group'),
    notes: get(r, 'notes'),
  }));
  return { rows, errors: [] };
}
