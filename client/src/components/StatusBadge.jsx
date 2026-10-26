import { useData } from '../context/DataContext.jsx';
import { paidAhead } from '../utils/finance.js';

export default function StatusBadge({ state }) {
  return (
    <span className={`badge ${state.key}`}>
      <span className="badge-dot" aria-hidden="true" />
      {state.label}
    </span>
  );
}

// shown when renewal dates passed without being marked as paid
export function UnpaidBadge({ sub }) {
  const n = sub.status === 'active' ? (sub.pendingDates || []).length : 0;
  if (!n) return null;
  return <span className="badge unpaid"><span className="badge-dot" aria-hidden="true" />{n} unpaid</span>;
}

// shown when the upcoming renewal has already been paid in advance
export function PaidBadge({ sub }) {
  const { today, fmt } = useData();
  const p = sub.status === 'active' ? paidAhead(sub, today) : null;
  if (!p) return null;
  return <span className="badge paid"><span className="badge-dot" aria-hidden="true" />Paid for {fmt.shortDate(p.forDate)}</span>;
}
