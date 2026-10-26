import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [form, setForm] = useState(null); // null | { mode: 'add', preset } | { mode: 'edit', sub }
  const [pay, setPay] = useState(null); // null | { subId, forDate, source }
  const [searchOpen, setSearchOpen] = useState(false);

  const openAdd = useCallback((preset = null) => setForm({ mode: 'add', preset }), []);
  const openEdit = useCallback((sub) => setForm({ mode: 'edit', sub }), []);
  const closeForm = useCallback(() => setForm(null), []);
  // forDate = a missed renewal to settle; omit it to pay the upcoming one. source can preselect 'wallet'.
  const openPay = useCallback((subId, forDate = null, source = null) => setPay({ subId, forDate, source }), []);
  const closePay = useCallback(() => setPay(null), []);

  const value = useMemo(
    () => ({ form, openAdd, openEdit, closeForm, pay, openPay, closePay, searchOpen, setSearchOpen }),
    [form, openAdd, openEdit, closeForm, pay, openPay, closePay, searchOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export const useUI = () => useContext(UIContext);
