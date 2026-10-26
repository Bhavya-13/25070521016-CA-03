import mongoose from 'mongoose';

// Ledger of every wallet movement. provider / providerRef are empty today ("manual").
// A payment gateway can later fill them in when it confirms a real top-up.
const walletTxSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['topup', 'withdrawal', 'payment', 'refund'], required: true },
    delta: { type: Number, required: true }, // signed: + adds to balance, - removes
    balanceAfter: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    note: { type: String, default: '' },
    subId: { type: String, default: null },
    subName: { type: String, default: '' },
    forDate: { type: String, default: null },
    provider: { type: String, default: 'manual' },
    providerRef: { type: String, default: null },
  },
  { timestamps: true }
);

walletTxSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('WalletTx', walletTxSchema);
