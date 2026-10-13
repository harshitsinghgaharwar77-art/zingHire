import React from 'react';
import { cn } from '../lib/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const ZingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('transition-transform duration-300 group-hover:scale-110', className)}
    >
      <defs>
        <linearGradient id="zing-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="zing-inner-bolt" x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      
      {/* Outer rounded hexagon/squircle badge */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill="url(#zing-gradient)"
      />
      
      {/* High-voltage Zing bolt / spark */}
      <path
        d="M13 4.5L7.5 12.5H12L11 19.5L16.5 11.5H12L13 4.5Z"
        fill="url(#zing-inner-bolt)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      
      {/* Subtle micro spark on top-right */}
      <circle cx="17.5" cy="6.5" r="1" fill="#ffffff" opacity="0.9" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({ className, size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5 group select-none', className)}>
      <div className="relative flex items-center justify-center drop-shadow-sm">
        <ZingIcon size={iconSizes[size]} />
      </div>
      {showText && (
        <span className={cn('font-black tracking-tight flex items-center', textSizes[size])}>
          <span className="text-slate-900 dark:text-white transition-colors">Zing</span>
          <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:to-cyan-400">
            Hire
          </span>
        </span>
      )}
    </div>
  );
};

export default Logo;
