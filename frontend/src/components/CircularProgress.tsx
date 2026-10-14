import { cn } from '../lib/cn';

// =============================================================================
// CircularProgress — SVG ring showing a percentage score
// =============================================================================
// REDESIGN: Track color updated from dark (#1e293b) to light (#e2e8f0 / slate-200)
// so the ring is visible on white/light-grey card backgrounds.
// Score colors (emerald ≥80, amber ≥60, red <60) remain unchanged.
// =============================================================================
interface Props {
  score:    number;   // 0-100
  size?:    number;   // px (default 80)
  stroke?:  number;   // stroke width (default 8)
  className?: string;
}

export default function CircularProgress({ score, size = 80, stroke = 8, className }: Props) {
  const radius      = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled      = (score / 100) * circumference;

  const colorClass =
    score >= 80 ? 'text-[#2D7A58] dark:text-[#52B788]'
    : score >= 60 ? 'text-[#B85C38] dark:text-[#D9734E]'
    : 'text-[#C24134] dark:text-[#F07167]';

  const strokeColor =
    score >= 80 ? 'stroke-[#2D7A58] dark:stroke-[#52B788]'
    : score >= 60 ? 'stroke-[#B85C38] dark:stroke-[#D9734E]'
    : 'stroke-[#C24134] dark:stroke-[#F07167]';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}
         style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track — adaptive warm sand */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-[#E9DFD1] dark:stroke-[#382E25] transition-colors"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn('transition-all', strokeColor)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Label */}
      <span
        className={cn('absolute text-xs font-bold transition-colors', colorClass)}
      >
        {score}%
      </span>
    </div>
  );
}
