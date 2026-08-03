import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label="Toggle color theme"
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-panel2 text-muted shadow-clay-xs transition-all hover:text-cyan active:shadow-clay-inset ${className}`}
    >
      {isLight ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
