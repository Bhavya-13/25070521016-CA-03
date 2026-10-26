import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    // preferences, budget, goal, notification state (validated in utils/settings.js)
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Simulated wallet balance: just a number for now (see models/WalletTx.js for the ledger).
    wallet: {
      balance: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('User', userSchema);
