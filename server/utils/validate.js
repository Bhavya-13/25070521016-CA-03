import { isISO } from './dates.js';

export const CATEGORIES = [
  'Productivity', 'Entertainment', 'Music', 'Cloud Storage',
  'Education', 'Utilities', 'Health', 'Other',
];
export const CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
export const STATUSES = ['active', 'paused', 'cancelled'];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'];

const str = (v, max) => String(v ?? '').trim().slice(0, max);

export function cleanSubscription(body) {
  const name = str(body.name, 60);
  const price = Number(body.price);
  const cycle = body.cycle;

  if (!name) return { error: 'Name is required' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a valid price' };
  if (!CYCLES.includes(cycle)) return { error: 'Choose a valid billing frequency' };
  if (!isISO(body.nextRenewal)) return { error: 'Choose a valid next billing date' };

  let customDays = null;
  if (cycle === 'custom') {
    customDays = Math.round(Number(body.customDays));
    if (!Number.isFinite(customDays) || customDays < 1 || customDays > 730) {
      return { error: 'Custom interval must be between 1 and 730 days' };
    }
  }

  const startDate = body.startDate ? String(body.startDate) : null;
  if (startDate && !isISO(startDate)) return { error: 'Start date is not valid' };

  let reminderDays = Math.round(Number(body.reminderDays));
  if (!Number.isFinite(reminderDays)) reminderDays = 3;
  reminderDays = Math.min(60, Math.max(0, reminderDays));

  let altCycle = null;
  let altPrice = null;
  if (body.altPrice !== '' && body.altPrice != null && body.altCycle) {
    const p = Number(body.altPrice);
    if (!CYCLES.includes(body.altCycle) || body.altCycle === 'custom') {
      return { error: 'Alternative plan frequency is not valid' };
    }
    if (!Number.isFinite(p) || p < 0) return { error: 'Alternative plan price is not valid' };
    altCycle = body.altCycle;
    altPrice = p;
  }

  return {
    data: {
      name,
      category: CATEGORIES.includes(body.category) ? body.category : 'Other',
      price,
      currency: CURRENCIES.includes(body.currency) ? body.currency : 'INR',
      cycle,
      customDays,
      nextRenewal: body.nextRenewal,
      startDate,
      paymentMethod: str(body.paymentMethod, 40),
      status: STATUSES.includes(body.status) ? body.status : 'active',
      reminderDays,
      notes: str(body.notes, 500),
      color: /^#[0-9a-fA-F]{6}$/.test(body.color || '') ? body.color : '#8B78FF',
      icon: str(body.icon, 24),
      overlapGroup: str(body.overlapGroup, 40),
      altCycle,
      altPrice,
    },
  };
}
