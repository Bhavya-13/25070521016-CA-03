import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCheck, Clock, Lightbulb, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import { useClickOutside } from '../hooks/useClickOutside.js';

const KIND_ICON = { due: AlertTriangle, unpaid: AlertTriangle, renewal: Clock, budget: Wallet, insight: Lightbulb };

export default function NotificationCenter() {
  const { notifications, unreadCount, markNotificationsRead } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const openItem = async (n) => {
    setOpen(false);
    navigate(n.link);
    if (!n.read) {
      try { await markNotificationsRead([n.id]); } catch { /* not critical */ }
    }
  };

  const markAll = async () => {
    try {
      await markNotificationsRead(notifications.map((n) => n.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="popover-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn bell"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="popover notif" role="dialog" aria-label="Notifications">
          <div className="popover-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="link-btn" onClick={markAll}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="popover-empty">
              <Bell size={20} />
              <p>You are all caught up.</p>
              <span className="muted small">Reminders, due dates, budget alerts and new insights appear here.</span>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind] || Bell;
                return (
                  <li key={n.id}>
                    <button type="button" className={`notif-item ${n.read ? 'read' : ''}`} onClick={() => openItem(n)}>
                      <span className={`notif-icon sev-${n.severity}`}><Icon size={16} /></span>
                      <span className="notif-text">
                        <strong>{n.title}</strong>
                        <span className="muted">{n.body}</span>
                      </span>
                      {!n.read && <span className="unread-dot" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="popover-foot muted small">In-app notifications only. No email or push messages are sent.</p>
        </div>
      )}
    </div>
  );
}
