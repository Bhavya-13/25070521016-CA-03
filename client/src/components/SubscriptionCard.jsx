import { money, daysUntil, prettyDate, urgency, urgencyLabel } from '../utils/format.js';

export default function SubscriptionCard({ sub, onEdit, onDelete }) {
  const days = daysUntil(sub.nextRenewal);
  const level = urgency(days);

  return (
    <div className={`sub-card ${level}`}>
      <div className="avatar" style={{ background: sub.color }}>
        {sub.name.charAt(0).toUpperCase()}
      </div>

      <div className="sub-info">
        <div className="sub-name">{sub.name}</div>
        <div className="sub-meta">
          {sub.category} &middot; {prettyDate(sub.nextRenewal)}
        </div>
      </div>

      <div className="sub-right">
        <div className="sub-price">
          {money(sub.price)}
          <span>/{sub.cycle === 'yearly' ? 'yr' : 'mo'}</span>
        </div>
        <span className={`badge ${level}`}>{urgencyLabel(days)}</span>
      </div>

      <div className="sub-actions">
        <button className="icon-btn" onClick={() => onEdit(sub)}>Edit</button>
        <button className="icon-btn danger" onClick={() => onDelete(sub)}>Delete</button>
      </div>
    </div>
  );
}
