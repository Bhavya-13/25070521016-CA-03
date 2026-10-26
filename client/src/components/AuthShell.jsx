import { BarChart3, BellRing, CalendarDays } from 'lucide-react';

const POINTS = [
  { icon: CalendarDays, title: 'Every renewal, on one calendar', text: 'Know what is about to be charged and when.' },
  { icon: BarChart3, title: 'Clear spending analytics', text: 'See monthly and yearly cost by category and plan.' },
  { icon: BellRing, title: 'Reminders that matter', text: 'Catch renewals and budget limits before they bite.' },
];

export default function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <div className="brand static">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3z" />
              <circle cx="12" cy="11" r="2.4" />
            </svg>
          </span>
          <span className="brand-text">Watchdog</span>
        </div>
        <h2>Your subscriptions, under control.</h2>
        <p className="muted">Track recurring payments, spot waste and stay ahead of every renewal.</p>
        <ul className="auth-points">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="auth-point-icon"><Icon size={18} /></span>
              <span><strong>{title}</strong><span className="muted">{text}</span></span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}
