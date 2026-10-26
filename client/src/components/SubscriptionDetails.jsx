import { Ban, Check, CheckCheck, Pause, Pencil, Play, Receipt, RotateCcw, Trash2, Undo2, Wallet } from 'lucide-react';
import Drawer from './ui/Drawer.jsx';
import EmptyState from './ui/EmptyState.jsx';
import ServiceIcon from './ServiceIcon.jsx';
import StatusBadge, { PaidBadge } from './StatusBadge.jsx';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { annualCost, cycleText, monthlyCost } from '../utils/finance.js';
import { renewalState } from '../utils/format.js';

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

export default function SubscriptionDetails({ sub, actions, onClose }) {
  const { fmt, today, settings, currency, converter } = useData();
  const { openEdit, openPay } = useUI();
  const st = renewalState(sub, today);
  const history = [...(sub.priceHistory || [])].reverse();
  const payments = [...(sub.payments || [])].reverse();
  const pending = sub.status === 'active' ? sub.pendingDates || [] : [];
  const inTotals = sub.status === 'active' && converter.has(sub.currency);
  const approx = sub.currency !== currency && converter.has(sub.currency);
  const lead = Number.isFinite(sub.reminderDays) ? sub.reminderDays : settings.notifications.defaultReminderDays;

  return (
    <Drawer
      title={sub.name}
      subtitle={`${sub.category}${sub.isDemo ? ' - Demo data' : ''}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn ghost danger-text" onClick={() => actions.askDelete(sub)}>
            <Trash2 size={16} /> Delete
          </button>
          <button type="button" className="btn primary" onClick={() => { onClose(); openEdit(sub); }}>
            <Pencil size={16} /> Edit
          </button>
        </>
      }
    >
      <div className="detail-head">
        <ServiceIcon name={sub.name} color={sub.color} icon={sub.icon} size={56} />
        <div>
          <div className="detail-price">
            {approx ? `\u2248 ${fmt.money(converter.convert(sub.price, sub.currency), currency)}` : fmt.money(sub.price, sub.currency)} <span className="muted">{cycleText(sub).toLowerCase()}</span>
          </div>
          {approx && <span className="muted small">{fmt.money(sub.price, sub.currency)} originally</span>}
          <div className="badge-stack inline">
            <StatusBadge state={st} />
            <PaidBadge sub={sub} />
          </div>
        </div>
      </div>

      {!inTotals && (
        <p className="notice">
          {sub.status !== 'active'
            ? `This subscription is ${sub.status}, so it is not counted in your recurring totals.`
            : `This subscription is in ${sub.currency} and no exchange rate to ${currency} is available, so it is left out of totals.`}
        </p>
      )}

      <div className="stat-grid">
        <Stat label="Next renewal" value={sub.status === 'cancelled' ? '-' : fmt.date(sub.nextRenewal)} hint={sub.status === 'active' ? st.label : undefined} />
        <Stat label="Billing cycle" value={cycleText(sub)} />
        <Stat label="Monthly equivalent" value={fmt.money(monthlyCost(sub), sub.currency)} hint={approx ? `about ${fmt.money(converter.convert(monthlyCost(sub), sub.currency))} in ${currency}` : undefined} />
        <Stat label="Annualized cost" value={fmt.money(annualCost(sub), sub.currency)} hint="Projected, not money already spent" />
        <Stat label="Payment method" value={sub.paymentMethod || 'Not specified'} />
        <Stat label="Started" value={sub.startDate ? fmt.date(sub.startDate) : 'Not specified'} />
      </div>

      <section className="section">
        <h3>Payments</h3>

        {pending.length > 0 && (
          <ul className="pay-list pending">
            {pending.map((d) => (
              <li key={d}>
                <div>
                  <strong>{fmt.date(d)}</strong>
                  <span className="muted small">Renewal not marked as paid</span>
                </div>
                <div className="pay-actions">
                  <button type="button" className="btn primary small" onClick={() => openPay(sub._id, d)}><Check size={14} /> Mark as paid</button>
                  <button type="button" className="btn ghost small" onClick={() => actions.skip(sub, d)}>Skip</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sub.status === 'active' && (
          <div className="pay-next">
            <div>
              <span className="muted small">Upcoming renewal</span>
              <strong>{fmt.date(sub.nextRenewal)}</strong>
            </div>
            <div className="pay-actions">
              <button type="button" className="btn ghost small" onClick={() => openPay(sub._id)}><Check size={14} /> Mark as paid</button>
              <button type="button" className="btn ghost small" onClick={() => openPay(sub._id, null, 'wallet')}><Wallet size={14} /> Pay from wallet</button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <EmptyState compact icon={Receipt} title="No payments recorded" text="Mark a renewal as paid and it is listed here. Watchdog only records payments you confirm." />
        ) : (
          <ul className="pay-history">
            {payments.map((p, i) => (
              <li key={p._id || `${p.forDate}-${i}`}>
                <div>
                  <strong>{fmt.money(p.amount, p.currency)}</strong>
                  <span className="muted small">
                    Paid {fmt.date(p.paidOn)} for the {fmt.date(p.forDate)} renewal{p.note ? ` - ${p.note}` : ''}
                  </span>
                </div>
                <span className={`tag ${p.source === 'wallet' ? 'wallet' : 'plain'}`}>{p.source === 'wallet' ? 'Wallet' : 'Manual'}</span>
                {i === 0 && (
                  <button type="button" className="btn ghost small" onClick={() => actions.askUndo(sub)}><Undo2 size={14} /> Undo</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Paying from the wallet only changes your Watchdog balance. It does not send money to {sub.name}.</p>
      </section>

      <section className="section">
        <h3>Reminders</h3>
        <p className="muted">
          {lead === 0 ? 'You are reminded on the day it renews.' : `You are reminded ${lead} ${lead === 1 ? 'day' : 'days'} before it renews.`}
          {!settings.notifications.renewals && ' Renewal reminders are switched off in Settings.'}
        </p>
        <p className="muted small">Last reviewed: {sub.lastReviewedAt ? fmt.date(sub.lastReviewedAt) : 'never'}</p>
      </section>

      {sub.notes && (
        <section className="section">
          <h3>Notes</h3>
          <p className="note">{sub.notes}</p>
        </section>
      )}

      {(sub.overlapGroup || sub.altPrice != null) && (
        <section className="section">
          <h3>Comparison details</h3>
          {sub.overlapGroup && <p className="muted">Overlap group: <strong className="plain">{sub.overlapGroup}</strong></p>}
          {sub.altPrice != null && (
            <p className="muted">
              Alternative plan: <strong className="plain">{fmt.money(sub.altPrice, sub.currency)} {sub.altCycle}</strong>
              {' '}({fmt.money(sub.altPrice * (sub.altCycle === 'weekly' ? 52 : sub.altCycle === 'quarterly' ? 4 : sub.altCycle === 'yearly' ? 1 : 12), sub.currency)} per year)
            </p>
          )}
        </section>
      )}

      <section className="section">
        <h3>Price history</h3>
        {history.length === 0 ? (
          <p className="muted">No price changes recorded yet.</p>
        ) : (
          <ul className="price-history">
            {history.map((h, i) => {
              const prev = history[i + 1];
              const delta = prev ? h.price - prev.price : null;
              return (
                <li key={`${h.changedAt}-${i}`}>
                  <span className="muted">{fmt.date(h.changedAt)}</span>
                  <strong>{fmt.money(h.price, sub.currency)}</strong>
                  {delta != null && delta !== 0 && (
                    <span className={`trend ${delta > 0 ? 'bad' : 'good'}`}>{delta > 0 ? '+' : ''}{fmt.money(delta, sub.currency)}</span>
                  )}
                  {delta == null && <span className="muted small">First recorded</span>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">Recorded whenever you change the price in Watchdog.</p>
      </section>

      <section className="section">
        <h3>Manage</h3>
        <div className="manage-actions">
          <button type="button" className="btn ghost" onClick={() => actions.review(sub)}>
            <CheckCheck size={16} /> Mark as reviewed
          </button>
          {sub.status === 'cancelled' ? (
            <button type="button" className="btn ghost" onClick={() => actions.reactivate(sub)}>
              <RotateCcw size={16} /> Reactivate tracking
            </button>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={() => actions.togglePause(sub)}>
                {sub.status === 'paused' ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
              </button>
              <button type="button" className="btn ghost" onClick={() => actions.askCancel(sub)}>
                <Ban size={16} /> Mark as cancelled
              </button>
            </>
          )}
        </div>
        <p className="muted small">
          Pausing and cancelling here only change how Watchdog tracks this subscription. They do not contact {sub.name}.
        </p>
      </section>
    </Drawer>
  );
}
