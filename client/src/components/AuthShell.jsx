import { useId, useState } from 'react';
import { BarChart3, BellRing, CalendarDays, Eye, EyeOff, Moon, ShieldCheck, Sun } from 'lucide-react';
import ServiceIcon from './ServiceIcon.jsx';
import { applyTheme } from '../utils/theme.js';
import './auth.css';

const POINTS = [
  { icon: CalendarDays, title: 'Every renewal on one calendar', text: 'See what is about to be charged, and when.' },
  { icon: BarChart3, title: 'Spending you can understand', text: 'Monthly and yearly cost by category and plan.' },
  { icon: BellRing, title: 'Reminders that matter', text: 'Catch renewals and unpaid dates before they slip.' },
];

// Illustrative only: these rows are not real data.
const SAMPLE = [
  { name: 'Netflix', color: '#E50914', icon: 'Film', when: 'In 3 days', price: '649', tone: 'soon' },
  { name: 'Spotify', color: '#1DB954', icon: 'Music', when: 'Tomorrow', price: '119', tone: 'soon' },
  { name: 'iCloud+', color: '#4F9CFF', icon: 'Cloud', when: 'In 17 days', price: '75', tone: 'ok' },
];

function Logo() {
  return (
    <span className="au-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3z" />
        <circle cx="12" cy="11" r="2.4" />
      </svg>
    </span>
  );
}

export function AuthField({ label, icon: Icon, type = 'text', value, onChange, autoComplete, required = true, minLength, maxLength, hint }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="au-field">
      <label className="au-label" htmlFor={id}>{label}</label>
      <div className="au-input">
        <Icon size={17} className="au-lead" aria-hidden="true" />
        <input
          id={id}
          className="au-control"
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
        />
        {isPassword && (
          <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {hint}
    </div>
  );
}

export default function AuthShell({ children }) {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="au-page">
      <aside className="au-hero">
        <div className="au-brand">
          <Logo />
          <span>Watchdog</span>
        </div>

        <div className="au-hero-body">
          <h2 className="au-title">Your subscriptions, <span>under control.</span></h2>
          <p className="au-sub">Track recurring payments, spot waste and stay ahead of every renewal.</p>

          <div className="au-preview" aria-hidden="true">
            <div className="au-preview-head">
              <strong>Upcoming renewals</strong>
              <span className="au-sample">Sample preview</span>
            </div>
            {SAMPLE.map((s) => (
              <div className="au-row" key={s.name}>
                <ServiceIcon name={s.name} color={s.color} icon={s.icon} size={34} />
                <span className="au-row-main">
                  <strong>{s.name}</strong>
                  <span className={`au-when ${s.tone}`}>{s.when}</span>
                </span>
                <strong>{`\u20B9${s.price}`}</strong>
              </div>
            ))}
            <div className="au-bars">
              {[34, 52, 40, 68, 46, 78, 58].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
            </div>
          </div>

          <ul className="au-points">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="au-point-icon"><Icon size={17} /></span>
                <span><strong>{title}</strong><span>{text}</span></span>
              </li>
            ))}
          </ul>
        </div>

        <p className="au-foot"><ShieldCheck size={15} aria-hidden="true" /> Watchdog never asks for your bank details.</p>
      </aside>

      <main className="au-main">
        <button type="button" className="icon-btn au-theme" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="au-card">{children}</div>
      </main>
    </div>
  );
}
