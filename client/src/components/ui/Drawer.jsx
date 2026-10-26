import { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useOverlay } from '../../hooks/useOverlay.js';

export default function Drawer({ title, subtitle, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useOverlay(onClose, ref);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside ref={ref} className={`drawer ${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="drawer-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
