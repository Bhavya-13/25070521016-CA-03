import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, PiggyBank, RotateCcw, Target } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import FxNotice from '../components/FxNotice.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ServiceIcon from '../components/ServiceIcon.jsx';
import { annualCost, annualFactor, monthlyCost, totals } from '../utils/finance.js';

const toneFor = (used, budget) => (used > budget ? 'danger' : used >= budget * 0.9 ? 'warning' : 'success');

function Progress({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="progress-block">
      <div className="progress lg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
        <div className={`progress-fill tone-${toneFor(value, max)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// monthly cost of a subscription under a what-if choice. Nothing here changes real data.
function scenarioMonthly(sub, choice) {
  if (choice === 'cancel') return 0;
  if (choice === 'switch' && sub.altPrice != null) return (sub.altPrice * annualFactor(sub.altCycle)) / 12;
  return monthlyCost(sub);
}

export default function Savings() {
  const { counted, settings, saveSettings, today, fmt, currency, loading } = useData();
  const toast = useToast();

  const [budgetForm, setBudgetForm] = useState({
    monthly: settings.budget.monthly ?? '',
    annual: settings.budget.annual ?? '',
    target: settings.budget.savingsTarget ?? '',
  });
  const [goalPercent, setGoalPercent] = useState(String(settings.budget.savingsTarget || 15));
  const [choices, setChoices] = useState({}); // { [subId]: 'cancel' | 'switch' }
  const [saving, setSaving] = useState(false);

  const t = useMemo(() => totals(counted), [counted]);
  const ranked = useMemo(() => [...counted].sort((a, b) => monthlyCost(b) - monthlyCost(a)), [counted]);

  const budgetMonthly = Number(settings.budget.monthly) || 0;
  const budgetAnnual = Number(settings.budget.annual) || 0;

  const overlapGroups = useMemo(() => {
    const m = new Map();
    for (const s of counted) {
      const g = (s.overlapGroup || '').trim();
      if (!g) continue;
      const k = g.toLowerCase();
      if (!m.has(k)) m.set(k, { label: g, items: [] });
      m.get(k).items.push(s);
    }
    return [...m.values()].filter((g) => g.items.length >= 2);
  }, [counted]);

  const planSavings = useMemo(
    () =>
      counted
        .filter((s) => s.altPrice != null && s.altCycle)
        .map((s) => ({ sub: s, saving: annualCost(s) - s.altPrice * annualFactor(s.altCycle) }))
        .filter((r) => r.saving > 0.5)
        .sort((a, b) => b.saving - a.saving),
    [counted]
  );

  // what-if totals
  const scenarioMonthlyTotal = counted.reduce((sum, s) => sum + scenarioMonthly(s, choices[s._id]), 0);
  const monthlySaved = t.monthly - scenarioMonthlyTotal;
  const touched = Object.keys(choices).length;

  const setChoice = (id, value) =>
    setChoices((c) => {
      const next = { ...c };
      if (!value) delete next[id];
      else next[id] = value;
      return next;
    });

  const saveBudget = async (e) => {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Number(v));
    const vals = { monthly: num(budgetForm.monthly), annual: num(budgetForm.annual), savingsTarget: num(budgetForm.target) };
    if (Object.values(vals).some((v) => v !== null && !(v >= 0))) {
      toast.error('Budgets must be numbers of 0 or more');
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ budget: vals });
      toast.success('Budget saved');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const startGoal = async () => {
    const p = Number(goalPercent);
    if (!(p >= 1 && p <= 90)) { toast.error('Choose a target between 1% and 90%'); return; }
    try {
      await saveSettings({ goal: { percent: p, baselineMonthly: Math.round(t.monthly * 100) / 100, currency, setAt: today } });
      toast.success('Savings goal started');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const resetGoal = async () => {
    try {
      await saveSettings({ goal: null });
      toast.info('Savings goal cleared');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) {
    return <div className="stack"><Skeleton height={80} /><Skeleton height={260} radius={16} /><Skeleton height={260} radius={16} /></div>;
  }

  const goal = settings.goal && settings.goal.currency === currency ? settings.goal : null;
  let goalView = null;
  if (goal) {
    const target = goal.baselineMonthly * (1 - goal.percent / 100);
    const reduced = goal.baselineMonthly - t.monthly;
    const needed = goal.baselineMonthly - target;
    const pct = needed > 0 ? Math.max(0, Math.min(100, (reduced / needed) * 100)) : 0;
    const gap = Math.max(0, t.monthly - target);
    let acc = 0;
    const example = [];
    for (const s of ranked) {
      if (acc >= gap) break;
      example.push(s);
      acc += monthlyCost(s);
    }
    goalView = { target, reduced, pct, gap, example, reachable: acc >= gap };
  }

  return (
    <div className="stack">
      <PageHeader title="Savings Planner" subtitle="Set a budget, test what-if scenarios and track a savings goal. Nothing here changes your subscriptions." />

      <FxNotice />

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Budget</h2></div>
          <form onSubmit={saveBudget} className="budget-form">
            <label className="field">
              <span className="field-label">Monthly budget ({currency})</span>
              <input type="number" min="0" step="any" value={budgetForm.monthly} onChange={(e) => setBudgetForm({ ...budgetForm, monthly: e.target.value })} placeholder="e.g. 3000" />
            </label>
            <label className="field">
              <span className="field-label">Annual budget (optional)</span>
              <input type="number" min="0" step="any" value={budgetForm.annual} onChange={(e) => setBudgetForm({ ...budgetForm, annual: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Preferred savings target (%)</span>
              <input type="number" min="0" max="90" step="any" value={budgetForm.target} onChange={(e) => setBudgetForm({ ...budgetForm, target: e.target.value })} />
            </label>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save budget'}</button>
          </form>

          <div className="budget-status">
            <div className="budget-line">
              <span>Monthly commitment</span>
              <strong>{fmt.money(t.monthly)}{budgetMonthly > 0 && <span className="muted"> of {fmt.money(budgetMonthly)}</span>}</strong>
            </div>
            {budgetMonthly > 0 ? (
              <>
                <Progress value={t.monthly} max={budgetMonthly} label="Monthly budget used" />
                <p className={`budget-msg tone-${toneFor(t.monthly, budgetMonthly)}`}>
                  {t.monthly > budgetMonthly
                    ? `${fmt.money(t.monthly - budgetMonthly)} over budget`
                    : `${fmt.money(budgetMonthly - t.monthly)} under budget (${fmt.percent(t.monthly / budgetMonthly)} used)`}
                </p>
              </>
            ) : (
              <p className="muted small">Set a monthly budget to see how your commitments compare.</p>
            )}

            <div className="budget-line">
              <span>Projected annual</span>
              <strong>{fmt.money(t.annual)}{budgetAnnual > 0 && <span className="muted"> of {fmt.money(budgetAnnual)}</span>}</strong>
            </div>
            {budgetAnnual > 0 && <Progress value={t.annual} max={budgetAnnual} label="Annual budget used" />}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Savings goal</h2></div>
          {!goal ? (
            <>
              <p className="muted">Pick a percentage to cut from today's monthly total of <strong className="plain">{fmt.money(t.monthly)}</strong>. Watchdog remembers today's total as the baseline and tracks your progress.</p>
              <div className="goal-start">
                <label className="field">
                  <span className="field-label">Reduce recurring spending by (%)</span>
                  <input type="number" min="1" max="90" value={goalPercent} onChange={(e) => setGoalPercent(e.target.value)} />
                </label>
                <button type="button" className="btn primary" onClick={startGoal} disabled={t.monthly <= 0}><Target size={16} /> Start goal</button>
              </div>
              {t.monthly <= 0 && <p className="muted small">Add an active subscription first so there is something to reduce.</p>}
            </>
          ) : (
            <>
              <div className="goal-grid">
                <div><span className="muted small">Baseline ({fmt.date(goal.setAt)})</span><strong>{fmt.money(goal.baselineMonthly)}</strong></div>
                <div><span className="muted small">Target ({goal.percent}% lower)</span><strong>{fmt.money(goalView.target)}</strong></div>
                <div><span className="muted small">Now</span><strong>{fmt.money(t.monthly)}</strong></div>
              </div>
              <Progress value={goalView.pct} max={100} label="Savings goal progress" />
              <p className="goal-msg">
                {goalView.gap <= 0
                  ? 'Goal reached. Your recurring total is at or below the target.'
                  : `${Math.round(goalView.pct)}% of the way there. You still need to cut ${fmt.money(goalView.gap)} a month.`}
              </p>
              {goalView.gap > 0 && goalView.example.length > 0 && (
                <p className="muted small">
                  For example, cancelling {goalView.example.map((s) => s.name).join(' and ')} would free up about {fmt.money(goalView.example.reduce((a, s) => a + monthlyCost(s), 0))} a month.
                  This is only an illustration of the size of the gap, not a recommendation.
                </p>
              )}
              <button type="button" className="btn ghost small" onClick={resetGoal}><RotateCcw size={14} /> Clear goal</button>
            </>
          )}
          {settings.goal && !goal && <p className="muted small">Your saved goal uses {settings.goal.currency}. Switch the display currency back to see it.</p>}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>What-if calculator</h2>
            <p className="muted small">Simulation only. Nothing is cancelled, changed or deleted.</p>
          </div>
          {touched > 0 && <button type="button" className="btn ghost small" onClick={() => setChoices({})}><RotateCcw size={14} /> Reset</button>}
        </div>

        {counted.length === 0 ? (
          <EmptyState compact icon={PiggyBank} title="No active subscriptions" text={`Add active subscriptions in ${currency} to try scenarios.`} />
        ) : (
          <div className="whatif">
            <div className="whatif-table">
              {ranked.map((s) => {
                const choice = choices[s._id] || '';
                const after = scenarioMonthly(s, choice);
                return (
                  <div key={s._id} className={`whatif-row ${choice ? 'changed' : ''}`}>
                    <ServiceIcon name={s.name} color={s.color} icon={s.icon} size={34} />
                    <div className="whatif-name">
                      <Link to={`/subscriptions/${s._id}`} className="plain-link">{s.name}</Link>
                      <span className="muted small">{fmt.money(monthlyCost(s), s.currency)} / month equivalent</span>
                    </div>
                    <select className="select" value={choice} onChange={(e) => setChoice(s._id, e.target.value)} aria-label={`Scenario for ${s.name}`}>
                      <option value="">Keep as is</option>
                      <option value="cancel">Cancel it</option>
                      {s.altPrice != null && <option value="switch">Switch to {s.altCycle} ({fmt.money(s.altPrice, s.currency)})</option>}
                    </select>
                    <strong className="whatif-after">{choice ? fmt.money(after, s.currency) : '-'}</strong>
                  </div>
                );
              })}
            </div>

            <div className="whatif-result">
              <h3>Scenario result</h3>
              <dl>
                <div><dt>Current monthly</dt><dd>{fmt.money(t.monthly)}</dd></div>
                <div><dt>New monthly total</dt><dd>{fmt.money(scenarioMonthlyTotal)}</dd></div>
                <div className="hl"><dt>Monthly savings</dt><dd>{fmt.money(monthlySaved)}</dd></div>
                <div><dt>Current annual</dt><dd>{fmt.money(t.annual)}</dd></div>
                <div><dt>New annual total</dt><dd>{fmt.money(scenarioMonthlyTotal * 12)}</dd></div>
                <div className="hl"><dt>Annualized savings</dt><dd>{fmt.money(monthlySaved * 12)}</dd></div>
              </dl>
              {budgetMonthly > 0 && (
                <p className={`budget-msg tone-${toneFor(scenarioMonthlyTotal, budgetMonthly)}`}>
                  {scenarioMonthlyTotal > budgetMonthly
                    ? `Still ${fmt.money(scenarioMonthlyTotal - budgetMonthly)} over your monthly budget.`
                    : `Within your monthly budget with ${fmt.money(budgetMonthly - scenarioMonthlyTotal)} to spare.`}
                </p>
              )}
              <p className="muted small">Savings are hypothetical. Annualized figures assume the plans continue unchanged for a year.</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-head"><h2>Most expensive</h2></div>
          {ranked.length === 0 ? <p className="muted">No active subscriptions yet.</p> : (
            <ul className="opp-list">
              {ranked.slice(0, 3).map((s) => (
                <li key={s._id}>
                  <Link to={`/subscriptions/${s._id}`} className="plain-link">{s.name}</Link>
                  <span>{fmt.money(annualCost(s), s.currency)} <span className="muted small">/ year</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h2>Overlaps to review</h2></div>
          {overlapGroups.length === 0 ? (
            <p className="muted">No overlap groups. Tag similar services with an overlap group when you add or edit a subscription.</p>
          ) : (
            <ul className="opp-list">
              {overlapGroups.map((g) => (
                <li key={g.label}>
                  <span><strong className="plain">{g.label}</strong><span className="muted small"> {g.items.map((s) => s.name).join(', ')}</span></span>
                  <span>{fmt.money(g.items.reduce((a, s) => a + monthlyCost(s), 0))} <span className="muted small">/ mo</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h2>Billing-plan savings</h2></div>
          {planSavings.length === 0 ? (
            <p className="muted">No verified savings. Enter an alternative plan price on a subscription and Watchdog will compare it.</p>
          ) : (
            <ul className="opp-list">
              {planSavings.map(({ sub, saving }) => (
                <li key={sub._id}>
                  <span><Link to={`/subscriptions/${sub._id}`} className="plain-link">{sub.name}</Link><span className="muted small"> to {sub.altCycle}</span></span>
                  <span className="tone-success-text">{fmt.money(saving, sub.currency)} <span className="muted small">/ year</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
