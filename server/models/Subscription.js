import mongoose from 'mongoose';

export const CYCLES = ['monthly', 'yearly'];
export const CATEGORIES = [
  'Entertainment',
  'Music',
  'Productivity',
  'Cloud',
  'Education',
  'Health',
  'Other',
];

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    cycle: { type: String, enum: CYCLES, default: 'monthly' },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    color: { type: String, default: '#6c8cff' },
    nextRenewal: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);
