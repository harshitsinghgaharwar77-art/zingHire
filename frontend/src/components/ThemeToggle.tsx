import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { cn } from '../lib/cn';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel = false }) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      className={cn(
        'relative inline-flex items-center justify-center gap-2 p-2 rounded-xl',
        'border border-slate-200/80 dark:border-slate-800',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md',
        'text-slate-600 dark:text-slate-300',
        'hover:text-indigo-600 dark:hover:text-cyan-400',
        'hover:border-indigo-200 dark:hover:border-cyan-500/30',
        'hover:bg-slate-50 dark:hover:bg-slate-800/90',
        'shadow-sm transition-all duration-200 active:scale-95 cursor-pointer',
        className
      )}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          size={18}
          className={cn(
            'absolute transition-all duration-300',
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100 text-amber-500'
          )}
        />
        <Moon
          size={18}
          className={cn(
            'absolute transition-all duration-300',
            isDark ? 'opacity-100 rotate-0 scale-100 text-cyan-400' : 'opacity-0 -rotate-90 scale-50'
          )}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
