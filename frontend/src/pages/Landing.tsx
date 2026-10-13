import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase, Sparkles, ArrowRight, CheckCircle2, Shield, Zap } from 'lucide-react';

/**
 * Landing Page — ZingHire Elite Showcase
 * Features dynamic AI match highlights, dual role entry points,
 * and high-contrast light/dark mode aesthetics.
 */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-6rem)] w-full flex flex-col items-center justify-center text-center relative overflow-hidden py-12">

      {/* ── Dot-grid background ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none dot-grid opacity-60" />

      {/* ── Soft ambient gradient glow ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-400/20 dark:bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      {/* ── Hero content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 animate-fade-in">

        {/* AI badge — glassmorphism pill */}
        <div className="inline-flex items-center gap-2 mb-8 animate-scale-in px-4 py-1.5 rounded-full border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/70 dark:bg-violet-950/40 backdrop-blur-md shadow-sm">
          <Zap size={13} className="text-violet-600 dark:text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Next-Gen AI Campus Placement Engine
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6 text-slate-900 dark:text-white animate-view-enter">
          Ignite Your Next Move with{' '}
          <span className="gradient-text">ZingHire</span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-3 leading-relaxed font-normal">
          ZingHire matches candidates to top-tier placements using our{' '}
          <span className="text-violet-600 dark:text-cyan-400 font-semibold">Hybrid O(1) Jaccard Engine</span>
          {' '}— scoring skills, CGPA, and coursework in milliseconds.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm tracking-widest uppercase mb-12 font-medium">
          Trusted by university placement cells & forward-thinking recruiters
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate('/auth')}
            className="group relative w-full sm:w-auto flex items-center justify-center gap-3
                       bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white font-bold text-base px-8 py-4 rounded-2xl
                       hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]
                       transition-all duration-200 shadow-md cursor-pointer"
          >
            <GraduationCap size={20} />
            I am a Student
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/auth')}
            className="group relative w-full sm:w-auto flex items-center justify-center gap-3
                       bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white font-bold text-base px-8 py-4 rounded-2xl
                       border-2 border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800/60
                       active:scale-[0.98] transition-all duration-200 backdrop-blur-md cursor-pointer"
          >
            <Briefcase size={20} className="text-violet-600 dark:text-cyan-400" />
            I am a Recruiter
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Admin Link */}
        <div className="mb-14">
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm
                       transition-colors cursor-pointer font-medium"
          >
            <Shield size={13} />
            Placement Cell?{' '}
            <span className="underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700">Admin Portal</span>
          </button>
        </div>

        {/* Feature trust strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            {
              icon: <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />,
              title: 'AI Skill Extraction',
              desc:  'Automated PDF resume parsing powered by Gemini 2.0 Flash',
              bg:    'bg-violet-50/70 dark:bg-violet-950/30 border-violet-200/60 dark:border-violet-900/40',
            },
            {
              icon: <Zap size={18} className="text-cyan-600 dark:text-cyan-400" />,
              title: 'Zero-Token Advice',
              desc:  'Instant algorithmic skill-gap analysis with actionable projects',
              bg:    'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200/60 dark:border-cyan-900/40',
            },
            {
              icon: <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />,
              title: 'Real-time ATS & Chat',
              desc:  'Full-duplex WebSocket messaging and instant applicant rankings',
              bg:    'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40',
            },
          ].map(({ icon, title, desc, bg }) => (
            <div
              key={title}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${bg} text-center backdrop-blur-md transition-all hover:scale-[1.02]`}
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800">
                {icon}
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">{title}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof strip */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-0
                        divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800
                        rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
          {[
            { value: '<50ms',    label: 'AI Match Latency' },
            { value: '3 Roles',  label: 'Student · Recruiter · Admin' },
            { value: '100%',     label: 'Full Realtime Mesh' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 px-10 py-5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
