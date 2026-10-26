import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../api.js';
import { useAuth } from './AuthContext.jsx';
import { DEFAULT_SETTINGS, mergeSettings } from '../utils/settings.js';
import { todayISO } from '../utils/dates.js';
import { makeFormatters } from '../utils/format.js';
import { buildInsights, isInsightHidden } from '../utils/insights.js';
import { buildNotifications } from '../utils/notifications.js';
import { applyTheme } from '../utils/theme.js';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [subs, setSubs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(() => todayISO('auto'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const todayRef = useRef(today);
  todayRef.current = today;

  const loadSubs = useCallback(async (tz) => {
    const t = todayISO(tz);
    setToday(t);
    todayRef.current = t;
    const { data } = await api.get('/subscriptions', { params: { today: t } });
    setSubs(data);
    const hist = await api.get('/analytics/history');
    setHistory(hist.data);
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings');
      const s = mergeSettings(DEFAULT_SETTINGS, data.settings);
      setSettings(s);
      await loadSubs(s.timezone);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadSubs]);

  useEffect(() => {
    if (user) init();
  }, [user?.id, init]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const refresh = useCallback(() => loadSubs(settingsRef.current.timezone), [loadSubs]);
  const q = () => ({ params: { today: todayRef.current } });

  // ---- subscription actions (they throw, so callers can show the message) ----
  const addSub = async (payload) => {
    const { data } = await api.post('/subscriptions', payload, q());
    await refresh();
    return data;
  };
  const updateSub = async (id, payload) => {
    await api.put(`/subscriptions/${id}`, payload, q());
    await refresh();
  };
  const removeSub = async (id) => {
    await api.delete(`/subscriptions/${id}`, q());
    await refresh();
  };
  const setStatus = async (id, status) => {
    await api.patch(`/subscriptions/${id}/status`, { status }, q());
    await refresh();
  };
  const markReviewed = async (id) => {
    await api.post(`/subscriptions/${id}/review`, {}, q());
    await refresh();
  };
  const importRows = async (rows) => {
    const { data } = await api.post('/subscriptions/import', { rows }, q());
    await refresh();
    return data;
  };
  const loadDemo = async () => {
    await api.post('/subscriptions/demo', {}, q());
    await refresh();
  };
  const clearDemo = async () => {
    await api.delete('/subscriptions/demo', q());
    await refresh();
  };
  const resetAll = async () => {
    await api.delete('/subscriptions', { params: { confirm: 'yes', today: todayRef.current } });
    await refresh();
  };

  // ---- settings ----
  const saveSettings = useCallback(
    async (patch) => {
      const previous = settingsRef.current;
      setSettings((cur) => mergeSettings(cur, patch));
      try {
        const { data } = await api.put('/settings', patch);
        setSettings(mergeSettings(DEFAULT_SETTINGS, data.settings));
        if (patch.timezone !== undefined) await loadSubs(patch.timezone);
      } catch (err) {
        setSettings(previous);
        throw err;
      }
    },
    [loadSubs]
  );

  // ---- derived data (single place so every page agrees) ----
  const currency = settings.currency;
  const fmt = useMemo(() => makeFormatters(settings), [settings]);

  const activeSubs = useMemo(() => subs.filter((s) => s.status === 'active'), [subs]);
  // Totals only use active subscriptions in the display currency. Nothing is converted.
  const counted = useMemo(() => activeSubs.filter((s) => s.currency === currency), [activeSubs, currency]);
  const excludedCount = activeSubs.length - counted.length;

  const allInsights = useMemo(
    () => buildInsights({ counted, settings, today, fmt }),
    [counted, settings, today, fmt]
  );
  const insights = useMemo(
    () => allInsights.filter((i) => !isInsightHidden(settings.insightStates[i.key], today)),
    [allInsights, settings.insightStates, today]
  );
  const archivedInsights = useMemo(
    () =>
      allInsights
        .filter((i) => isInsightHidden(settings.insightStates[i.key], today))
        .map((i) => ({ ...i, state: settings.insightStates[i.key] })),
    [allInsights, settings.insightStates, today]
  );

  const setInsightState = (key, status, days = 7) => {
    const until = status === 'snoozed' ? addDaysLocal(today, days) : undefined;
    return saveSettings({ insightStates: { [key]: { status, ...(until ? { until } : {}) } } });
  };
  const restoreInsight = (key) => saveSettings({ insightStates: { [key]: null } });

  const notifications = useMemo(() => {
    const read = new Set(settings.readNotifications || []);
    return buildNotifications({ counted, settings, today, insights, fmt }).map((n) => ({ ...n, read: read.has(n.id) }));
  }, [counted, settings, today, insights, fmt]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markNotificationsRead = (ids) => {
    const next = [...new Set([...(settings.readNotifications || []), ...ids])].slice(-300);
    return saveSettings({ readNotifications: next });
  };

  const value = {
    user, subs, activeSubs, counted, excludedCount, history, settings, today, currency, fmt,
    loading, error, refresh, reload: init,
    addSub, updateSub, removeSub, setStatus, markReviewed, importRows, loadDemo, clearDemo, resetAll,
    saveSettings,
    insights, allInsights, archivedInsights, setInsightState, restoreInsight,
    notifications, unreadCount, markNotificationsRead,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function addDaysLocal(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export const useData = () => useContext(DataContext);
