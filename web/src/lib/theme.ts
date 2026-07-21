export type Theme = 'light' | 'dark';

const KEY = 'packcare-theme';

/** Resolve the initial theme: explicit choice wins, else follow the OS preference. */
export function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}
