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
        'relative inline-flex items-center justify-center gap-2 p-2 rounded-lg',
        'border border-[#E9DFD1] dark:border-[#382E25]',
        'bg-white dark:bg-[#221C16]',
        'text-[#74685C] dark:text-[#A89A8A]',
        'hover:text-[#B85C38] dark:hover:text-[#D9734E]',
        'hover:border-[#D8CBBA] dark:hover:border-[#4A3D32]',
        'hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D]',
        'shadow-xs transition-colors duration-150 active:scale-95 cursor-pointer',
        className
      )}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          size={17}
          className={cn(
            'absolute transition-all duration-300',
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100 text-[#B57324]'
          )}
        />
        <Moon
          size={17}
          className={cn(
            'absolute transition-all duration-300',
            isDark ? 'opacity-100 rotate-0 scale-100 text-[#D9734E]' : 'opacity-0 -rotate-90 scale-50'
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
