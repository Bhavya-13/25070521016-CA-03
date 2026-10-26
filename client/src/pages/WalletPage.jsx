import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Info, Wallet as WalletIcon } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ServiceIcon from '../components/ServiceIcon.jsx';
import { diffDays } from '../utils/dates.js';
import { windowTotals } from '../utils/finance.js';

const TYPE_LABEL = { topup: 'Added money', withdrawal: 'Removed money', payment: 'Subscription payment', refund: 'Refund' };
const QUICK = [500, 1000, 5000];

export default function WalletPage() {
  const { wallet, walletTx, activeSubs, unpaid, today, fmt, settings, topUp, withdraw, loading } = useData();
  const { openPay } = useUI();
  const toast = useToast();
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const inWallet = useMemo(() => activeSubs.filter((s) => s.currency === wallet.currency), [activeSubs, wallet.currency]);
  const w30 = useMemo(() => windowTotals(inWallet, today, 30), [inWallet, today]);
  const shortfall = Math.max(0, w30.total - wallet.balance);

  const payNow = useMemo(() => {
    const pending = unpaid.filter((u) => u.sub.currency === wallet.currency).map((u) => ({ sub: u.sub, date: u.date, pending: true }));
    const soon = inWallet
      .filter((s) => diffDays(s.nextRenewal, today) <= 7)
      .map((s) => ({ sub: s, date: s.nextRenewal, pending: false }));
    return [...pending, ...soon].sort((a, b) => a.date.localeCompare(b.date));
  }, [unpaid, inWallet, wallet.currency, today]);

  const when = useMemo(
    () => new Intl.DateTimeFormat(settings.locale || undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [settings.locale]
  );

  const submit = async (e) => {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) { toast.error('Enter an amount above 0'); return; }
    setBusy(true);
    try {
      if (mode === 'add') await topUp(v, note);
      else await withdraw(v, note);
      toast.success(mode === 'add' ? `Added ${fmt.money(v, wallet.currency)} to your wallet` : `Removed ${fmt.money(v, wallet.currency)} from your wallet`);
      setAmount('');
      setNote('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="stack"><Skeleton height={160} radius={20} /><Skeleton height={260} radius={16} /></div>;
  }

  return (
    <div className="stack">
      <PageHeader title="Wallet" subtitle="Keep a balance for subscription payments and see every movement." />

      <p className="notice">
        <Info size={16} aria-hidden="true" />
        This is a simulated balance: just a number stored in Watchdog. Adding money does not charge anyone, and paying a
        subscription from it records a payment you confirm. It does not send money to the provider.
      </p>

      <section className="card wallet-hero">
        <div>
          <span className="muted small">Wallet balance</span>
          <div className="wallet-balance" aria-live="polite">{fmt.money(wallet.balance, wallet.currency)}</div>
          <span className="tag plain">Simulated</span>
        </div>
        <div className="wallet-cover">
          <span className="muted small">Next 30 days of scheduled charges ({wallet.currency})</span>
          <strong>{fmt.money(w30.total, wallet.currency)}</strong>
          <span className={shortfall > 0 ? 'trend bad' : 'trend good'}>
            {w30.total === 0 ? 'Nothing scheduled' : shortfall > 0 ? `Short by ${fmt.money(shortfall, wallet.currency)}` : 'Your balance covers these'}
          </span>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>{mode === 'add' ? 'Add money' : 'Remove money'}</h2>
            <Segmented
              label="Wallet action"
              value={mode}
              onChange={setMode}
              options={[{ value: 'add', label: 'Add' }, { value: 'withdraw', label: 'Remove' }]}
            />
          </div>
          <form onSubmit={submit}>
            <label className="field">
              <span className="field-label">Amount ({wallet.currency})</span>
              <input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </label>
            {mode === 'add' && (
              <div className="chips quick-amounts">
                {QUICK.map((q) => (
                  <button key={q} type="button" className="chip" onClick={() => setAmount(String(q))}>+ {fmt.moneyRound(q, wallet.currency)}</button>
                ))}
              </div>
            )}
            <label className="field">
              <span className="field-label">Note (optional)</span>
              <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Saving...' : mode === 'add' ? 'Add money' : 'Remove money'}
            </button>
            <p className="muted small">
              {mode === 'add'
                ? 'This only adds a number to your Watchdog balance.'
                : 'Use this to correct the balance. It cannot go below zero.'}
            </p>
          </form>
        </section>

        <section className="card">
          <div className="card-head"><h2>Ready to pay</h2></div>
          {payNow.length === 0 ? (
            <EmptyState compact icon={WalletIcon} title="Nothing to pay right now" text="Unpaid renewals and renewals due within 7 days appear here." />
          ) : (
            <ul className="unpaid-list">
              {payNow.map(({ sub, date, pending }) => (
                <li key={`${sub._id}-${date}`}>
                  <ServiceIcon name={sub.name} color={sub.color} icon={sub.icon} size={36} />
                  <span className="unpaid-main">
                    <strong>{sub.name}</strong>
                    <span className="muted small">{pending ? 'Unpaid, due ' : 'Due '}{fmt.date(date)} - {fmt.money(sub.price, sub.currency)}</span>
                  </span>
                  <button type="button" className="btn primary small" onClick={() => openPay(sub._id, pending ? date : null, 'wallet')}>Pay from wallet</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Transactions</h2></div>
        {walletTx.length === 0 ? (
          <EmptyState compact icon={WalletIcon} title="No transactions yet" text="Add some money and every movement is listed here." />
        ) : (
          <div className="table-wrap">
            <table className="table simple">
              <thead>
                <tr><th scope="col">Date</th><th scope="col">Details</th><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">Balance after</th></tr>
              </thead>
              <tbody>
                {walletTx.map((t) => (
                  <tr key={t.id}>
                    <td>{when.format(new Date(t.createdAt))}</td>
                    <td>{t.subName ? `${t.subName}${t.forDate ? ` (${fmt.shortDate(t.forDate)})` : ''}` : t.note || '-'}</td>
                    <td><span className="tag plain">{TYPE_LABEL[t.type]}</span></td>
                    <td>
                      <span className={`tx-amount ${t.delta >= 0 ? 'plus' : 'minus'}`}>
                        {t.delta >= 0 ? <ArrowDownLeft size={14} aria-hidden="true" /> : <ArrowUpRight size={14} aria-hidden="true" />}
                        {t.delta >= 0 ? '+' : '-'}{fmt.money(Math.abs(t.delta), t.currency)}
                      </span>
                    </td>
                    <td>{fmt.money(t.balanceAfter, t.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card explain">
        <h2>About real payments later</h2>
        <ul>
          <li><strong>Today:</strong> the balance is a number in your database. Nothing connects to a bank, card or payment provider.</li>
          <li><strong>Adding real money:</strong> every wallet transaction already has <code>provider</code> and <code>providerRef</code> fields. A gateway such as Razorpay, Stripe or Cashfree can credit the wallet through a verified webhook when a real payment succeeds.</li>
          <li><strong>Paying providers:</strong> services like Netflix or Spotify do not accept payments through third-party sites. Real options include UPI AutoPay mandates, bill-payment networks or virtual cards, and each has its own rules.</li>
          <li><strong>Holding money for others:</strong> storing and moving other people's money is regulated (for example RBI rules for prepaid wallets in India), so a real launch usually needs a licensed partner. Check with a payments provider or a lawyer first.</li>
        </ul>
      </section>
    </div>
  );
}
