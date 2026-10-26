import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ServiceIcon from '../components/ServiceIcon.jsx';
import { addDays, addMonths, dayOfWeek, endOfMonth, startOfMonth } from '../utils/dates.js';
import { scheduledCharges, windowTotals } from '../utils/finance.js';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/constants.js';

const mondayIndex = (iso) => (dayOfWeek(iso) + 6) % 7;
const monthGrid = (cursor) => {
  const first = startOfMonth(cursor);
  const gridStart = addDays(first, -mondayIndex(first));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
};

const KIND_LABEL = { confirmed: 'Scheduled', estimated: 'Estimated', paid: 'Paid', unpaid: 'Unpaid' };
const evColor = (e) =>
  e.kind === 'paid' ? 'var(--success)' : e.kind === 'unpaid' ? 'var(--danger)' : CATEGORY_COLORS[e.sub.category] || '#929CB3';

function EventPill({ e, fmt, onOpen }) {
  return (
    <button
      type="button"
      className={`cal-event ${e.kind}`}
      style={{ '--ev': evColor(e) }}
      onClick={(ev) => { ev.stopPropagation(); onOpen(e.sub); }}
      title={`${e.sub.name}, ${fmt.money(e.sub.price, e.sub.currency)} (${KIND_LABEL[e.kind].toLowerCase()})`}
    >
      <span className="cal-event-text">
        <span>{e.sub.name}</span>
        <em>{e.kind === 'paid' ? 'Paid' : fmt.moneyRound(e.sub.price, e.sub.currency)}</em>
      </span>
    </button>
  );
}

function EventRow({ e, fmt, onOpen }) {
  return (
    <button type="button" className="agenda-row" onClick={() => onOpen(e.sub)}>
      <ServiceIcon name={e.sub.name} color={e.sub.color} icon={e.sub.icon} size={34} />
      <span className="agenda-main">
        <strong>{e.sub.name}</strong>
        <span className="muted small">{e.sub.category}</span>
      </span>
      <span className={`tag ${e.kind}`}>{KIND_LABEL[e.kind]}</span>
      <strong>{fmt.money(e.sub.price, e.sub.currency)}</strong>
    </button>
  );
}

export default function CalendarPage() {
  const { subs, counted, today, fmt, loading } = useData();
  const navigate = useNavigate();
  const [view, setView] = useState(() => (window.innerWidth < 700 ? 'agenda' : 'month'));
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [category, setCategory] = useState('all');
  const [kind, setKind] = useState('all');

  const pool = useMemo(
    () => (category === 'all' ? counted : counted.filter((s) => s.category === category)),
    [counted, category]
  );
  const poolAll = useMemo(
    () => (category === 'all' ? subs : subs.filter((s) => s.category === category)),
    [subs, category]
  );

  let days = [];
  let from;
  let to;
  if (view === 'week') {
    const ws = addDays(cursor, -mondayIndex(cursor));
    days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    from = days[0];
    to = days[6];
  } else if (view === 'month') {
    days = monthGrid(cursor);
    from = days[0];
    to = days[41];
  } else {
    from = startOfMonth(cursor);
    to = endOfMonth(cursor);
  }

  // scheduled / estimated charges, plus payments you confirmed and renewals still waiting to be marked
  const build = useCallback(
    (a, b) => {
      const out = scheduledCharges(pool, a, b).map((e) => ({ sub: e.sub, date: e.date, kind: e.estimated ? 'estimated' : 'confirmed' }));
      for (const s of poolAll) {
        for (const p of s.payments || []) {
          if (p.forDate >= a && p.forDate <= b) out.push({ sub: s, date: p.forDate, kind: 'paid' });
        }
        if (s.status === 'active') {
          for (const d of s.pendingDates || []) {
            if (d >= a && d <= b) out.push({ sub: s, date: d, kind: 'unpaid' });
          }
        }
      }
      return out
        .filter((e) => kind === 'all' || e.kind === kind)
        .sort((x, y) => x.date.localeCompare(y.date) || x.sub.name.localeCompare(y.sub.name));
    },
    [pool, poolAll, kind]
  );

  const events = useMemo(() => build(from, to), [build, from, to]);
  const byDate = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [events]);
  const dayEvents = useMemo(() => build(selected, selected), [build, selected]);

  const w7 = useMemo(() => windowTotals(pool, today, 7), [pool, today]);
  const w30 = useMemo(() => windowTotals(pool, today, 30), [pool, today]);
  const w90 = useMemo(() => windowTotals(pool, today, 90), [pool, today]);

  const shift = (n) => {
    if (view === 'week') setCursor((c) => addDays(c, 7 * n));
    else setCursor((c) => addMonths(startOfMonth(c), n));
  };
  const goToday = () => { setCursor(today); setSelected(today); };
  const open = (sub) => navigate(`/subscriptions/${sub._id}`);

  const title = view === 'week' ? `${fmt.shortDate(days[0])} - ${fmt.shortDate(days[6])}` : fmt.monthYear(cursor);
  const weekdayLabels = view === 'agenda' ? [] : days.slice(0, 7).map((d) => fmt.weekdayShort(d));
  const activeMonth = cursor.slice(0, 7);

  if (loading) {
    return <div className="stack"><Skeleton height={60} /><Skeleton height={520} radius={16} /></div>;
  }

  const summaries = [
    { label: 'Next 7 days', w: w7 },
    { label: 'Next 30 days', w: w30 },
    { label: 'Next 90 days', w: w90 },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Renewal calendar"
        subtitle="See every scheduled charge, what you have paid and what is still waiting."
        actions={
          <Segmented
            label="Calendar view"
            value={view}
            onChange={setView}
            options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'agenda', label: 'Agenda' }]}
          />
        }
      />

      <div className="cal-layout">
        <section className="card cal-main">
          <div className="cal-toolbar">
            <div className="cal-nav">
              <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next"><ChevronRight size={18} /></button>
              <h2 className="cal-title">{title}</h2>
            </div>
            <div className="cal-filters">
              <button type="button" className="btn ghost small" onClick={goToday}>Today</button>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by charge type">
                <option value="all">Everything</option>
                <option value="confirmed">Scheduled only</option>
                <option value="estimated">Estimated only</option>
                <option value="paid">Paid only</option>
                <option value="unpaid">Unpaid only</option>
              </select>
            </div>
          </div>

          {counted.length === 0 && (
            <EmptyState compact icon={CalendarDays} title="No active subscriptions" text="Renewals show up here as soon as you add an active subscription." />
          )}

          {view === 'agenda' ? (
            <div className="agenda">
              {Object.keys(byDate).length === 0 ? (
                <p className="muted pad-sm">Nothing in {fmt.monthYear(cursor)} with the current filters.</p>
              ) : (
                Object.keys(byDate).sort().map((d) => (
                  <div key={d} className="agenda-day">
                    <div className={`agenda-date ${d === today ? 'is-today' : ''}`}>
                      <strong>{fmt.weekdayLong(d)}</strong>
                      <span className="muted">{fmt.date(d)}</span>
                    </div>
                    {byDate[d].map((e) => <EventRow key={`${e.sub._id}-${e.date}-${e.kind}`} e={e} fmt={fmt} onOpen={open} />)}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`cal-grid ${view}`} role="grid" aria-label={title}>
              {weekdayLabels.map((w) => <div key={w} className="cal-weekday" role="columnheader">{w}</div>)}
              {days.map((d) => {
                const list = byDate[d] || [];
                const limit = view === 'week' ? 20 : 3;
                const dim = view === 'month' && d.slice(0, 7) !== activeMonth;
                return (
                  <div
                    key={d}
                    role="gridcell"
                    className={`cal-cell ${d === today ? 'is-today' : ''} ${d === selected ? 'is-selected' : ''} ${dim ? 'is-dim' : ''}`}
                    onClick={() => setSelected(d)}
                  >
                    <button type="button" className="cal-date" onClick={() => setSelected(d)} aria-label={`${fmt.date(d)}${list.length ? `, ${list.length} items` : ''}`}>
                      {Number(d.slice(8))}
                      {view === 'week' && <span className="muted"> {fmt.monthShort(d)}</span>}
                    </button>
                    <div className="cal-events">
                      {list.slice(0, limit).map((e) => <EventPill key={`${e.sub._id}-${e.date}-${e.kind}`} e={e} fmt={fmt} onOpen={open} />)}
                      {list.length > limit && <span className="cal-more">+{list.length - limit} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="legend-inline">
            <span><i className="legend-solid" />Scheduled: the next billing date you saved</span>
            <span><i className="legend-dashed" />Estimated: later repeats of the billing cycle</span>
            <span><i className="legend-paid" />Paid: you marked it as paid</span>
            <span><i className="legend-unpaid" />Unpaid: the date passed and it is not marked</span>
          </div>
        </section>

        <aside className="stack">
          <section className="card">
            <div className="card-head"><h2>Upcoming payments</h2></div>
            <ul className="window-list">
              {summaries.map(({ label, w }) => (
                <li key={label}>
                  <div className="window-top">
                    <span>{label}</span>
                    <strong>{fmt.money(w.total)}</strong>
                  </div>
                  <span className="muted small">
                    {w.count === 0 ? 'No charges' : `${fmt.money(w.confirmed)} scheduled (${w.confirmedCount})${w.estimatedCount ? `, ${fmt.money(w.estimated)} estimated (${w.estimatedCount})` : ''}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted small">Counts today through the last day of each period, active subscriptions only.</p>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>{fmt.date(selected)}</h2>
            </div>
            {dayEvents.length === 0 ? (
              <p className="muted">Nothing on this date.</p>
            ) : (
              <div className="agenda-list">
                {dayEvents.map((e) => <EventRow key={`${e.sub._id}-${e.date}-${e.kind}`} e={e} fmt={fmt} onOpen={open} />)}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
