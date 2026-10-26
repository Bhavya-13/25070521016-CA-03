import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Plus, Search } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useOverlay } from '../hooks/useOverlay.js';
import { NAV_ITEMS } from './layout/nav.js';
import ServiceIcon from './ServiceIcon.jsx';

export default function GlobalSearch({ onClose }) {
  const { subs, fmt } = useData();
  const { openAdd } = useUI();
  const navigate = useNavigate();
  const ref = useRef(null);
  useOverlay(onClose, ref);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = [];

    if (term) {
      const fields = (s) => [s.name, s.category, s.notes, s.paymentMethod, s.overlapGroup, s.cycle];
      const matches = subs.filter((s) => fields(s).some((v) => String(v || '').toLowerCase().includes(term))).slice(0, 8);
      if (matches.length) {
        out.push({
          title: 'Subscriptions',
          items: matches.map((s) => ({
            key: `s-${s._id}`,
            label: s.name,
            hint: `${s.category} - ${fmt.money(s.price, s.currency)} - ${s.status}`,
            leading: <ServiceIcon name={s.name} color={s.color} icon={s.icon} size={30} />,
            run: () => navigate(`/subscriptions/${s._id}`),
          })),
        });
      }
    }

    const pages = NAV_ITEMS.filter((p) => !term || p.label.toLowerCase().includes(term));
    if (pages.length) {
      out.push({
        title: 'Go to',
        items: pages.map((p) => ({
          key: `p-${p.to}`,
          label: p.label,
          hint: p.to,
          leading: <span className="search-icon"><p.icon size={16} /></span>,
          run: () => navigate(p.to),
        })),
      });
    }

    if (!term || 'add subscription new'.includes(term)) {
      out.push({
        title: 'Actions',
        items: [{
          key: 'a-add', label: 'Add subscription', hint: 'Create a new subscription',
          leading: <span className="search-icon"><Plus size={16} /></span>,
          run: () => openAdd(),
        }],
      });
    }
    return out;
  }, [q, subs, fmt, navigate, openAdd]);

  const flat = groups.flatMap((g) => g.items);

  const choose = (item) => {
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && flat[idx]) { e.preventDefault(); choose(flat[idx]); }
  };

  let running = -1;
  return (
    <div className="overlay top" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="palette" role="dialog" aria-modal="true" aria-label="Search" tabIndex={-1}>
        <div className="palette-input">
          <Search size={18} aria-hidden="true" />
          <input
            data-autofocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search subscriptions, categories, notes..."
            aria-label="Search"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-results">
          {q.trim() && !groups.some((g) => g.title === 'Subscriptions') && (
            <p className="palette-none muted">No subscriptions match "{q.trim()}".</p>
          )}
          {groups.map((g) => (
            <div key={g.title} className="palette-group">
              <div className="palette-title">{g.title}</div>
              {g.items.map((item) => {
                running += 1;
                const i = running;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`palette-item ${i === idx ? 'active' : ''}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => choose(item)}
                  >
                    {item.leading}
                    <span className="palette-text">
                      <strong>{item.label}</strong>
                      <span className="muted">{item.hint}</span>
                    </span>
                    {i === idx && <CornerDownLeft size={14} className="muted" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
