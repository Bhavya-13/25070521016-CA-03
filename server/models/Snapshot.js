import mongoose from 'mongoose';

// One record per user per month: the recurring commitment Watchdog recorded for that month.
// This is what powers the "recorded over time" charts. Nothing is back-filled or invented.
const snapshotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // YYYY-MM
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // { INR: { monthly, annual, active, categories } }
  },
  { timestamps: true, minimize: false }
);

snapshotSchema.index({ user: 1, month: 1 }, { unique: true });

export default mongoose.model('Snapshot', snapshotSchema);
