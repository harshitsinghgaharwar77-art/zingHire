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
          <span className="text-[#30291F] dark:text-[#F6EFE6] transition-colors">Zing</span>
          <span className="text-[#B85C38] dark:text-[#D9734E] ml-0.5 transition-colors">
            Hire
          </span>
        </span>
      )}
    </div>
  );
};

export default Logo;
