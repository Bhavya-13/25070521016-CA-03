import { useState } from 'react';
import { errorMessage } from '../api.js';
import { PRESETS, CATEGORIES } from '../data/presets.js';
import { toInputDate } from '../utils/format.js';

export default function SubscriptionForm({ initial, onClose, onSave }) {
  const editing = Boolean(initial);

  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          price: initial.price,
          cycle: initial.cycle,
          category: initial.category,
          color: initial.color,
          nextRenewal: toInputDate(initial.nextRenewal),
        }
      : {
          name: '',
          price: '',
          cycle: 'monthly',
          category: 'Other',
          color: '#6c8cff',
          nextRenewal: toInputDate(new Date()),
        }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const pickPreset = (p) =>
    setForm((f) => ({
      ...f,
      name: p.name,
      price: p.price,
      cycle: p.cycle,
      category: p.category,
      color: p.color,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({ ...form, price: Number(form.price) });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{editing ? 'Edit subscription' : 'Add subscription'}</h2>
          <button className="icon-btn" onClick={onClose} type="button">Close</button>
        </div>

        {!editing && (
          <>
            <p className="muted small-text">Quick add (prices are typical, you can edit them)</p>
            <div className="presets">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  className={`preset ${form.name === p.name ? 'active' : ''}`}
                  onClick={() => pickPreset(p)}
                >
                  <span className="dot" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        <form onSubmit={submit}>
          {error && <div className="alert">{error}</div>}

          <label>
            Name
            <input
              required
              maxLength={60}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Netflix"
            />
          </label>

          <div className="row">
            <label>
              Price (INR)
              <input
                required
                type="number"
                min="0"
                step="any"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </label>
            <label>
              Billing cycle
              <select value={form.cycle} onChange={(e) => set('cycle', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>

          <div className="row">
            <label>
              Category
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Next renewal
              <input
                required
                type="date"
                value={form.nextRenewal}
                onChange={(e) => set('nextRenewal', e.target.value)}
              />
            </label>
          </div>

          <label>
            Colour
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              className="color-input"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Add subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
