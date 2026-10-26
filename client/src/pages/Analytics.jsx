import { useMemo, useState } from 'react';
import { BarChart3, Download, Layers, PieChart, TrendingUp, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import KpiCard from '../components/ui/KpiCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import AreaChart from '../components/charts/AreaChart.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import BarList from '../components/charts/BarList.jsx';
import { addDays, addMonths, isISO } from '../utils/dates.js';
import { categoryBreakdown, cycleBreakdown, monthlyCost, scheduledCharges, totals } from '../utils/finance.js';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/constants.js';
import { downloadText, historyToCSV, subscriptionsToCSV } from '../utils/csv.js';

const RANGES = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];
const CYCLE_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom interval' };
const CYCLE_COLORS = { weekly: '#67D9E8', monthly: '#8B78FF', quarterly: '#34D399', yearly: '#FBBF24', custom: '#FB7185' };

export default function Analytics() {
  const { subs, counted, history, today, fmt, currency, loading } = useData();
  const [range, setRange] = useState('12m');
  const [customFrom, setCustomFrom] = useState(addMonths(today, -6));
  const [customTo, setCustomTo] = useState(today);
  const [category, setCategory] = useState('all');

  const cs = useMemo(() => (category === 'all' ? counted : counted.filter((s) => s.category === category)), [counted, category]);
  const t = useMemo(() => totals(cs), [cs]);
  const cats = useMemo(() => categoryBreakdown(cs), [cs]);
  const cycles = useMemo(() => cycleBreakdown(cs), [cs]);
  const ranked = useMemo(() => [...cs].sort((a, b) => monthlyCost(b) - monthlyCost(a)), [cs]);

  const rangeStart = useMemo(() => {
    switch (range) {
      case '30d': return addDays(today, -30);
      case '90d': return addDays(today, -90);
      case '6m': return addMonths(today, -6);
      case '12m': return addMonths(today, -12);
      default: return isISO(customFrom) ? customFrom : addMonths(today, -12);
    }
  }, [range, today, customFrom]);
  const rangeEnd = range === 'custom' && isISO(customTo) ? customTo : today;

  const recorded = useMemo(
    () => history.filter((h) => h.data?.[currency]),
    [history, currency]
  );
  const value = (h) => (category === 'all' ? h.data[currency].monthly : h.data[currency].categories?.[category] || 0);
  const series = useMemo(
    () => recorded.filter((h) => h.month >= rangeStart.slice(0, 7) && h.month <= rangeEnd.slice(0, 7)),
    [recorded, rangeStart, rangeEnd]
  );
  const areaData = series.map((h) => ({
    label: fmt.monthShortYear(`${h.month}-01`),
    tooltipTitle: fmt.monthYear(`${h.month}-01`),
    value: value(h),
    note: 'Recorded commitment',
  }));

  // change versus the previous recorded month
  let change = null;
  if (recorded.length >= 2) {
    const last = value(recorded[recorded.length - 1]);
    const prev = value(recorded[recorded.length - 2]);
    if (prev > 0) change = ((last - prev) / prev) * 100;
  }

  // renewals per upcoming week
  const weekly = useMemo(() => {
    const charges = scheduledCharges(cs, today, addDays(today, 83));
    return Array.from({ length: 12 }, (_, i) => {
      const start = addDays(today, i * 7);
      const end = addDays(start, 6);
      const items = charges.filter((c) => c.date >= start && c.date <= end);
      return {
        label: fmt.shortDate(start),
        tooltipTitle: `${fmt.shortDate(start)} - ${fmt.shortDate(end)}`,
        segments: [
          { key: 'c', name: 'Scheduled', value: items.filter((c) => !c.estimated).length, color: 'var(--primary)' },
          { key: 'e', name: 'Estimated', value: items.filter((c) => c.estimated).length, color: 'var(--primary)', opacity: 0.4 },
        ],
      };
    });
  }, [cs, today, fmt]);

  // category trend between first and latest recorded month in range
  const trend = useMemo(() => {
    if (series.length < 2) return [];
    const first = series[0].data[currency].categories || {};
    const last = series[series.length - 1].data[currency].categories || {};
    return [...new Set([...Object.keys(first), ...Object.keys(last)])]
      .map((name) => ({ name, from: first[name] || 0, to: last[name] || 0 }))
      .map((r) => ({ ...r, delta: r.to - r.from }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [series, currency]);

  // payments the user confirmed, inside the selected range
  const confirmed = useMemo(() => {
    const out = [];
    for (const s of subs) {
      if (category !== 'all' && s.category !== category) continue;
      for (const p of s.payments || []) {
        if (p.currency !== currency || p.paidOn < rangeStart || p.paidOn > rangeEnd) continue;
        out.push({ sub: s, ...p });
      }
    }
    return out;
  }, [subs, category, currency, rangeStart, rangeEnd]);
  const paidTotal = confirmed.reduce((t, p) => t + p.amount, 0);
  const paidWallet = confirmed.filter((p) => p.source === 'wallet').reduce((t, p) => t + p.amount, 0);
  const paidByMonth = useMemo(() => {
    const m = new Map();
    for (const p of confirmed) {
      const k = p.paidOn.slice(0, 7);
      const cur = m.get(k) || { manual: 0, wallet: 0 };
      cur[p.source === 'wallet' ? 'wallet' : 'manual'] += p.amount;
      m.set(k, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({
      label: fmt.monthShortYear(`${month}-01`),
      tooltipTitle: fmt.monthYear(`${month}-01`),
      segments: [
        { key: 'manual', name: 'Marked manually', value: v.manual, color: 'var(--primary)' },
        { key: 'wallet', name: 'From wallet', value: v.wallet, color: 'var(--cyan)' },
      ],
    }));
  }, [confirmed, fmt]);

  if (loading) {
    return <div className="stack"><Skeleton height={80} /><div className="kpi-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={110} radius={16} />)}</div><Skeleton height={320} radius={16} /></div>;
  }

  const top = cats[0];

  return (
    <div className="stack">
      <PageHeader
        title="Analytics"
        subtitle="Understand where your recurring money goes."
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => downloadText(`watchdog-subscriptions-${today}.csv`, subscriptionsToCSV(cs))} disabled={cs.length === 0}>
              <Download size={16} /> Export subscriptions
            </button>
            <button type="button" className="btn ghost" onClick={() => downloadText(`watchdog-history-${today}.csv`, historyToCSV(recorded, currency))} disabled={recorded.length === 0}>
              <Download size={16} /> Export history
            </button>
          </>
        }
      />

      <div className="toolbar card">
        <select className="select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Time range">
          {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {range === 'custom' && (
          <>
            <label className="inline-field">From <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></label>
            <label className="inline-field">To <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></label>
          </>
        )}
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="muted small toolbar-note">The range applies to the recorded history chart. Other charts show your current plans.</span>
      </div>

      {counted.length === 0 ? (
        <div className="card">
          <EmptyState icon={BarChart3} title="Nothing to analyse yet" text="Add active subscriptions in your display currency and your analytics will appear here." />
        </div>
      ) : (
        <>
          <div className="kpi-grid five">
            <KpiCard icon={Wallet} label="Current monthly spending" value={fmt.moneyRound(t.monthly)} hint="monthly equivalent" />
            <KpiCard icon={TrendingUp} tone="cyan" label="Annualized recurring cost" value={fmt.moneyRound(t.annual)} hint="projection, not spent yet" />
            <KpiCard icon={Layers} tone="success" label="Average per subscription" value={fmt.moneyRound(cs.length ? t.monthly / cs.length : 0)} hint={`across ${cs.length} active`} />
            <KpiCard icon={PieChart} tone="warning" label="Top category" value={top ? top.name : '-'} hint={top ? `${fmt.percent(top.share)} of spend, ${fmt.moneyRound(top.monthly)}/mo` : ''} />
            <KpiCard
              icon={BarChart3}
              tone="danger"
              label="Change vs previous month"
              value={change == null ? 'Not enough data' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
              hint={change == null ? 'needs 2 recorded months' : 'recorded commitment'}
              trend={change == null ? null : { text: change > 0 ? 'Higher' : change < 0 ? 'Lower' : 'Unchanged', good: change <= 0 }}
            />
          </div>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Recurring commitment over time</h2>
                <p className="muted small">Monthly recurring cost as recorded by Watchdog, in {currency}</p>
              </div>
            </div>
            {areaData.length === 0 ? (
              <EmptyState compact icon={TrendingUp} title="No recorded history in this range" text="Watchdog records your recurring commitment each month you use it. Trends build up as that data accumulates." />
            ) : (
              <>
                <AreaChart data={areaData} format={(v) => fmt.money(v)} label="Recurring commitment over time" />
                {areaData.length === 1 && (
                  <p className="muted small">Only one month has been recorded so far. A trend line appears once there are two or more months.</p>
                )}
              </>
            )}
            <p className="muted small">This is the recurring commitment Watchdog saw, not verified spending from a bank account. It is never back-filled.</p>
          </section>

          <div className="grid-2">
            <section className="card">
              <div className="card-head"><h2>Spending by category</h2></div>
              <DonutChart
                label="Spending by category"
                data={cats.map((c) => ({ name: c.name, value: c.monthly, color: CATEGORY_COLORS[c.name] || '#929CB3' }))}
                format={(v) => fmt.moneyRound(v)}
                centerLabel="per month"
                centerValue={fmt.moneyRound(t.monthly)}
              />
            </section>
            <section className="card">
              <div className="card-head"><h2>Billing frequency</h2></div>
              <BarList
                items={cycles.map((c) => ({
                  key: c.cycle,
                  name: CYCLE_LABELS[c.cycle],
                  value: c.monthly,
                  color: CYCLE_COLORS[c.cycle],
                  meta: `/mo (${c.count} ${c.count === 1 ? 'plan' : 'plans'})`,
                }))}
                format={(v) => fmt.moneyRound(v)}
              />
              <p className="muted small">Yearly and quarterly plans are shown as their monthly equivalent.</p>
            </section>
          </div>

          <div className="grid-2">
            <section className="card">
              <div className="card-head"><h2>Cost by subscription</h2></div>
              <BarList
                items={ranked.slice(0, 10).map((s) => ({
                  key: s._id,
                  name: s.name,
                  value: monthlyCost(s),
                  color: s.color,
                  meta: '/mo',
                }))}
                format={(v) => fmt.money(v)}
              />
              {ranked.length > 10 && <p className="muted small">Showing the 10 most expensive of {ranked.length}.</p>}
            </section>
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Renewal frequency</h2>
                  <p className="muted small">Number of charges per week, next 12 weeks</p>
                </div>
              </div>
              <ColumnChart data={weekly} format={(v) => `${v}`} height={220} label="Renewals per week" />
            </section>
          </div>

          <section className="card">
            <div className="card-head"><h2>Category trends</h2></div>
            {trend.length === 0 ? (
              <EmptyState compact icon={TrendingUp} title="Trends need more history" text="Once Watchdog has recorded at least two months, you will see how each category changed here." />
            ) : (
              <div className="table-wrap">
                <table className="table simple">
                  <thead><tr><th scope="col">Category</th><th scope="col">{fmt.monthYear(`${series[0].month}-01`)}</th><th scope="col">{fmt.monthYear(`${series[series.length - 1].month}-01`)}</th><th scope="col">Change</th></tr></thead>
                  <tbody>
                    {trend.map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{fmt.money(r.from)}</td>
                        <td>{fmt.money(r.to)}</td>
                        <td><span className={`trend ${r.delta > 0 ? 'bad' : r.delta < 0 ? 'good' : ''}`}>{r.delta > 0 ? '+' : ''}{fmt.money(r.delta)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Payments you confirmed</h2>
                <p className="muted small">Only payments marked as paid in Watchdog, within the selected range, in {currency}</p>
              </div>
            </div>
            {confirmed.length === 0 ? (
              <EmptyState compact icon={Wallet} title="No confirmed payments in this range" text="Use Mark as paid on a subscription. Watchdog never assumes a charge happened." />
            ) : (
              <>
                <div className="mini-stats">
                  <div><span className="muted small">Total confirmed</span><strong>{fmt.money(paidTotal)}</strong></div>
                  <div><span className="muted small">Payments</span><strong>{confirmed.length}</strong></div>
                  <div><span className="muted small">Paid from wallet</span><strong>{fmt.money(paidWallet)}</strong></div>
                </div>
                <ColumnChart data={paidByMonth} format={(v) => fmt.money(v)} height={220} label="Confirmed payments by month" />
                <div className="legend-inline">
                  <span><i style={{ background: 'var(--primary)' }} />Marked manually</span>
                  <span><i style={{ background: 'var(--cyan)' }} />Paid from wallet</span>
                </div>
              </>
            )}
          </section>

          <section className="card explain">
            <h2>How to read these numbers</h2>
            <ul>
              <li><strong>Recorded history</strong> is the monthly recurring cost Watchdog saw in each month. It is not money confirmed as spent.</li>
              <li><strong>Current commitments</strong> are your active plans converted to a monthly equivalent.</li>
              <li><strong>Annualized</strong> and <strong>estimated future charges</strong> are projections that assume plans continue unchanged.</li>
              <li><strong>Potential savings</strong> only appear in the Savings Planner, as hypothetical scenarios.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
