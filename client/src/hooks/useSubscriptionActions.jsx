import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

// Shared pause / resume / cancel-tracking / delete behaviour with the confirmation dialogs.
export function useSubscriptionActions({ onDeleted } = {}) {
  const { setStatus, removeSub, markReviewed } = useData();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'cancel', sub }
  const [busy, setBusy] = useState(false);

  const run = async (fn, message) => {
    try {
      await fn();
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const actions = {
    togglePause: (sub) =>
      run(
        () => setStatus(sub._id, sub.status === 'paused' ? 'active' : 'paused'),
        sub.status === 'paused' ? `${sub.name} resumed` : `${sub.name} paused`
      ),
    reactivate: (sub) => run(() => setStatus(sub._id, 'active'), `${sub.name} is active again`),
    review: (sub) => run(() => markReviewed(sub._id), `${sub.name} marked as reviewed`),
    askDelete: (sub) => setConfirm({ type: 'delete', sub }),
    askCancel: (sub) => setConfirm({ type: 'cancel', sub }),
  };

  const onConfirm = async () => {
    const { type, sub } = confirm;
    setBusy(true);
    try {
      if (type === 'delete') {
        await removeSub(sub._id);
        toast.success(`${sub.name} deleted`);
        onDeleted?.(sub);
      } else {
        await setStatus(sub._id, 'cancelled');
        toast.success(`${sub.name} marked as cancelled in Watchdog`);
      }
      setConfirm(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const dialog = confirm ? (
    confirm.type === 'delete' ? (
      <ConfirmDialog
        danger
        busy={busy}
        title={`Delete ${confirm.sub.name}?`}
        message="This permanently removes the subscription and its price history from Watchdog. This cannot be undone."
        confirmLabel="Delete subscription"
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
    ) : (
      <ConfirmDialog
        busy={busy}
        title={`Mark ${confirm.sub.name} as cancelled?`}
        message={`This only updates your tracking in Watchdog and removes it from your recurring totals. Watchdog cannot cancel ${confirm.sub.name} with the provider, so you still need to cancel it with them to stop being charged.`}
        confirmLabel="Mark as cancelled"
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
    )
  ) : null;

  return { actions, dialog };
}
