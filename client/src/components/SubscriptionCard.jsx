import { Check, Eye, Pause, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import ServiceIcon from './ServiceIcon.jsx';
import './fx.css';
import StatusBadge, { PaidBadge, UnpaidBadge } from './StatusBadge.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { cycleText } from '../utils/finance.js';
import { renewalState } from '../utils/format.js';

export function QuickActions({ sub, onOpen, onEdit, actions }) {
  const { openPay } = useUI();
  return (
    <div className="quick-actions">
      <button type="button" className="icon-btn sm" onClick={() => onOpen(sub)} aria-label={`View ${sub.name}`} title="Details"><Eye size={15} /></button>
      {sub.status === 'active' && (
        <button type="button" className="icon-btn sm" onClick={() => openPay(sub._id, (sub.pendingDates || [])[0] || null)} aria-label={`Mark ${sub.name} as paid`} title="Mark as paid"><Check size={15} /></button>
      )}
      <button type="button" className="icon-btn sm" onClick={() => onEdit(sub)} aria-label={`Edit ${sub.name}`} title="Edit"><Pencil size={15} /></button>
      {sub.status === 'cancelled' ? (
        <button type="button" className="icon-btn sm" onClick={() => actions.reactivate(sub)} aria-label={`Reactivate ${sub.name}`} title="Reactivate"><RotateCcw size={15} /></button>
      ) : (
        <button type="button" className="icon-btn sm" onClick={() => actions.togglePause(sub)} aria-label={`${sub.status === 'paused' ? 'Resume' : 'Pause'} ${sub.name}`} title={sub.status === 'paused' ? 'Resume' : 'Pause'}>
          {sub.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}
        </button>
      )}
      <button type="button" className="icon-btn sm danger" onClick={() => actions.askDelete(sub)} aria-label={`Delete ${sub.name}`} title="Delete"><Trash2 size={15} /></button>
    </div>
  );
}

export default function SubscriptionCard({ sub, onOpen, onEdit, actions }) {
  const { today, fmt, converter, currency } = useData();
  const st = renewalState(sub, today);
  const shown = sub.currency !== currency && converter.has(sub.currency) ? converter.convert(sub.price, sub.currency) : null;

  return (
    <article className={`sub-tile state-${st.key}`}>
      <div className="sub-tile-top">
        <ServiceIcon name={sub.name} color={sub.color} icon={sub.icon} size={42} />
        <div className="sub-tile-title">
          <button type="button" className="plain-link" onClick={() => onOpen(sub)}>{sub.name}</button>
          <span className="muted small">{sub.category}{sub.isDemo ? ' - Demo' : ''}</span>
        </div>
        <div className="badge-stack">
          <StatusBadge state={st} />
          <UnpaidBadge sub={sub} />
          <PaidBadge sub={sub} />
        </div>
      </div>

      <div className="sub-tile-price">
        <strong>{shown != null ? `\u2248 ${fmt.money(shown, currency)}` : fmt.money(sub.price, sub.currency)}</strong>
        <span className="muted">{cycleText(sub)}</span>
        {shown != null && <span className="muted small">{fmt.money(sub.price, sub.currency)} originally</span>}
      </div>

      <dl className="sub-tile-meta">
        <div><dt>Next renewal</dt><dd>{sub.status === 'cancelled' ? '-' : fmt.date(sub.nextRenewal)}</dd></div>
        <div><dt>Payment</dt><dd>{sub.paymentMethod || '-'}</dd></div>
        <div><dt>Last paid</dt><dd>{(sub.payments || []).length ? fmt.shortDate(sub.payments[sub.payments.length - 1].paidOn) : '-'}</dd></div>
      </dl>

      <QuickActions sub={sub} onOpen={onOpen} onEdit={onEdit} actions={actions} />
    </article>
  );
}
