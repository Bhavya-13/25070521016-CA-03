import mongoose from 'mongoose';

const priceEntry = new mongoose.Schema({ price: Number, changedAt: String }, { _id: false });

// Dates are stored as plain "YYYY-MM-DD" strings so they never shift with time zones.
// Stored in a fresh collection (subscriptions_v2) because the data shape changed.
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, default: 'Other' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    cycle: { type: String, default: 'monthly' },
    customDays: { type: Number, default: null },
    nextRenewal: { type: String, required: true },
    startDate: { type: String, default: null },
    paymentMethod: { type: String, default: '' },
    status: { type: String, default: 'active' },
    reminderDays: { type: Number, default: 3 },
    notes: { type: String, default: '' },
    color: { type: String, default: '#8B78FF' },
    icon: { type: String, default: '' },
    overlapGroup: { type: String, default: '' },
    altCycle: { type: String, default: null },
    altPrice: { type: Number, default: null },
    priceHistory: { type: [priceEntry], default: [] },
    lastReviewedAt: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema, 'subscriptions_v2');
