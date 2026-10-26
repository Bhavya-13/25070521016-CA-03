import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, Plus, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import KpiCard from '../components/ui/KpiCard.jsx';
import FxNotice from '../components/FxNotice.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ServiceIcon from '../components/ServiceIcon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { SEVERITY_META } from '../components/insightMeta.js';
import { bucketCharges, categoryBreakdown, totals, windowTotals } from '../utils/finance.js';
import { renewalState } from '../utils/format.js';
import { CATEGORY_COLORS } from '../utils/constants.js';

function DashboardSkeleton() {
  return (
    <div className="stack">
      <Skeleton height={170} radius={20} />
      <div className="kpi-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} radius={16} />)}</div>
      <div className="dash-grid">
        <div className="stack"><Skeleton height={340} radius={16} /><Skeleton height={300} radius={16} /></div>
        <div className="stack"><Skeleton height={300} radius={16} /><Skeleton height={200} radius={16} /></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { subs, counted, today, fmt, loading, history, currency, excludedCount, insights, unpaid } = useData();
  const { openAdd, openPay } = useUI();
  const navigate = useNavigate();
  const [mode, setMode] = useState('month');

  const t = useMemo(() => totals(counted), [counted]);
  const week = useMemo(() => windowTotals(counted, today, 7), [counted, today]);
  const upcoming = useMemo(
    () => [...counted].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal)).slice(0, 6),
    [counted]
  );
  const buckets = useMemo(() => bucketCharges(counted, today, mode), [counted, today, mode]);
  const categories = useMemo(() => categoryBreakdown(counted), [counted]);

  if (loading) return <DashboardSkeleton />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = user.name.split(' ')[0];
  const next = upcoming[0];

  // month-on-month change only when two recorded months exist
  const recorded = history.filter((h) => h.data?.[currency]).slice(-2);
  let trend = null;
  if (recorded.length === 2 && recorded[0].data[currency].monthly > 0) {
    const prev = recorded[0].data[currency].monthly;
    const cur = recorded[1].data[currency].monthly;
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) >= 0.1) trend = { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs last month`, good: pct <= 0 };
  }

  const paused = subs.filter((s) => s.status === 'paused').length;
  const cancelled = subs.filter((s) => s.status === 'cancelled').length;

  const chartData = buckets.map((b, i) => ({
    label: mode === 'month' ? fmt.monthShort(b.start) : mode === 'quarter' ? `${fmt.monthShort(b.start)} - ${fmt.monthShort(b.end)}` : `Year ${i + 1}`,
    tooltipTitle: `${fmt.shortDate(b.start)} - ${fmt.shortDate(b.end)}`,
    note: `${b.count} ${b.count === 1 ? 'charge' : 'charges'}`,
    segments: [
      { key: 'confirmed', name: 'Scheduled', value: b.confirmed, color: 'var(--primary)' },
      { key: 'estimated', name: 'Estimated repeats', value: b.estimated, color: 'var(--primary)', opacity: 0.4 },
    ],
  }));
  const chartTotal = buckets.reduce((s, b) => s + b.confirmed + b.estimated, 0);
  const rangeLabel = mode === 'month' ? 'next 12 months' : mode === 'quarter' ? 'next 4 quarters' : 'next 3 years';

  return (
    <div className="stack">
      <section className="hero card">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-body">
          <span className="hero-eyebrow">{greeting}, {first}</span>
          <h1>Your subscriptions, under control.</h1>
          <p className="muted">
            {counted.length === 0
              ? 'Add your first subscription and Watchdog will keep track of every renewal.'
              : week.count > 0
                ? `${week.count} ${week.count === 1 ? 'renewal' : 'renewals'} in the next 7 days, totalling ${fmt.money(week.total)}.`
                : 'No renewals in the next 7 days. Nothing to worry about this week.'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn primary" onClick={() => openAdd()}>
              <Plus size={16} /> Add Subscription
            </button>
            <Link to="/calendar" className="btn ghost">View calendar</Link>
          </div>
        </div>
        {next && (
          <button type="button" className="hero-next" onClick={() => navigate(`/subscriptions/${next._id}`)}>
            <span className="muted small">Next renewal</span>
            <span className="hero-next-main">
              <ServiceIcon name={next.name} color={next.color} icon={next.icon} size={38} />
              <span>
                <strong>{next.name}</strong>
                <span className="muted small">{fmt.date(next.nextRenewal)}</span>
              </span>
            </span>
            <span className="hero-next-foot">
              <strong>{fmt.money(next.price, next.currency)}</strong>
              <StatusBadge state={renewalState(next, today)} />
            </span>
          </button>
        )}
      </section>

      <FxNotice />

      {excludedCount > 0 && (
        <p className="notice">
          {excludedCount} active {excludedCount === 1 ? 'subscription uses' : 'subscriptions use'} a currency other than {currency}, so
          {excludedCount === 1 ? ' it is' : ' they are'} left out of these totals because no exchange rate is available{excludedCount === 1 ? ' for it' : ' for them'}. Turn on conversion in Settings, or add your own rate.
        </p>
      )}

      {unpaid.length > 0 && (
        <section className="card unpaid-card" aria-labelledby="unpaid-title">
          <div className="card-head">
            <div>
              <h2 id="unpaid-title"><AlertTriangle size={17} aria-hidden="true" /> {unpaid.length} {unpaid.length === 1 ? 'renewal is' : 'renewals are'} waiting for you</h2>
              <p className="muted small">These renewal dates have passed and are not marked as paid or skipped yet.</p>
            </div>
          </div>
          <ul className="unpaid-list">
            {unpaid.slice(0, 4).map(({ sub, date }) => (
              <li key={`${sub._id}-${date}`}>
                <ServiceIcon name={sub.name} color={sub.color} icon={sub.icon} size={36} />
                <span className="unpaid-main">
                  <strong>{sub.name}</strong>
                  <span className="muted small">{fmt.date(date)} - {fmt.money(sub.price, sub.currency)}</span>
                </span>
                <button type="button" className="btn ghost small" onClick={() => navigate(`/subscriptions/${sub._id}`)}>Review</button>
                <button type="button" className="btn primary small" onClick={() => openPay(sub._id, date)}>Mark as paid</button>
              </li>
            ))}
          </ul>
          {unpaid.length > 4 && <Link to="/subscriptions" className="link-btn">View all {unpaid.length} on Subscriptions</Link>}
        </section>
      )}

      <div className="kpi-grid">
        <KpiCard icon={Wallet} label="Monthly spending" value={fmt.moneyRound(t.monthly)} trend={trend} hint="recurring, monthly equivalent" />
        <KpiCard icon={TrendingUp} tone="cyan" label="Projected annual" value={fmt.moneyRound(t.annual)} hint="if every active plan continues" />
        <KpiCard icon={CreditCard} tone="success" label="Active subscriptions" value={counted.length} hint={`${paused} paused, ${cancelled} cancelled`} />
        <KpiCard icon={CalendarClock} tone="warning" label="Renewals within 7 days" value={week.count} hint={week.count ? fmt.money(week.total) + ' scheduled' : 'all clear'} />
      </div>

      <div className="dash-grid">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Upcoming scheduled charges</h2>
                <p className="muted small">{fmt.money(chartTotal)} over the {rangeLabel}</p>
              </div>
              <Segmented
                label="Chart grouping"
                value={mode}
                onChange={setMode}
                options={[{ value: 'month', label: 'Monthly' }, { value: 'quarter', label: 'Quarterly' }, { value: 'year', label: 'Yearly' }]}
              />
            </div>
            {counted.length === 0 ? (
              <EmptyState compact icon={CalendarClock} title="Nothing scheduled yet" text="Charges appear here once you add an active subscription." />
            ) : (
              <>
                <ColumnChart data={chartData} format={(v) => fmt.money(v)} label="Upcoming scheduled charges" />
                <div className="legend-inline">
                  <span><i style={{ background: 'var(--primary)' }} />Scheduled (next billing date you saved)</span>
                  <span><i style={{ background: 'var(--primary)', opacity: 0.4 }} />Estimated (later repeats of the cycle)</span>
                </div>
                <p className="muted small">Projected from your billing schedules. This is not past spending.</p>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Upcoming renewals</h2>
              <Link to="/subscriptions" className="link-btn">View all <ArrowRight size={14} /></Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState compact icon={CreditCard} title="No active subscriptions" text="Add one to see its countdown here." />
            ) : (
              <ul className="renewal-list">
                {upcoming.map((s) => {
                  const st = renewalState(s, today);
                  return (
                    <li key={s._id}>
                      <button type="button" className="renewal-item" onClick={() => navigate(`/subscriptions/${s._id}`)}>
                        <ServiceIcon name={s.name} color={s.color} icon={s.icon} size={38} />
                        <span className="renewal-main">
                          <strong>{s.name}</strong>
                          <span className="muted small">{fmt.date(s.nextRenewal)} - {st.label}</span>
                        </span>
                        <strong className="renewal-price" title={s.converted ? `${fmt.money(s.originalPrice, s.originalCurrency)} originally` : undefined}>{s.converted ? '\u2248 ' : ''}{fmt.money(s.price, s.currency)}</strong>
                        <StatusBadge state={st} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="card">
            <div className="card-head"><h2>Spending by category</h2></div>
            {categories.length === 0 ? (
              <EmptyState compact icon={Wallet} title="No category data" text="Category totals appear once you have active subscriptions." />
            ) : (
              <DonutChart
                label="Monthly spending by category"
                data={categories.map((c) => ({ name: c.name, value: c.monthly, color: CATEGORY_COLORS[c.name] || '#929CB3' }))}
                format={(v) => fmt.moneyRound(v)}
                centerLabel="per month"
                centerValue={fmt.moneyRound(t.monthly)}
              />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Watchdog insights</h2>
              <Link to="/insights" className="link-btn">See all <ArrowRight size={14} /></Link>
            </div>
            {insights.length === 0 ? (
              <p className="muted">No insights right now. As your subscriptions and budget grow, Watchdog will flag anything worth a look.</p>
            ) : (
              <ul className="insight-mini-list">
                {insights.slice(0, 2).map((i) => {
                  const Meta = SEVERITY_META[i.severity];
                  return (
                    <li key={i.key}>
                      <Link to="/insights" className={`insight-mini sev-${i.severity}`}>
                        <span className="insight-mini-icon"><Meta.icon size={16} /></span>
                        <span>
                          <strong>{i.title}</strong>
                          <span className="muted small">{i.impact}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
