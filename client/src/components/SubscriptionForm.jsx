import { useState } from 'react';
import { Info } from 'lucide-react';
import Drawer from './ui/Drawer.jsx';
import ServiceIcon, { ICON_MAP } from './ServiceIcon.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import { CATEGORIES, COLOR_SWATCHES, CURRENCIES, CYCLES, ICON_KEYS, PAYMENT_METHODS, PRESETS } from '../utils/constants.js';
import { annualCost, monthlyCost } from '../utils/finance.js';
import { isISO } from '../utils/dates.js';

function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  );
}

export default function SubscriptionForm({ state, onClose }) {
  const { addSub, updateSub, settings, today, fmt, currency, converter } = useData();
  const toast = useToast();
  const editing = state.mode === 'edit';
  const initial = editing ? state.sub : null;
  const preset = state.preset;

  const [f, setF] = useState(() =>
    initial
      ? {
          name: initial.name,
          category: initial.category,
          price: String(initial.price),
          currency: initial.currency,
          cycle: initial.cycle,
          customDays: String(initial.customDays || 30),
          nextRenewal: initial.nextRenewal,
          startDate: initial.startDate || '',
          paymentMethod: initial.paymentMethod || '',
          reminderDays: String(initial.reminderDays ?? 3),
          notes: initial.notes || '',
          color: initial.color,
          icon: initial.icon || '',
          overlapGroup: initial.overlapGroup || '',
          altCycle: initial.altCycle || 'yearly',
          altPrice: initial.altPrice != null ? String(initial.altPrice) : '',
        }
      : {
          name: preset?.name || '',
          category: preset?.category || 'Other',
          price: preset ? String(preset.price) : '',
          currency,
          cycle: preset?.cycle || 'monthly',
          customDays: '30',
          nextRenewal: today,
          startDate: '',
          paymentMethod: '',
          reminderDays: String(settings.notifications.defaultReminderDays),
          notes: '',
          color: preset?.color || '#8B78FF',
          icon: preset?.icon || '',
          overlapGroup: '',
          altCycle: 'yearly',
          altPrice: '',
        }
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }));

  const pickPreset = (p) =>
    setF((cur) => ({
      ...cur, name: p.name, price: String(p.price), cycle: p.cycle, category: p.category, color: p.color, icon: p.icon,
    }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Give the subscription a name';
    const price = Number(f.price);
    if (f.price === '' || !Number.isFinite(price) || price < 0) e.price = 'Enter a price of 0 or more';
    if (f.cycle === 'custom') {
      const d = Number(f.customDays);
      if (!Number.isInteger(d) || d < 1 || d > 730) e.customDays = 'Enter 1 to 730 days';
    }
    if (!isISO(f.nextRenewal)) e.nextRenewal = 'Choose the next billing date';
    if (f.startDate && !isISO(f.startDate)) e.startDate = 'Start date is not valid';
    const r = Number(f.reminderDays);
    if (!Number.isInteger(r) || r < 0 || r > 60) e.reminderDays = 'Use 0 to 60 days';
    if (f.altPrice !== '' && !(Number(f.altPrice) >= 0)) e.altPrice = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: f.name.trim(),
      category: f.category,
      price: Number(f.price),
      currency: f.currency,
      cycle: f.cycle,
      customDays: f.cycle === 'custom' ? Number(f.customDays) : null,
      nextRenewal: f.nextRenewal,
      startDate: f.startDate || null,
      paymentMethod: f.paymentMethod,
      status: initial?.status || 'active',
      reminderDays: Number(f.reminderDays),
      notes: f.notes.trim(),
      color: f.color,
      icon: f.icon,
      overlapGroup: f.overlapGroup.trim(),
      altCycle: f.altPrice !== '' ? f.altCycle : '',
      altPrice: f.altPrice !== '' ? Number(f.altPrice) : '',
    };
    try {
      if (editing) await updateSub(initial._id, payload);
      else await addSub(payload);
      toast.success(editing ? `${payload.name} updated` : `${payload.name} added`);
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
      setSaving(false);
    }
  };

  const previewSub = { price: Number(f.price) || 0, cycle: f.cycle, customDays: Number(f.customDays) || 30 };
  const validPrice = f.price !== '' && Number.isFinite(Number(f.price));

  return (
    <Drawer
      title={editing ? 'Edit subscription' : 'Add subscription'}
      subtitle={editing ? `Update the details for ${initial.name}.` : 'Track a new recurring payment.'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="sub-form" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add subscription'}
          </button>
        </>
      }
    >
      {!editing && (
        <section className="form-section">
          <p className="field-label">Quick add</p>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button type="button" key={p.name} className={`chip ${f.name === p.name ? 'active' : ''}`} onClick={() => pickPreset(p)}>
                <span className="dot" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
          <p className="muted small">Preset prices are typical INR values. Adjust them to match your plan.</p>
        </section>
      )}

      <form id="sub-form" onSubmit={submit} noValidate>
        {serverError && <div className="alert" role="alert">{serverError}</div>}

        <div className="form-grid">
          <Field label="Subscription name" error={errors.name}>
            <input value={f.name} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Netflix" data-autofocus={!editing ? true : undefined} />
          </Field>
          <Field label="Category">
            <select value={f.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Price" error={errors.price}>
            <input type="number" min="0" step="any" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field label="Currency">
            <select value={f.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Billing frequency">
            <select value={f.cycle} onChange={(e) => set('cycle', e.target.value)}>
              {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          {f.cycle === 'custom' ? (
            <Field label="Repeat every (days)" error={errors.customDays}>
              <input type="number" min="1" max="730" value={f.customDays} onChange={(e) => set('customDays', e.target.value)} />
            </Field>
          ) : (
            <Field label="Next billing date" error={errors.nextRenewal}>
              <input type="date" value={f.nextRenewal} onChange={(e) => set('nextRenewal', e.target.value)} />
            </Field>
          )}
          {f.cycle === 'custom' && (
            <Field label="Next billing date" error={errors.nextRenewal}>
              <input type="date" value={f.nextRenewal} onChange={(e) => set('nextRenewal', e.target.value)} />
            </Field>
          )}

          <Field label="Start date (optional)" error={errors.startDate}>
            <input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Payment method (optional)">
            <select value={f.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
              <option value="">Not specified</option>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Remind me (days before)" error={errors.reminderDays} hint="0 reminds you only on the day">
            <input type="number" min="0" max="60" value={f.reminderDays} onChange={(e) => set('reminderDays', e.target.value)} />
          </Field>
          <Field label="Overlap group (optional)" hint="Tag services that do the same job, e.g. Video streaming">
            <input value={f.overlapGroup} maxLength={40} onChange={(e) => set('overlapGroup', e.target.value)} />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea rows={3} maxLength={500} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Plan details, login email, cancellation steps..." />
        </Field>

        <section className="form-section">
          <p className="field-label">Logo and colour</p>
          <div className="icon-picker">
            <button type="button" className={`icon-opt ${f.icon === '' ? 'active' : ''}`} onClick={() => set('icon', '')} aria-label="Use initials" title="Initials">
              <ServiceIcon name={f.name || 'A'} color={f.color} size={34} />
            </button>
            {ICON_KEYS.map((k) => {
              const Icon = ICON_MAP[k];
              return (
                <button type="button" key={k} className={`icon-opt ${f.icon === k ? 'active' : ''}`} onClick={() => set('icon', k)} aria-label={`Use ${k} icon`} title={k}>
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
          <div className="swatches">
            {COLOR_SWATCHES.map((c) => (
              <button type="button" key={c} className={`swatch ${f.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}`} style={{ background: c }} onClick={() => set('color', c)} aria-label={`Use colour ${c}`} />
            ))}
            <input type="color" className="swatch-input" value={f.color} onChange={(e) => set('color', e.target.value)} aria-label="Custom colour" />
          </div>
        </section>

        <details className="form-section advanced">
          <summary>Compare with another plan (optional)</summary>
          <p className="muted small">If you know what a different billing option costs, enter it. Watchdog only compares prices you provide.</p>
          <div className="form-grid">
            <Field label="Alternative price" error={errors.altPrice}>
              <input type="number" min="0" step="any" value={f.altPrice} onChange={(e) => set('altPrice', e.target.value)} />
            </Field>
            <Field label="Alternative billing">
              <select value={f.altCycle} onChange={(e) => set('altCycle', e.target.value)}>
                {CYCLES.filter((c) => c.value !== 'custom').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
        </details>

        <div className="preview" aria-live="polite">
          <div className="preview-head"><Info size={15} /> Live cost preview</div>
          <div className="preview-grid">
            <div><span className="muted small">Monthly equivalent</span><strong>{validPrice ? fmt.money(monthlyCost(previewSub), f.currency) : '-'}</strong></div>
            <div><span className="muted small">Annualized</span><strong>{validPrice ? fmt.money(annualCost(previewSub), f.currency) : '-'}</strong></div>
            <div><span className="muted small">Next charge</span><strong>{isISO(f.nextRenewal) ? fmt.date(f.nextRenewal) : '-'}</strong></div>
          </div>
          {f.currency !== currency && (
            <p className="muted small">{converter.has(f.currency) ? `This uses ${f.currency}. Totals show it converted to ${currency} (approximate, using current exchange rates).` : `This uses ${f.currency}, but no exchange rate to ${currency} is available, so it will be left out of totals.`}</p>
          )}
        </div>
      </form>
    </Drawer>
  );
}
