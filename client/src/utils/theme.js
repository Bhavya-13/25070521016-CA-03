export function applyTheme(theme) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
      : theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = resolved;
  try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
}
