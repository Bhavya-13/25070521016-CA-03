import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import { useOverlay } from '../hooks/useOverlay.js';
import { nth } from '../utils/dates.js';

export default function PaymentDialog({ subId, forDate, source: presetSource, onClose }) {
  const { subs, wallet, fmt, today, paySub, converter } = useData();
  const toast = useToast();
  const ref = useRef(null);
  const titleId = useId();
  useOverlay(onClose, ref);

  const sub = subs.find((s) => s._id === subId);
  const [source, setSource] = useState(presetSource === 'wallet' ? 'wallet' : 'manual');
  const [paidOn, setPaidOn] = useState(today);
  const [amount, setAmount] = useState(sub ? String(sub.price) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!sub) return null;

  const pending = Boolean(forDate);
  const target = pending ? forDate : sub.nextRenewal;
  const after = pending ? null : nth(sub.nextRenewal, sub.cycle, sub.customDays, 1);
  const amt = Number(amount);

  // what the wallet would be charged, converted to the wallet's currency when it differs
  const sameCurrency = wallet.currency === sub.currency;
  const need = sameCurrency ? amt : converter.convert(amt, sub.currency, wallet.currency);
  const walletOk = need != null;
  const enough = walletOk && Number.isFinite(need) && wallet.balance >= need;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!Number.isFinite(amt) || amt < 0) { setError('Enter a valid amount'); return; }
    if (source === 'manual' && (!paidOn || paidOn > today)) { setError('Choose a payment date that is not in the future'); return; }
    setBusy(true);
    try {
      await paySub(sub._id, {
        forDate: pending ? forDate : undefined,
        source,
        paidOn: source === 'manual' ? paidOn : undefined,
        amount: amt,
        note,
      });
      toast.success(`${sub.name} marked as paid`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form ref={ref} className="dialog form" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} tabIndex={-1}>
        <h2 id={titleId}>Mark {sub.name} as paid</h2>
        <p className="muted">
          {pending
            ? `For the renewal that was due on ${fmt.date(target)}.`
            : `For the upcoming renewal on ${fmt.date(target)}. Its next date will move to ${fmt.date(after)}.`}
        </p>
        {error && <div className="alert" role="alert">{error}</div>}

        <div className="source-options" role="radiogroup" aria-label="How was it paid?">
          <button type="button" role="radio" aria-checked={source === 'manual'} data-autofocus className={`source-opt ${source === 'manual' ? 'active' : ''}`} onClick={() => setSource('manual')}>
            <Check size={18} aria-hidden="true" />
            <strong>I paid it myself</strong>
            <span className="muted small">Just record it</span>
          </button>
          <button type="button" role="radio" aria-checked={source === 'wallet'} className={`source-opt ${source === 'wallet' ? 'active' : ''}`} onClick={() => setSource('wallet')} disabled={!walletOk}>
            <Wallet size={18} aria-hidden="true" />
            <strong>Use wallet</strong>
            <span className="muted small">
              {walletOk ? `Balance ${fmt.money(wallet.balance, wallet.currency)}` : `No exchange rate to ${wallet.currency}`}
            </span>
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">Amount ({sub.currency})</span>
            <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          {source === 'manual' ? (
            <label className="field">
              <span className="field-label">Paid on</span>
              <input type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </label>
          ) : (
            <label className="field">
              <span className="field-label">Paid on</span>
              <input value={fmt.date(today)} readOnly aria-readonly="true" />
            </label>
          )}
        </div>
        <label className="field">
          <span className="field-label">Note (optional)</span>
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid by UPI, ref 1234" />
        </label>

        {source === 'wallet' && (
          <>
            {walletOk && !sameCurrency && Number.isFinite(need) && (
              <p className="notice">
                The wallet holds {wallet.currency}, so this takes about <strong>{fmt.money(need, wallet.currency)}</strong> from it,
                converted at the current exchange rate.
              </p>
            )}
            {walletOk && !enough && (
              <p className="alert" role="alert">
                Your wallet has {fmt.money(wallet.balance, wallet.currency)}, which is not enough. <Link to="/wallet" onClick={onClose}>Add money</Link>
              </p>
            )}
            <p className="muted small">The wallet is a simulated balance. This lowers it and records the payment, but it does not send money to {sub.name}.</p>
          </>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || (source === 'wallet' && !enough)}>
            {busy ? 'Saving...' : 'Mark as paid'}
          </button>
        </div>
      </form>
    </div>
  );
}
