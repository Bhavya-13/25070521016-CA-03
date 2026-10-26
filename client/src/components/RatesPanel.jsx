import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import Switch from './ui/Switch.jsx';
import './fx.css';

export default function RatesPanel() {
  const { settings, fx, currency, subs, converter, saveSettings, refreshRates, fmt } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({});

  const used = useMemo(
    () => [...new Set(subs.map((s) => s.currency))].filter((c) => c !== currency).sort(),
    [subs, currency]
  );
  const nf = useMemo(() => new Intl.NumberFormat(settings.locale || undefined, { maximumSignificantDigits: 5 }), [settings.locale]);

  const save = async (patch, message) => {
    try {
      await saveSettings(patch);
      if (message) toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      await refreshRates();
      toast.success('Exchange rates checked');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // The user types "1 INR = v USD". Rates are stored per 1 USD, so rate[cur] = rate[display] / v.
  const saveCustom = (cur) => {
    const v = Number(draft[cur]);
    const base = converter.table[currency];
    if (!(v > 0)) { toast.error('Enter a rate above 0'); return; }
    if (!(base > 0)) { toast.error(`No rate for ${currency} is available yet`); return; }
    save({ fxManual: { [cur]: base / v } }, `Your rate for ${cur} is saved`);
    setDraft((d) => { const n = { ...d }; delete n[cur]; return n; });
  };

  const shown = (cur) => (draft[cur] !== undefined ? draft[cur] : converter.has(cur) ? String(Number(converter.rate(cur, currency).toPrecision(5))) : '');

  return (
    <div className="fx-panel">
      <h3>Exchange rates</h3>
      <Switch
        id="fx-convert"
        checked={settings.convert !== false}
        onChange={(v) => save({ convert: v })}
        label="Convert other currencies"
        description={`Show subscriptions saved in other currencies converted to ${currency} in totals, charts and insights. Saved prices are never changed. Turn this off to leave them out of totals instead.`}
      />

      <div className={`fx-status ${fx?.stale || !fx ? 'warn' : ''}`}>
        <span>
          {fx
            ? `Live rates as of ${fmt.date(fx.asOf)}${fx.stale ? ' (could not refresh, using the last saved rates)' : ''}`
            : 'Live rates are not available right now. You can still enter your own below.'}
        </span>
        <button type="button" className="btn ghost small" onClick={refresh} disabled={busy}>
          <RefreshCw size={14} aria-hidden="true" /> {busy ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {used.length === 0 ? (
        <p className="muted small">All your subscriptions are in {currency}, so no conversion is needed. Rates will appear here when you add one in another currency.</p>
      ) : (
        <table className="fx-table">
          <thead>
            <tr><th scope="col">Currency</th><th scope="col">Rate used</th><th scope="col">Source</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {used.map((cur) => (
              <tr key={cur}>
                <td><strong>1 {cur}</strong></td>
                <td>
                  <div className="fx-rate">
                    <span>=</span>
                    <input
                      type="number" min="0" step="any" aria-label={`1 ${cur} in ${currency}`}
                      value={shown(cur)} placeholder="no rate"
                      onChange={(e) => setDraft((d) => ({ ...d, [cur]: e.target.value }))}
                    />
                    <span>{currency}</span>
                  </div>
                </td>
                <td>{converter.isManual(cur) ? <span className="tag plain">Yours</span> : <span className="muted small">{fx ? 'Live' : '-'}</span>}</td>
                <td>
                  <div className="fx-actions">
                    {draft[cur] !== undefined && <button type="button" className="btn primary small" onClick={() => saveCustom(cur)}>Use my rate</button>}
                    {converter.isManual(cur) && <button type="button" className="btn ghost small" onClick={() => save({ fxManual: { [cur]: null } }, `${cur} is back on live rates`)}>Back to live</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">
        Live rates by <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>, updated about once a day. They are indicative and can differ from the rate your bank or card charges.
        Only converted totals are approximate: each subscription keeps its own price and currency.
      </p>
    </div>
  );
}
