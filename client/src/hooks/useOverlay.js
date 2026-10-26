import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Only the top-most overlay reacts to Escape and Tab, so a confirm dialog can sit above a drawer.
const stack = [];

export function useOverlay(onClose, panelRef) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const id = Symbol('overlay');
    stack.push(id);
    const previous = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
      (first || panel).focus?.();
    }

    const onKey = (e) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
