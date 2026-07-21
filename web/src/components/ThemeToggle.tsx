import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, initialTheme, type Theme } from '../lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => initialTheme());

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button className="btn-icon" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
