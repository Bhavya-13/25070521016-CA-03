import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [form, setForm] = useState(null); // null | { mode: 'add', preset } | { mode: 'edit', sub }
  const [searchOpen, setSearchOpen] = useState(false);

  const openAdd = useCallback((preset = null) => setForm({ mode: 'add', preset }), []);
  const openEdit = useCallback((sub) => setForm({ mode: 'edit', sub }), []);
  const closeForm = useCallback(() => setForm(null), []);

  const value = useMemo(
    () => ({ form, openAdd, openEdit, closeForm, searchOpen, setSearchOpen }),
    [form, openAdd, openEdit, closeForm, searchOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export const useUI = () => useContext(UIContext);
