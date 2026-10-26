import Snapshot from '../models/Snapshot.js';
import Subscription from '../models/Subscription.js';
import { annualCost, monthlyCost } from './finance.js';

const round = (n) => Math.round(n * 100) / 100;

// Records the user's current recurring commitment against this month. Called whenever data is
// loaded or changed, so the history is built only from what was really recorded.
export async function recordSnapshot(userId, today) {
  try {
    const subs = await Subscription.find({ user: userId, status: 'active' });
    const data = {};
    for (const s of subs) {
      const cur = s.currency || 'INR';
      if (!data[cur]) data[cur] = { monthly: 0, annual: 0, active: 0, categories: {} };
      const m = monthlyCost(s);
      data[cur].monthly += m;
      data[cur].annual += annualCost(s);
      data[cur].active += 1;
      data[cur].categories[s.category] = (data[cur].categories[s.category] || 0) + m;
    }
    for (const cur of Object.keys(data)) {
      data[cur].monthly = round(data[cur].monthly);
      data[cur].annual = round(data[cur].annual);
      for (const c of Object.keys(data[cur].categories)) {
        data[cur].categories[c] = round(data[cur].categories[c]);
      }
    }
    await Snapshot.findOneAndUpdate(
      { user: userId, month: today.slice(0, 7) },
      { $set: { data } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Could not record snapshot:', err.message);
  }
}
