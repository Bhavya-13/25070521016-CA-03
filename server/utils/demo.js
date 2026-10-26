import { addDays } from './dates.js';

// Clearly flagged sample records (isDemo: true) so users can explore the app and remove them later.
export function buildDemo(today) {
  const d = (n) => addDays(today, n);
  const base = { notes: 'Demo data', isDemo: true, reminderDays: 3, currency: 'INR' };
  return [
    { ...base, name: 'Netflix', category: 'Entertainment', price: 649, cycle: 'monthly', nextRenewal: d(3), color: '#E50914', icon: 'Film', paymentMethod: 'Credit card', overlapGroup: 'Video streaming', startDate: d(-400) },
    { ...base, name: 'Spotify', category: 'Music', price: 119, cycle: 'monthly', nextRenewal: d(1), color: '#1DB954', icon: 'Music', paymentMethod: 'UPI', altCycle: 'yearly', altPrice: 1189, startDate: d(-600) },
    { ...base, name: 'ChatGPT Plus', category: 'Productivity', price: 1999, cycle: 'monthly', nextRenewal: d(6), color: '#10A37F', icon: 'Zap', paymentMethod: 'Credit card', priceHistory: [{ price: 1700, changedAt: d(-120) }, { price: 1999, changedAt: d(-20) }] },
    { ...base, name: 'Disney+ Hotstar', category: 'Entertainment', price: 899, cycle: 'quarterly', nextRenewal: d(9), color: '#1F80E0', icon: 'Tv', paymentMethod: 'UPI', overlapGroup: 'Video streaming' },
    { ...base, name: 'Google One', category: 'Cloud Storage', price: 130, cycle: 'monthly', nextRenewal: d(12), color: '#FBBC04', icon: 'Cloud', paymentMethod: 'UPI' },
    { ...base, name: 'iCloud+', category: 'Cloud Storage', price: 75, cycle: 'monthly', nextRenewal: d(17), color: '#4F9CFF', icon: 'Cloud', paymentMethod: 'Debit card' },
    { ...base, name: 'Coursera Plus', category: 'Education', price: 29999, cycle: 'yearly', nextRenewal: d(75), color: '#0056D2', icon: 'BookOpen', paymentMethod: 'Credit card' },
    { ...base, name: 'Gym membership', category: 'Health', price: 1000, cycle: 'monthly', nextRenewal: d(0), color: '#F97316', icon: 'Dumbbell', paymentMethod: 'UPI' },
    { ...base, name: 'Canva Pro', category: 'Productivity', price: 499, cycle: 'monthly', nextRenewal: d(14), color: '#8B5CF6', status: 'paused' },
    { ...base, name: 'Audible', category: 'Music', price: 199, cycle: 'monthly', nextRenewal: d(20), color: '#F59E0B', status: 'cancelled' },
  ];
}
