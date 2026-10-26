import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Database, Download, Globe, LogOut, Monitor, Moon, Palette, Shield, Sun, Trash2, Upload, User } from 'lucide-react';
import api, { errorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Switch from '../components/ui/Switch.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { CURRENCIES, DATE_FORMATS, LOCALES } from '../utils/constants.js';
import { downloadText, historyToCSV, parseSubscriptionCSV, subscriptionsToCSV } from '../utils/csv.js';
import { initials } from '../utils/format.js';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'locale', label: 'Currency and locale', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data management', icon: Database },
  { id: 'security', label: 'Security and account', icon: Shield },
];

const zones = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney']; }
})();

export default function Settings() {
  const [tab, setTab] = useState('profile');
  return (
    <div className="stack">
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and data." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`settings-tab ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
        <div className="settings-panel">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'locale' && <LocaleTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function useSave() {
  const { saveSettings } = useData();
  const toast = useToast();
  return async (patch, message = 'Saved') => {
    try {
      await saveSettings(patch);
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
}

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/auth/profile', { name });
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>Profile</h2>
      <div className="profile-card">
        <span className="avatar xl">{initials(user.name)}</span>
        <div>
          <strong>{user.name}</strong>
          <span className="muted">{user.email}</span>
        </div>
      </div>
      <form onSubmit={submit} className="settings-form">
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input value={user.email} readOnly aria-readonly="true" />
          <span className="field-hint">Email cannot be changed in this version.</span>
        </label>
        <button type="submit" className="btn primary" disabled={busy || name.trim() === user.name}>{busy ? 'Saving...' : 'Save profile'}</button>
      </form>
    </section>
  );
}

function AppearanceTab() {
  const { settings } = useData();
  const save = useSave();
  const options = [
    { value: 'dark', label: 'Dark', icon: Moon, text: 'The default Watchdog look' },
    { value: 'light', label: 'Light', icon: Sun, text: 'Bright and high contrast' },
    { value: 'system', label: 'System', icon: Monitor, text: 'Match your device when the app loads' },
  ];
  return (
    <section className="card">
      <h2>Appearance</h2>
      <div className="theme-options" role="radiogroup" aria-label="Theme">
        {options.map(({ value, label, icon: Icon, text }) => (
          <button key={value} type="button" role="radio" aria-checked={settings.theme === value} className={`theme-opt ${settings.theme === value ? 'active' : ''}`} onClick={() => save({ theme: value }, `${label} theme applied`)}>
            <Icon size={22} aria-hidden="true" />
            <strong>{label}</strong>
            <span className="muted small">{text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LocaleTab() {
  const { settings, fmt, today } = useData();
  const save = useSave();
  return (
    <section className="card">
      <h2>Currency and locale</h2>
      <div className="settings-form two">
        <label className="field">
          <span className="field-label">Default currency</span>
          <select value={settings.currency} onChange={(e) => save({ currency: e.target.value }, 'Currency updated')}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Number and language format</span>
          <select value={settings.locale} onChange={(e) => save({ locale: e.target.value }, 'Locale updated')}>
            {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Date format</span>
          <select value={settings.dateFormat} onChange={(e) => save({ dateFormat: e.target.value }, 'Date format updated')}>
            {DATE_FORMATS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Time zone</span>
          <select value={settings.timezone} onChange={(e) => save({ timezone: e.target.value }, 'Time zone updated')}>
            <option value="auto">Device time zone (automatic)</option>
            {zones.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
      </div>
      <div className="preview">
        <div className="preview-head">Preview</div>
        <div className="preview-grid">
          <div><span className="muted small">Amount</span><strong>{fmt.money(1234567.5)}</strong></div>
          <div><span className="muted small">Today</span><strong>{fmt.date(today)}</strong></div>
        </div>
      </div>
      <p className="notice">
        Changing the currency changes how amounts are formatted and which subscriptions are added up. It never converts money,
        because Watchdog does not use exchange rates. Subscriptions saved in another currency keep their own currency and are left out of totals.
      </p>
    </section>
  );
}

function NotificationsTab() {
  const { settings } = useData();
  const save = useSave();
  const n = settings.notifications;
  const [days, setDays] = useState(String(n.defaultReminderDays));
  return (
    <section className="card">
      <h2>Notifications</h2>
      <Switch id="n-renew" checked={n.renewals} onChange={(v) => save({ notifications: { renewals: v } })} label="Upcoming renewal reminders" description="Show a notification before a subscription renews." />
      <Switch id="n-due" checked={n.dueToday} onChange={(v) => save({ notifications: { dueToday: v } })} label="Due-today notifications" description="Notify me on the day a subscription renews." />
      <Switch id="n-budget" checked={n.budget} onChange={(v) => save({ notifications: { budget: v } })} label="Budget warnings" description="Alert me when recurring costs approach or pass my monthly budget." />
      <Switch id="n-insight" checked={n.insights} onChange={(v) => save({ notifications: { insights: v } })} label="Insight notifications" description="Notify me about important Watchdog insights." />
      <div className="settings-form">
        <label className="field">
          <span className="field-label">Default reminder timing (days before renewal)</span>
          <input type="number" min="0" max="60" value={days} onChange={(e) => setDays(e.target.value)} onBlur={() => {
            const v = Math.round(Number(days));
            if (Number.isFinite(v) && v >= 0 && v <= 60 && v !== n.defaultReminderDays) save({ notifications: { defaultReminderDays: v } });
          }} />
          <span className="field-hint">New subscriptions start with this value. Each subscription can override it.</span>
        </label>
      </div>
      <p className="notice">Notifications appear inside Watchdog only. Email and push delivery are not implemented, so no messages leave the app.</p>
    </section>
  );
}

function DataTab() {
  const { subs, history, currency, today, importRows, loadDemo, clearDemo, resetAll } = useData();
  const toast = useToast();
  const [parsed, setParsed] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'reset' | 'demo'
  const demoCount = useMemo(() => subs.filter((s) => s.isDemo).length, [subs]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1_000_000) { toast.error('That file is larger than 1 MB.'); return; }
    const res = parseSubscriptionCSV(await file.text());
    setParsed({ ...res, fileName: file.name });
    setResult(null);
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const r = await importRows(parsed.rows);
      setResult(r);
      setParsed(null);
      toast.success(`${r.created} imported, ${r.skipped.length} skipped, ${r.invalid.length} invalid`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const template = () =>
    downloadText('watchdog-import-template.csv',
      'name,category,price,currency,cycle,custom_days,next_renewal,start_date,payment_method,status,reminder_days,overlap_group,notes\r\n' +
      `Example Service,Entertainment,499,INR,monthly,,${today},,UPI,active,3,,Replace me\r\n`);

  const guard = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Export</h2>
        <p className="muted">Download your data as CSV files you can open in any spreadsheet.</p>
        <div className="button-row">
          <button type="button" className="btn ghost" disabled={subs.length === 0} onClick={() => downloadText(`watchdog-subscriptions-${today}.csv`, subscriptionsToCSV(subs))}>
            <Download size={16} /> Export subscriptions
          </button>
          <button type="button" className="btn ghost" disabled={!history.some((h) => h.data?.[currency])} onClick={() => downloadText(`watchdog-history-${today}.csv`, historyToCSV(history, currency))}>
            <Download size={16} /> Export recorded history
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Import</h2>
        <p className="muted">
          Upload a CSV with at least the columns <code>name</code>, <code>price</code> and <code>next_renewal</code> (YYYY-MM-DD).
          Rows that match an existing subscription (same name and billing frequency) are skipped, and invalid rows are listed so you can fix them.
        </p>
        <div className="button-row">
          <label className="btn ghost file-btn">
            <Upload size={16} /> Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
          <button type="button" className="btn ghost" onClick={template}><Download size={16} /> Download template</button>
        </div>

        {parsed && (
          <div className="import-summary">
            <strong>{parsed.fileName}</strong>
            {parsed.errors.length > 0 ? (
              <p className="alert" role="alert">{parsed.errors.join(' ')}</p>
            ) : (
              <>
                <p className="muted">{parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} found. Final validation happens when you import.</p>
                <button type="button" className="btn primary" disabled={busy} onClick={doImport}>{busy ? 'Importing...' : `Import ${parsed.rows.length} rows`}</button>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="import-summary">
            <strong>Import finished</strong>
            <p className="muted">{result.created} added, {result.skipped.length} skipped as duplicates, {result.invalid.length} invalid.</p>
            {result.skipped.length > 0 && <ul className="issue-list">{result.skipped.slice(0, 8).map((s) => <li key={`s${s.row}`}>Row {s.row}: {s.name} - {s.message}</li>)}</ul>}
            {result.invalid.length > 0 && <ul className="issue-list bad">{result.invalid.slice(0, 8).map((s) => <li key={`i${s.row}`}>Row {s.row}{s.name ? ` (${s.name})` : ''}: {s.message}</li>)}</ul>}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Sample data</h2>
        <p className="muted">Load ten clearly labelled demo subscriptions to explore Watchdog. They are marked "Demo" and can be removed at any time without touching your own records.</p>
        <div className="button-row">
          <button type="button" className="btn ghost" disabled={busy || demoCount > 0} onClick={() => guard(loadDemo, 'Demo data loaded')}>Load demo data</button>
          <button type="button" className="btn ghost" disabled={busy || demoCount === 0} onClick={() => setConfirm('demo')}>Clear demo data ({demoCount})</button>
        </div>
      </section>

      <section className="card danger-zone">
        <h2>Reset workspace</h2>
        <p className="muted">Permanently deletes every subscription in your account, including price history. Your login and settings stay. Recorded monthly history is kept.</p>
        <button type="button" className="btn danger" disabled={subs.length === 0} onClick={() => setConfirm('reset')}><Trash2 size={16} /> Delete all subscriptions</button>
      </section>

      {confirm === 'demo' && (
        <ConfirmDialog title="Clear demo data?" message="This removes only the records marked as demo data." confirmLabel="Clear demo data" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => guard(clearDemo, 'Demo data cleared')} />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog danger title="Delete every subscription?" message={`This permanently deletes all ${subs.length} subscriptions in your account. This cannot be undone.`} confirmLabel="Delete everything" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => guard(resetAll, 'Workspace reset')} />
      )}
    </div>
  );
}

function SecurityTab() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) { toast.error('The new passwords do not match'); return; }
    setBusy(true);
    try {
      await api.put('/auth/password', { currentPassword: form.current, newPassword: form.next });
      toast.success('Password updated');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Change password</h2>
        <form onSubmit={submit} className="settings-form">
          <label className="field">
            <span className="field-label">Current password</span>
            <input type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">New password (min 6 characters)</span>
            <input type="password" autoComplete="new-password" required minLength={6} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Confirm new password</span>
            <input type="password" autoComplete="new-password" required minLength={6} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
        </form>
      </section>
      <section className="card">
        <h2>Session</h2>
        <p className="muted">Signed in as {user.email}. Sessions last 7 days.</p>
        <button type="button" className="btn ghost" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Sign out</button>
        <p className="muted small">Two-factor authentication, email changes and account deletion are not available in this version.</p>
      </section>
    </div>
  );
}
