import { Link } from 'react-router-dom';
import { ArrowRight, BellOff, Check, RotateCcw, X } from 'lucide-react';
import { SEVERITY_META } from './insightMeta.js';
import { INSIGHT_TYPES } from '../utils/insights.js';
import { useData } from '../context/DataContext.jsx';

export default function InsightCard({ insight, onDismiss, onSnooze, onResolve, onRestore, archived }) {
  const { subs, fmt } = useData();
  const meta = SEVERITY_META[insight.severity];
  const Icon = meta.icon;
  const linked = (insight.subIds || []).map((id) => subs.find((s) => s._id === id)).filter(Boolean);

  const stateText = archived
    ? insight.state.status === 'snoozed'
      ? `Snoozed until ${fmt.date(insight.state.until)}`
      : insight.state.status === 'resolved' ? 'Marked as resolved' : 'Dismissed'
    : null;

  return (
    <article className={`insight card sev-${insight.severity} ${archived ? 'is-archived' : ''}`}>
      <div className="insight-icon"><Icon size={20} /></div>
      <div className="insight-body">
        <div className="insight-tags">
          <span className={`tag sev-${insight.severity}`}>{meta.label}</span>
          <span className="tag plain">{INSIGHT_TYPES[insight.type]}</span>
          <span className="tag plain">Automated rule</span>
        </div>
        <h3>{insight.title}</h3>
        <p className="muted">{insight.body}</p>
        <p className="insight-impact"><strong>Impact:</strong> {insight.impact}</p>
        <p className="insight-action"><strong>Suggested next step:</strong> {insight.action}</p>

        <div className="insight-links">
          {linked.slice(0, 4).map((s) => (
            <Link key={s._id} to={`/subscriptions/${s._id}`} className="chip small">{s.name} <ArrowRight size={12} /></Link>
          ))}
          {linked.length === 0 && insight.link && (
            <Link to={insight.link} className="chip small">Open <ArrowRight size={12} /></Link>
          )}
        </div>

        {archived ? (
          <div className="insight-actions">
            <span className="muted small">{stateText}</span>
            <button type="button" className="btn ghost small" onClick={() => onRestore(insight.key)}><RotateCcw size={14} /> Restore</button>
          </div>
        ) : (
          <div className="insight-actions">
            <button type="button" className="btn ghost small" onClick={() => onSnooze(insight.key)}><BellOff size={14} /> Snooze 7 days</button>
            <button type="button" className="btn ghost small" onClick={() => onResolve(insight.key)}><Check size={14} /> Mark resolved</button>
            <button type="button" className="btn ghost small" onClick={() => onDismiss(insight.key)}><X size={14} /> Dismiss</button>
          </div>
        )}
      </div>
    </article>
  );
}
