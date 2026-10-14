// src/components/ResumeAnalyzing.tsx
// Full-screen overlay shown while the BullMQ worker is processing the resume.
// Dismisses automatically when the parent receives the 'resume:parsed' WebSocket event.

import { useEffect, useState, useRef } from 'react';
import { Sparkles, Brain, FileSearch, CheckCircle2, X } from 'lucide-react';

interface Props {
  /** Called by parent or safety timer when finished */
  onComplete?: () => void;
  /** Optional manual dismiss */
  onDismiss?: () => void;
}

const PHASES = [
  { icon: FileSearch,    label: 'Reading your PDF…',                  duration: 2500 },
  { icon: Brain,         label: 'Extracting text and credentials…',  duration: 3000 },
  { icon: Sparkles,      label: 'Gemini AI is analyzing skills…',    duration: 4500 },
  { icon: CheckCircle2,  label: 'Matching against active startups…', duration: 15000 },
];

export default function ResumeAnalyzing({ onComplete, onDismiss }: Props) {
  const [phaseIdx,   setPhaseIdx]   = useState(0);
  const [progress,   setProgress]   = useState(0);
  const [exiting,    setExiting]    = useState(false);
  const doneCalledRef = useRef(false);

  const handleDone = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    setProgress(100);
    setExiting(true);
    setTimeout(() => {
      onComplete?.();
      onDismiss?.();
    }, 500);
  };

  // Safety fallback: if processing takes > 22 seconds, auto-complete
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log('[ResumeAnalyzing] Safety auto-complete triggered');
      handleDone();
    }, 22000);
    return () => clearTimeout(safetyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance phases on a timer
  useEffect(() => {
    if (phaseIdx >= PHASES.length - 1) return;
    const t = setTimeout(() => setPhaseIdx(p => p + 1), PHASES[phaseIdx]!.duration);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  // Smooth progress bar
  useEffect(() => {
    const target = phaseIdx === PHASES.length - 1 ? 95 : ((phaseIdx + 1) / PHASES.length) * 85;
    const step = (target - progress) / 35;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (Math.abs(next - target) < 0.5) { clearInterval(interval); return target; }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIdx]);

  const CurrentIcon = PHASES[phaseIdx]!.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500
                  ${exiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
      style={{ background: 'rgba(23, 20, 17, 0.75)', backdropFilter: 'blur(16px)' }}
    >
      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 overflow-hidden animate-view-enter bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-2xl p-7 shadow-2xl">

        {/* Close / Dismiss button */}
        <button
          onClick={handleDone}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-[#74685C] dark:text-[#A89887] hover:text-[#30291F] dark:hover:text-[#F6EFE6] hover:bg-[#FAF6EF] dark:hover:bg-[#171411] transition-colors cursor-pointer"
          title="Dismiss overlay"
        >
          <X size={16} />
        </button>

        {/* Glowing warm ambient circle behind icon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(184,92,56,0.2) 0%, transparent 70%)', filter: 'blur(28px)' }} />

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative p-4 rounded-xl bg-[#F3EBDD] dark:bg-[#2E241B] border border-[#E9DFD1] dark:border-[#382E25]">
            <CurrentIcon size={28} className="text-[#B85C38] dark:text-[#D9734E]" style={{ animation: 'radarPulse 1.8s ease-in-out infinite' }} />
            {/* Spinning ring */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(184,92,56,0.15)" strokeWidth="2.5" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="#B85C38" strokeWidth="2.5"
                strokeDasharray="226" strokeDashoffset="170"
                strokeLinecap="round"
                style={{ transformOrigin: 'center', animation: 'spin 1.8s linear infinite' }} />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-center text-[#30291F] dark:text-[#F6EFE6] text-lg font-bold mb-1"
            style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
          AI Parsing Your Resume
        </h2>

        {/* Phase label */}
        <p className="text-center text-[#B85C38] dark:text-[#D9734E] text-xs font-semibold mb-5 transition-all duration-300">
          {PHASES[phaseIdx]!.label}
        </p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#74685C] dark:text-[#A89887] font-semibold mb-1.5">
            <span>Analyzing Content</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-[#E9DFD1] dark:bg-[#382E25]">
            <div className="h-full rounded-full transition-all duration-500 ease-out bg-[#B85C38]"
                 style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Phase dots */}
        <div className="flex justify-center gap-1.5">
          {PHASES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
                 style={{
                   width:      i === phaseIdx ? '20px' : '6px',
                   height:     '6px',
                   background: i <= phaseIdx ? '#B85C38' : 'rgba(184,92,56,0.2)',
                 }} />
          ))}
        </div>

        {/* Sub-text */}
        <p className="text-center text-[#74685C] dark:text-[#A89887] text-[11px] mt-4">
          Extracting competencies, college credentials, CGPA & experience
        </p>

        {/* Dev shortcut — hidden in production */}
        {import.meta.env.DEV && (
          <button onClick={handleDone}
            className="mt-3 w-full text-[11px] text-[#74685C] hover:text-[#B85C38] transition-colors cursor-pointer">
            [DEV] Simulate complete
          </button>
        )}
      </div>

      {/* Keyframe for spin (inline since it's component-local) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
