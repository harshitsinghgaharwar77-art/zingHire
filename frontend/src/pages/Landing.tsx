import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  Search,
  Sparkles,
  ArrowRight,
  Shield,
  MessageSquare,
  Zap,
  TrendingUp,
} from 'lucide-react';

/**
 * Landing Page — Wellfound-Inspired Startup Job Discovery & Marketplace
 * Warm Ivory (#FAF6EF) + Muted Terracotta (#B85C38) + Warm Charcoal (#30291F)
 */
export default function Landing() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const POPULAR_TAGS = ['All', 'Full Stack', 'Frontend', 'Backend', 'Python', 'React', 'AI / ML', 'Remote'];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/auth');
  };

  return (
    <div className="w-full flex flex-col items-center min-h-[calc(100vh-8rem)] py-6 sm:py-12">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl mx-auto px-4 text-center">

        {/* Small Category Pill */}
        <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1 rounded-full border border-[#E9DFD1] dark:border-[#382E25] bg-[#F3EBDD] dark:bg-[#2C241D] text-[#74685C] dark:text-[#D8CEBF] text-xs font-semibold">
          <Zap size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
          <span>The Campus & Startup Hiring Marketplace</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#30291F] dark:text-[#F6EFE6] leading-[1.12] mb-5">
          Where top talent meets <br className="hidden sm:inline" />
          <span className="text-[#B85C38] dark:text-[#D9734E]">forward-thinking</span> startups.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#74685C] dark:text-[#B0A294] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          ZingHire connects ambitious graduates and engineers with innovative teams.
          Zero spam, instant skill matching in milliseconds, and direct recruiter chat.
        </p>

        {/* ── Wellfound-Style Job Search & Discovery Bar ───────────────────── */}
        <div className="w-full max-w-2xl mx-auto mb-6 bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-2 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2.5 px-3 flex-1 w-full text-left">
              <Search size={18} className="text-[#74685C] dark:text-[#A89A8A] flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job titles, skills (e.g. React, Node.js, Python)…"
                className="w-full bg-transparent border-none text-sm text-[#30291F] dark:text-[#F6EFE6] placeholder:text-[#9A8D7E] dark:placeholder:text-[#7C6E5F] focus:outline-none focus:ring-0 !border-0 !shadow-none"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto text-sm !py-2.5 !px-5 whitespace-nowrap cursor-pointer"
            >
              Search Jobs
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-10 max-w-xl mx-auto">
          <span className="text-xs text-[#74685C] dark:text-[#A89A8A] mr-1 font-medium">Trending:</span>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSelectedTag(tag);
                if (tag !== 'All') setSearchQuery(tag);
              }}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)] font-semibold'
                  : 'bg-white dark:bg-[#221C16] text-[#74685C] dark:text-[#B0A294] border-[#E9DFD1] dark:border-[#382E25] hover:border-[#D8CBBA]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Dual Role Callouts ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-14 text-left">
          {/* Candidate Card */}
          <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-5 hover:border-[#D8CBBA] dark:hover:border-[#4A3D32] transition-colors flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-[#F3EBDD] dark:bg-[#2C241D] text-[#B85C38] dark:text-[#D9734E] flex items-center justify-center mb-3">
                <GraduationCap size={18} />
              </div>
              <h3 className="text-base font-bold text-[#30291F] dark:text-[#F6EFE6] mb-1">Looking for a role?</h3>
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed mb-4">
                Upload your resume to get instant, algorithmic match scores against active startup positions.
              </p>
            </div>
            <button
              onClick={() => navigate('/auth?tab=register&role=STUDENT')}
              className="btn-primary text-xs !py-2 !px-3.5 w-fit flex items-center gap-1.5 cursor-pointer"
            >
              Join as Candidate
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Recruiter Card */}
          <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-5 hover:border-[#D8CBBA] dark:hover:border-[#4A3D32] transition-colors flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-[#F3EBDD] dark:bg-[#2C241D] text-[#544A3E] dark:text-[#D8CEBF] flex items-center justify-center mb-3">
                <Briefcase size={18} />
              </div>
              <h3 className="text-base font-bold text-[#30291F] dark:text-[#F6EFE6] mb-1">Hiring startup talent?</h3>
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed mb-4">
                Post positions, extract skills automatically with AI, and chat directly with shortlisted candidates.
              </p>
            </div>
            <button
              onClick={() => navigate('/auth?tab=register&role=RECRUITER')}
              className="btn-secondary text-xs !py-2 !px-3.5 w-fit flex items-center gap-1.5 cursor-pointer"
            >
              Post a Role
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── Feature Grid ───────────────────────────────────────────────── */}
        <div className="border-t border-[#E9DFD1] dark:border-[#382E25] pt-12 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-1">Built For Clarity</h2>
            <p className="text-lg font-bold text-[#30291F] dark:text-[#F6EFE6]">How ZingHire works for both sides</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] flex items-center justify-center mb-3">
                <Sparkles size={16} />
              </div>
              <h4 className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] mb-1.5">AI Skill Parsing</h4>
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed">
                Gemini 2.0 automatically extracts verified skills and experience from candidate resumes in seconds.
              </p>
            </div>

            <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] flex items-center justify-center mb-3">
                <TrendingUp size={16} />
              </div>
              <h4 className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] mb-1.5">Transparent Scoring</h4>
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed">
                Real-time Jaccard algorithmic match scoring gives candidates clear visibility into required vs. missing skills.
              </p>
            </div>

            <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-[#F3EBDD] dark:bg-[#2C241D] text-[#544A3E] dark:text-[#D8CEBF] flex items-center justify-center mb-3">
                <MessageSquare size={16} />
              </div>
              <h4 className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] mb-1.5">Direct Live Chat</h4>
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed">
                Shortlisted candidates instantly connect with recruiters over full-duplex WebSocket messaging.
              </p>
            </div>
          </div>
        </div>

        {/* ── Key Metrics Bar ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-4 max-w-2xl mx-auto mb-10 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
          <div>
            <p className="text-xl font-black text-[#30291F] dark:text-[#F6EFE6]">&lt; 50ms</p>
            <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A] font-medium">Match Score Latency</p>
          </div>
          <div className="hidden sm:block h-6 w-px bg-[#E9DFD1] dark:bg-[#382E25]" />
          <div>
            <p className="text-xl font-black text-[#30291F] dark:text-[#F6EFE6]">Real-time</p>
            <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A] font-medium">ATS &amp; In-App Chat</p>
          </div>
          <div className="hidden sm:block h-6 w-px bg-[#E9DFD1] dark:bg-[#382E25]" />
          <div>
            <p className="text-xl font-black text-[#30291F] dark:text-[#F6EFE6]">0 Spam</p>
            <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A] font-medium">Verified Campus &amp; Startup Roles</p>
          </div>
        </div>

        {/* Admin Portal Link */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-1.5 text-xs text-[#74685C] dark:text-[#A89A8A] hover:text-[#30291F] dark:hover:text-[#F6EFE6] transition-colors cursor-pointer"
          >
            <Shield size={13} />
            University Placement Cell?{' '}
            <span className="underline underline-offset-4 decoration-[#D8CBBA] dark:decoration-[#4A3D32]">Admin Portal</span>
          </button>
        </div>

      </div>

      {/* ── Minimal Wellfound-Style Footer ───────────────────────────────── */}
      <footer className="w-full border-t border-[#E9DFD1] dark:border-[#382E25] mt-auto pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#74685C] dark:text-[#A89A8A]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#30291F] dark:text-[#F6EFE6]">ZingHire</span>
            <span>—</span>
            <span>The modern startup talent marketplace</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/auth?tab=login&role=STUDENT')} className="hover:text-[#30291F] dark:hover:text-[#F6EFE6] cursor-pointer">
              Candidate Login
            </button>
            <button onClick={() => navigate('/auth?tab=login&role=RECRUITER')} className="hover:text-[#30291F] dark:hover:text-[#F6EFE6] cursor-pointer">
              Recruiter Login
            </button>
            <span>&copy; {new Date().getFullYear()} ZingHire Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
