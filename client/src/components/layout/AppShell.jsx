import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Wallet, X } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import './topbar.css';
import { useUI } from '../../context/UIContext.jsx';
import { totals } from '../../utils/finance.js';
import { NAV_ITEMS } from './nav.js';
import NotificationCenter from '../NotificationCenter.jsx';
import ProfileMenu from '../ProfileMenu.jsx';
import GlobalSearch from '../GlobalSearch.jsx';
import SubscriptionForm from '../SubscriptionForm.jsx';
import PaymentDialog from '../PaymentDialog.jsx';

function Brand() {
  return (
    <Link to="/dashboard" className="brand" aria-label="Watchdog home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3z" />
          <circle cx="12" cy="11" r="2.4" />
        </svg>
      </span>
      <span className="brand-text">Watchdog</span>
    </Link>
  );
}

function SidebarFooter() {
  const { counted, settings, fmt, currency } = useData();
  const budget = Number(settings.budget?.monthly) || 0;
  const { monthly } = totals(counted);
  const pct = budget ? Math.min(100, (monthly / budget) * 100) : 0;
  const tone = !budget ? 'primary' : monthly > budget ? 'danger' : monthly >= budget * 0.9 ? 'warning' : 'success';

  return (
    <div className="side-foot">
      <div className="side-card">
        <span className="muted small">Monthly commitment ({currency})</span>
        <strong>{fmt.moneyRound(monthly)}</strong>
        {budget > 0 ? (
          <>
            <div className="progress"><div className={`progress-fill tone-${tone}`} style={{ width: `${pct}%` }} /></div>
            <span className="muted small">{fmt.percent(monthly / budget)} of {fmt.moneyRound(budget)} budget</span>
          </>
        ) : (
          <Link to="/savings" className="link-btn small">Set a monthly budget</Link>
        )}
      </div>
    </div>
  );
}

const crumbFor = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  const item = NAV_ITEMS.find((n) => n.to === `/${parts[0]}`);
  return { section: item?.label || 'Overview', detail: parts[1] ? 'Details' : null };
};

export default function AppShell() {
  const loc = useLocation();
  const { form, closeForm, openAdd, pay, closePay, searchOpen, setSearchOpen } = useUI();
  const { error, reload, insights, wallet, fmt, converter, currency } = useData();
  const walletConverted = wallet.currency !== currency && converter.has(wallet.currency);
  const walletText = walletConverted
    ? `\u2248 ${fmt.moneyRound(converter.convert(wallet.balance, wallet.currency), currency)}`
    : fmt.moneyRound(wallet.balance, wallet.currency);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);
  useEffect(() => { localStorage.setItem('sidebar', collapsed ? 'collapsed' : 'open'); }, [collapsed]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  const crumb = crumbFor(loc.pathname);
  const section = loc.pathname.split('/')[1] || 'dashboard';

  return (
    <div className={`app ${collapsed ? 'is-collapsed' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="side-top">
          <Brand />
          <button type="button" className="icon-btn only-mobile" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : undefined}>
              <Icon size={19} aria-hidden="true" />
              <span className="nav-label">{label}</span>
              {to === '/insights' && insights.length > 0 && <span className="nav-count">{insights.length}</span>}
            </NavLink>
          ))}
        </nav>
        <SidebarFooter />
      </aside>
      {mobileOpen && <div className="scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn only-mobile" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="icon-btn only-desktop"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <nav className="crumbs" aria-label="Breadcrumb">
            <span className="muted">Watchdog</span>
            <span className="muted">/</span>
            <span className={crumb.detail ? 'muted' : ''}>{crumb.section}</span>
            {crumb.detail && (<><span className="muted">/</span><span>{crumb.detail}</span></>)}
          </nav>

          <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search size={16} aria-hidden="true" />
            <span className="hide-md">Search subscriptions...</span>
            <kbd className="hide-md">Ctrl K</kbd>
          </button>

          <div className="top-actions">
            <Link to="/wallet" className="wallet-chip hide-sm" aria-label={`Wallet balance ${walletText}`} title={walletConverted ? `${fmt.moneyRound(wallet.balance, wallet.currency)} in your wallet` : undefined}>
              <Wallet size={16} aria-hidden="true" />
              {walletText}
            </Link>
            <NotificationCenter />
            <button type="button" className="btn primary" onClick={() => openAdd()}>
              <Plus size={16} aria-hidden="true" />
              <span className="hide-sm">Add Subscription</span>
            </button>
            <ProfileMenu />
          </div>
        </header>

        <main className="content" id="main">
          {error ? (
            <div className="card error-card">
              <h2>We could not load your data</h2>
              <p className="muted">{error}</p>
              <button type="button" className="btn primary" onClick={reload}>Try again</button>
            </div>
          ) : (
            <div key={section} className="page">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      {form && <SubscriptionForm state={form} onClose={closeForm} />}
      {pay && <PaymentDialog subId={pay.subId} forDate={pay.forDate} source={pay.source} onClose={closePay} />}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
