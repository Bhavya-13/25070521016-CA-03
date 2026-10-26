import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SubscriptionCard from '../components/SubscriptionCard.jsx';
import SubscriptionForm from '../components/SubscriptionForm.jsx';
import { money, monthlyEquivalent, daysUntil, urgencyLabel } from '../utils/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', sub }

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions');
      setSubs(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const monthly = subs.reduce((total, s) => total + monthlyEquivalent(s), 0);

    const byCategory = {};
    subs.forEach((s) => {
      byCategory[s.category] = (byCategory[s.category] || 0) + monthlyEquivalent(s);
    });
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    const priciest = subs.reduce(
      (best, s) => (!best || monthlyEquivalent(s) > monthlyEquivalent(best) ? s : best),
      null
    );

    const dueSoon = subs.filter((s) => daysUntil(s.nextRenewal) <= 7).length;

    return { monthly, yearly: monthly * 12, categories, priciest, dueSoon, next: subs[0] };
  }, [subs]);

  const handleSave = async (payload) => {
    if (modal.mode === 'edit') {
      await api.put(`/subscriptions/${modal.sub._id}`, payload);
    } else {
      await api.post('/subscriptions', payload);
    }
    setModal(null);
    await load();
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete ${sub.name}?`)) return;
    try {
      await api.delete(`/subscriptions/${sub._id}`);
      setSubs((list) => list.filter((s) => s._id !== sub._id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <p className="muted center pad">Loading your subscriptions...</p>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Hi {user.name.split(' ')[0]}, here is your radar</h1>
          <p className="muted">
            {stats.next
              ? `Next up: ${stats.next.name} - ${urgencyLabel(daysUntil(stats.next.nextRenewal)).toLowerCase()}`
              : 'Nothing is being watched yet.'}
          </p>
        </div>
        <button className="btn primary" onClick={() => setModal({ mode: 'add' })}>
          + Add subscription
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="stats">
        <div className="card stat">
          <span className="muted">Monthly spend</span>
          <strong>{money(stats.monthly)}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Yearly spend</span>
          <strong>{money(stats.yearly)}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Active</span>
          <strong>{subs.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Due in 7 days</span>
          <strong className={stats.dueSoon ? 'warn' : ''}>{stats.dueSoon}</strong>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="card empty">
          <h2>No subscriptions yet</h2>
          <p className="muted">Add your first one and the watchdog will track the renewals.</p>
          <button className="btn primary" onClick={() => setModal({ mode: 'add' })}>
            + Add your first subscription
          </button>
        </div>
      ) : (
        <div className="layout">
          <section>
            <h2 className="section-title">Renewal radar</h2>
            <div className="sub-list">
              {subs.map((sub) => (
                <SubscriptionCard
                  key={sub._id}
                  sub={sub}
                  onEdit={(s) => setModal({ mode: 'edit', sub: s })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>

          <aside>
            <div className="card side-card">
              <h2 className="section-title">Where it goes</h2>
              {stats.categories.map(([name, amount]) => (
                <div className="bar-row" key={name}>
                  <div className="bar-label">
                    <span>{name}</span>
                    <span className="muted">{money(amount)}/mo</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(amount / stats.monthly) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {stats.priciest && (
              <div className="card side-card nudge">
                <h2 className="section-title">Worth a second look</h2>
                <p>
                  <strong>{stats.priciest.name}</strong> is your biggest cost at{' '}
                  <strong>{money(monthlyEquivalent(stats.priciest) * 12)}</strong> a year. Still
                  worth it?
                </p>
              </div>
            )}
          </aside>
        </div>
      )}

      {modal && (
        <SubscriptionForm
          initial={modal.mode === 'edit' ? modal.sub : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
