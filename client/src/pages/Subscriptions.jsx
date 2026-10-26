import { useMemo, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpAZ, CreditCard, LayoutGrid, List, Plus, Search, SearchX } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useSubscriptionActions } from '../hooks/useSubscriptionActions.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Drawer from '../components/ui/Drawer.jsx';
import SubscriptionCard from '../components/SubscriptionCard.jsx';
import SubscriptionTable from '../components/SubscriptionTable.jsx';
import SubscriptionDetails from '../components/SubscriptionDetails.jsx';
import { CATEGORIES, CYCLES } from '../utils/constants.js';
import { monthlyCost, totals } from '../utils/finance.js';
import { diffDays } from '../utils/dates.js';

const CYCLE_ORDER = { weekly: 0, monthly: 1, quarterly: 2, yearly: 3, custom: 4 };

export default function Subscriptions() {
  const match = useMatch('/subscriptions/:id');
  const id = match?.params.id;
  const navigate = useNavigate();
  const { subs, counted, today, fmt, loading } = useData();
  const { openAdd, openEdit } = useUI();
  const { actions, dialog } = useSubscriptionActions({ onDeleted: () => navigate('/subscriptions') });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [billing, setBilling] = useState('all');
  const [sort, setSort] = useState('renewal');
  const [dir, setDir] = useState('asc');
  const [view, setView] = useState(() => localStorage.getItem('subView') || 'grid');

  const changeView = (v) => {
    setView(v);
    localStorage.setItem('subView', v);
  };

  const daysTo = (s) => diffDays(s.nextRenewal, today);
  const counts = useMemo(() => ({
    all: subs.length,
    active: subs.filter((s) => s.status === 'active').length,
    upcoming: subs.filter((s) => s.status === 'active' && daysTo(s) >= 1 && daysTo(s) <= 7).length,
    today: subs.filter((s) => s.status === 'active' && daysTo(s) === 0).length,
    paused: subs.filter((s) => s.status === 'paused').length,
    cancelled: subs.filter((s) => s.status === 'cancelled').length,
  }), [subs, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = subs.filter((s) => {
      if (status === 'active' && s.status !== 'active') return false;
      if (status === 'upcoming' && !(s.status === 'active' && daysTo(s) >= 1 && daysTo(s) <= 7)) return false;
      if (status === 'today' && !(s.status === 'active' && daysTo(s) === 0)) return false;
      if (status === 'paused' && s.status !== 'paused') return false;
      if (status === 'cancelled' && s.status !== 'cancelled') return false;
      if (category !== 'all' && s.category !== category) return false;
      if (billing !== 'all' && s.cycle !== billing) return false;
      if (term) {
        const hay = [s.name, s.category, s.notes, s.paymentMethod, s.overlapGroup].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const mult = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let r = 0;
      if (sort === 'renewal') r = a.nextRenewal.localeCompare(b.nextRenewal);
      else if (sort === 'price') r = monthlyCost(a) - monthlyCost(b);
      else if (sort === 'name') r = a.name.localeCompare(b.name);
      else if (sort === 'category') r = a.category.localeCompare(b.category);
      else if (sort === 'billing') r = CYCLE_ORDER[a.cycle] - CYCLE_ORDER[b.cycle];
      return (r || a.name.localeCompare(b.name)) * mult;
    });
    return list;
  }, [subs, search, status, category, billing, sort, dir, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = totals(counted);
  const filtersActive = search || status !== 'all' || category !== 'all' || billing !== 'all';
  const clearFilters = () => { setSearch(''); setStatus('all'); setCategory('all'); setBilling('all'); };

  const STATUS_CHIPS = [
    ['all', 'All'], ['active', 'Active'], ['upcoming', 'Upcoming'],
    ['today', 'Due today'], ['paused', 'Paused'], ['cancelled', 'Cancelled'],
  ];

  const open = (s) => navigate(`/subscriptions/${s._id}`);
  const selected = id ? subs.find((s) => s._id === id) : null;

  return (
    <div className="stack">
      <PageHeader
        title="Your subscriptions"
        subtitle={loading ? 'Loading...' : `${counts.active} active, ${counts.paused} paused, ${counts.cancelled} cancelled - ${fmt.moneyRound(t.monthly)} a month`}
        actions={<button type="button" className="btn primary" onClick={() => openAdd()}><Plus size={16} /> Add Subscription</button>}
      />

      <div className="toolbar card">
        <label className="search-input">
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, category, notes..." aria-label="Search subscriptions" />
        </label>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="select" value={billing} onChange={(e) => setBilling(e.target.value)} aria-label="Filter by billing frequency">
          <option value="all">All billing</option>
          {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="sort-group">
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            <option value="renewal">Sort: Renewal date</option>
            <option value="price">Sort: Price</option>
            <option value="name">Sort: Name</option>
            <option value="category">Sort: Category</option>
            <option value="billing">Sort: Billing frequency</option>
          </select>
          <button type="button" className="icon-btn" onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))} aria-label={`Sort direction: ${dir === 'asc' ? 'ascending' : 'descending'}`} title="Toggle direction">
            {dir === 'asc' ? <ArrowDownAZ size={17} /> : <ArrowUpAZ size={17} />}
          </button>
        </div>
        <Segmented
          label="View"
          value={view}
          onChange={changeView}
          options={[{ value: 'grid', icon: LayoutGrid, title: 'Card view' }, { value: 'table', icon: List, title: 'Table view' }]}
        />
      </div>

      <div className="chips" role="group" aria-label="Filter by status">
        {STATUS_CHIPS.map(([value, label]) => (
          <button key={value} type="button" className={`chip ${status === value ? 'active' : ''}`} aria-pressed={status === value} onClick={() => setStatus(value)}>
            {label} <span className="chip-count">{counts[value]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sub-grid">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={190} radius={16} />)}</div>
      ) : subs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            text="Add your first subscription to start tracking renewals. You can also load clearly labelled sample data from Settings to explore."
            action={<button type="button" className="btn primary" onClick={() => openAdd()}><Plus size={16} /> Add your first subscription</button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={SearchX}
            title="No subscriptions match"
            text="Try a different search or clear the filters."
            action={filtersActive ? <button type="button" className="btn ghost" onClick={clearFilters}>Clear filters</button> : null}
          />
        </div>
      ) : view === 'grid' ? (
        <div className="sub-grid">
          {filtered.map((s) => <SubscriptionCard key={s._id} sub={s} onOpen={open} onEdit={openEdit} actions={actions} />)}
        </div>
      ) : (
        <SubscriptionTable subs={filtered} onOpen={open} onEdit={openEdit} actions={actions} />
      )}

      {id && selected && <SubscriptionDetails sub={selected} actions={actions} onClose={() => navigate('/subscriptions')} />}
      {id && !selected && !loading && (
        <Drawer title="Subscription not found" onClose={() => navigate('/subscriptions')} size="sm">
          <EmptyState icon={SearchX} title="We could not find that subscription" text="It may have been deleted. Head back to your list to pick another one." />
        </Drawer>
      )}
      {dialog}
    </div>
  );
}
