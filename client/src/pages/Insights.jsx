import { useMemo, useState } from 'react';
import { Lightbulb, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import InsightCard from '../components/InsightCard.jsx';
import { INSIGHT_TYPES } from '../utils/insights.js';

export default function Insights() {
  const { insights, archivedInsights, setInsightState, restoreInsight, loading, counted } = useData();
  const toast = useToast();
  const [type, setType] = useState('all');
  const [showArchive, setShowArchive] = useState(false);

  const present = useMemo(() => [...new Set(insights.map((i) => i.type))], [insights]);
  const list = type === 'all' ? insights : insights.filter((i) => i.type === type);

  const run = async (fn, message) => {
    try {
      await fn();
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const critical = insights.filter((i) => i.severity === 'critical' || i.severity === 'warning').length;

  if (loading) {
    return <div className="stack"><Skeleton height={80} /><Skeleton height={180} radius={16} /><Skeleton height={180} radius={16} /></div>;
  }

  return (
    <div className="stack">
      <PageHeader
        title="Watchdog Intelligence"
        subtitle={insights.length ? `${insights.length} ${insights.length === 1 ? 'insight' : 'insights'}, ${critical} needing attention` : 'Recommendations based on your subscriptions'}
      />

      <p className="notice">
        <ShieldCheck size={16} aria-hidden="true" /> These are automated, rule-based insights worked out from your own subscriptions, budget and recorded prices.
        Watchdog does not read your bank, email or usage, so it never claims guaranteed savings.
      </p>

      {insights.length > 0 && (
        <div className="chips" role="group" aria-label="Filter insights by type">
          <button type="button" className={`chip ${type === 'all' ? 'active' : ''}`} onClick={() => setType('all')}>All <span className="chip-count">{insights.length}</span></button>
          {present.map((t) => (
            <button key={t} type="button" className={`chip ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
              {INSIGHT_TYPES[t]} <span className="chip-count">{insights.filter((i) => i.type === t).length}</span>
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Lightbulb}
            title={archivedInsights.length ? 'Nothing needs your attention' : 'No insights yet'}
            text={
              counted.length < 3
                ? 'Add at least three active subscriptions and Watchdog can start spotting costly services and busy renewal weeks. Set a monthly budget in the Savings Planner for budget warnings.'
                : 'Everything looks fine right now. New insights appear when renewals cluster, prices change, or you go over budget.'
            }
          />
        </div>
      ) : (
        <div className="insight-list">
          {list.map((i) => (
            <InsightCard
              key={i.key}
              insight={i}
              onDismiss={(k) => run(() => setInsightState(k, 'dismissed'), 'Insight dismissed')}
              onResolve={(k) => run(() => setInsightState(k, 'resolved'), 'Marked as resolved')}
              onSnooze={(k) => run(() => setInsightState(k, 'snoozed', 7), 'Snoozed for 7 days')}
            />
          ))}
        </div>
      )}

      {archivedInsights.length > 0 && (
        <section className="stack">
          <button type="button" className="link-btn start" onClick={() => setShowArchive((s) => !s)} aria-expanded={showArchive}>
            {showArchive ? 'Hide' : 'Show'} dismissed, snoozed and resolved ({archivedInsights.length})
          </button>
          {showArchive && (
            <div className="insight-list">
              {archivedInsights.map((i) => (
                <InsightCard key={i.key} insight={i} archived onRestore={(k) => run(() => restoreInsight(k), 'Insight restored')} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
