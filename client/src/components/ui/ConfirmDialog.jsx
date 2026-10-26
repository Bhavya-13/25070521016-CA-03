import { useId, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay.js';

export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel, children,
}) {
  const ref = useRef(null);
  const titleId = useId();
  const textId = useId();
  useOverlay(onCancel, ref);

  return (
    <div className="overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div ref={ref} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} tabIndex={-1}>
        <div className={`dialog-icon ${danger ? 'danger' : ''}`}>
          {danger ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>
        <h2 id={titleId}>{title}</h2>
        <p id={textId} className="muted">{message}</p>
        {children}
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onCancel} data-autofocus>Cancel</button>
          <button type="button" className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
