import React from 'react';
import { cn } from '../lib/cn';
import logoImg from '../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const ZingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => {
  return (
    <img
      src={logoImg}
      alt="ZingHire Icon"
      width={size}
      height={size}
      className={cn(
        'rounded-xl object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 border border-slate-200/60 dark:border-slate-800/80 bg-white/90',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
};

export const Logo: React.FC<LogoProps> = ({ className, size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5 group select-none', className)}>
      <div className="relative flex items-center justify-center">
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
