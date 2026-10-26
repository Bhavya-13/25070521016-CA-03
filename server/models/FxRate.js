import mongoose from 'mongoose';

// One cached document of exchange rates, shared by every user.
// rates = units of each currency per 1 USD (USD is always 1).
const fxSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'latest', unique: true },
    rates: { type: mongoose.Schema.Types.Mixed, default: {} },
    asOf: { type: String, default: null }, // YYYY-MM-DD the provider last updated its rates
    source: { type: String, default: '' },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('FxRate', fxSchema);
