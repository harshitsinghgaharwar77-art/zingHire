import { useEffect, useState, useCallback, useMemo, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Briefcase, Users, Loader2,
  Sparkles, RefreshCw,
  Search, Mail, Trash2, FileText, ExternalLink, Download, X, BookOpen,
  LayoutDashboard, BarChart2, Clock, TrendingUp, CheckCircle,
  AlertCircle, Target, Zap, Award, MessageSquare, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { getSocket } from '../../lib/socket';
import { cn } from '../../lib/cn';
import CircularProgress from '../../components/CircularProgress';
import NotificationBell from '../../components/NotificationBell';
import { useChatStore } from '../../store/chatStore';

// =============================================================================
// Types
// =============================================================================
interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  minCgpa: number;
  minExperience: number;
  isActive: boolean;
  createdAt: string;
  _count?: { applications: number };
}

interface RealApplicant {
  id: string;
  matchScore: number | null;
  status: string;
  appliedAt: string;
  conversationId?: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    college: string;
    cgpa: number;
    experienceYears: number;
    resumeUrl: string | null;
    parsedSkills: string[];
    user: { email: string };
  };
}

type RecruiterView = 'dashboard' | 'postings' | 'applicants' | 'analytics' | 'post-job';

// =============================================================================
// RecruiterDashboard
// =============================================================================
export default function RecruiterDashboard() {

  // ── State ─────────────────────────────────────────────────────────────────
  const [jobs,                 setJobs]                 = useState<Job[]>([]);
  const [loadingJobs,          setLoadingJobs]          = useState(true);
  const [submitting,           setSubmitting]           = useState(false);
  const [activeView,           setActiveView]           = useState<RecruiterView>('dashboard');

  // Per-job applicants (loaded lazily)
  const [applicantsByJob,      setApplicantsByJob]      = useState<Record<string, RealApplicant[]>>({});
  const [loadingApplicantsFor, setLoadingApplicantsFor] = useState<string | null>(null);
  // All applicants tab — loads all at once
  const [allApplicants,        setAllApplicants]        = useState<RealApplicant[]>([]);
  const [loadingAll,           setLoadingAll]           = useState(false);
  const [allLoaded,            setAllLoaded]            = useState(false);
  const [applicantsSearch,     setApplicantsSearch]     = useState('');
  // Expanded applicant panel per job (postings view)
  const [expandedJob,          setExpandedJob]          = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId,     setViewingId]     = useState<string | null>(null);
  const [jdPreviewJob,  setJdPreviewJob]  = useState<Job | null>(null);

  // Real-time Chat & Hiring states
  const openChat = useChatStore((s) => s.openChat);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SHORTLISTED' | 'REJECTED'>('ALL');
  const [searchParams] = useSearchParams();
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);

  // Post form state
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [minCgpa,     setMinCgpa]     = useState('');
  const [minExp,      setMinExp]      = useState('');

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const { data } = await api.get<{ data: Job[] }>('/jobs/my-postings');
      setJobs(data.data ?? []);
    } catch {
      toast.error('Failed to load your job listings.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  // Real-time Socket listener for incoming candidate applications
  useEffect(() => {
    const socket = getSocket();
    const handleNewApplicant = (data: { jobId: string; jobTitle: string; studentName: string; matchScore: number }) => {
      toast(`📥 ${data.studentName} applied to "${data.jobTitle}" (${data.matchScore}% Match)!`, {
        icon: '🎯',
        duration: 6000,
      });
      void fetchJobs();
      setApplicantsByJob(prev => {
        if (!prev[data.jobId]) return prev;
        const next = { ...prev };
        delete next[data.jobId];
        return next;
      });
      setAllLoaded(false);
    };
    socket.on('recruiter:new_applicant', handleNewApplicant);
    return () => {
      socket.off('recruiter:new_applicant', handleNewApplicant);
    };
  }, [fetchJobs]);

  const fetchApplicantsForJob = useCallback(async (jobId: string, force = false) => {
    if (!force && applicantsByJob[jobId]) return; // already loaded
    setLoadingApplicantsFor(jobId);
    try {
      const { data } = await api.get<{ data: RealApplicant[] }>(`/jobs/${jobId}/applicants`);
      setApplicantsByJob(prev => ({ ...prev, [jobId]: data.data ?? [] }));
    } catch {
      toast.error('Failed to load applicants.');
    } finally {
      setLoadingApplicantsFor(null);
    }
  }, [applicantsByJob]);

  // Open job details & applicants view (e.g. from notification clicks or query params)
  const openJobApplicants = useCallback((targetJobId: string) => {
    setActiveView('postings');
    setExpandedJob(targetJobId);
    setHighlightedJobId(targetJobId);
    void fetchApplicantsForJob(targetJobId, true);

    // Scroll to the job card after rendering
    setTimeout(() => {
      const el = document.getElementById(`job-posting-${targetJobId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Clear highlight after 3.5 seconds
    setTimeout(() => {
      setHighlightedJobId(null);
    }, 3500);
  }, [fetchApplicantsForJob]);

  // Handle URL query parameters (e.g. /recruiter?jobId=xyz)
  useEffect(() => {
    const targetJobId = searchParams.get('jobId');
    if (targetJobId && jobs.length > 0) {
      const jobExists = jobs.some(j => j.id === targetJobId);
      if (jobExists) {
        openJobApplicants(targetJobId);
      }
    }
  }, [searchParams, jobs, openJobApplicants]);

  const fetchAllApplicants = useCallback(async () => {
    if (allLoaded) return;
    setLoadingAll(true);
    try {
      const currentJobs = jobs.length > 0
        ? jobs
        : (await api.get<{ data: Job[] }>('/jobs/my-postings')).data.data ?? [];

      const results = await Promise.allSettled(
        currentJobs.map(j => api.get<{ data: RealApplicant[] }>(`/jobs/${j.id}/applicants`))
      );
      const combined: RealApplicant[] = [];
      const seen = new Set<string>();
      for (const res of results) {
        if (res.status === 'fulfilled') {
          for (const a of (res.value.data.data ?? [])) {
            if (!seen.has(a.id)) {
              seen.add(a.id);
              combined.push(a);
            }
          }
        }
      }
      combined.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
      setAllApplicants(combined);
      setAllLoaded(true);
    } catch {
      toast.error('Failed to load applicants.');
    } finally {
      setLoadingAll(false);
    }
  }, [allLoaded, jobs]);

  useEffect(() => {
    if (activeView === 'applicants' && !allLoaded) {
      void fetchAllApplicants();
    }
  }, [activeView, allLoaded, fetchAllApplicants]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Job title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: { title: string; description: string; minCgpa?: number; minExperience?: number } = {
        title: title.trim(),
        description: description.trim(),
      };
      if (minCgpa.trim()) payload.minCgpa = parseFloat(minCgpa);
      if (minExp.trim())  payload.minExperience = parseFloat(minExp);

      const { data } = await api.post<{ data: Job; message: string }>('/jobs', payload);
      toast.success(data.message ?? 'Job posted! AI extracted required skills.');
      setTitle(''); setDescription(''); setMinCgpa(''); setMinExp('');
      setAllLoaded(false);
      await fetchJobs();
      setActiveView('postings');
    } catch {
      toast.error('Failed to post job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success('Job deleted.');
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setApplicantsByJob(prev => { const n = { ...prev }; delete n[jobId]; return n; });
      setAllLoaded(false);
    } catch {
      toast.error('Failed to delete job.');
    }
  };

  const handleDownloadResume = async (resumeUrl: string, studentName: string, applicantId: string) => {
    setDownloadingId(applicantId);
    try {
      const resp = await fetch(resumeUrl);
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${studentName.replace(/\s+/g, '_')}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success('Resume downloaded!');
    } catch {
      window.open(resumeUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewResume = async (resumeUrl: string, applicantId: string) => {
    setViewingId(applicantId);
    try {
      window.open(resumeUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setViewingId(null);
    }
  };

  // Status Change Handler (Shortlist / Reject)
  const handleStatusChange = async (applicantId: string, newStatus: 'SHORTLISTED' | 'REJECTED') => {
    setStatusUpdatingId(applicantId);
    try {
      const { data } = await api.patch<{ data: { id: string; status: string; conversationId?: string } }>(
        `/jobs/applications/${applicantId}/status`,
        { status: newStatus }
      );
      toast.success(newStatus === 'SHORTLISTED' ? 'Candidate shortlisted! Live Chat unlocked.' : 'Candidate rejected.');

      // Update local state in allApplicants
      setAllApplicants(prev => prev.map(a =>
        a.id === applicantId ? { ...a, status: newStatus, conversationId: data.data?.conversationId ?? a.conversationId } : a
      ));

      // Update local state in applicantsByJob
      setApplicantsByJob(prev => {
        const next = { ...prev };
        for (const [jobId, list] of Object.entries(next)) {
          next[jobId] = list.map(a =>
            a.id === applicantId ? { ...a, status: newStatus, conversationId: data.data?.conversationId ?? a.conversationId } : a
          );
        }
        return next;
      });
    } catch {
      toast.error('Failed to update candidate status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const activeJobs = jobs.filter(j => j.isActive).length;
  const totalApps  = jobs.reduce((acc, j) => acc + (j._count?.applications ?? 0), 0);

  const avgDays = useMemo(() => {
    if (jobs.length === 0) return 0;
    const now = Date.now();
    const total = jobs.reduce((acc, j) => acc + (now - new Date(j.createdAt).getTime()), 0);
    return Math.round(total / jobs.length / (1000 * 60 * 60 * 24));
  }, [jobs]);

  // Analytics aggregations
  const analytics = useMemo(() => {
    const skillCount: Record<string, number> = {};
    for (const job of jobs) {
      for (const s of job.requiredSkills) {
        skillCount[s] = (skillCount[s] ?? 0) + 1;
      }
    }
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    const scored = allApplicants.filter(a => a.matchScore !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((acc, a) => acc + (a.matchScore ?? 0), 0) / scored.length)
      : 0;

    const statusBreakdown: Record<string, number> = {};
    for (const a of allApplicants) {
      statusBreakdown[a.status] = (statusBreakdown[a.status] ?? 0) + 1;
    }

    return { topSkills, avgScore, statusBreakdown };
  }, [jobs, allApplicants]);

  // Filtered all applicants
  const filteredApplicants = useMemo(() => {
    let list = allApplicants;
    if (statusFilter !== 'ALL') {
      list = list.filter(a => a.status === statusFilter);
    }
    if (!applicantsSearch.trim()) return list;
    const q = applicantsSearch.toLowerCase();
    return list.filter(a =>
      `${a.student.firstName} ${a.student.lastName}`.toLowerCase().includes(q) ||
      a.student.college.toLowerCase().includes(q) ||
      a.student.user.email.toLowerCase().includes(q) ||
      a.student.parsedSkills.some(s => s.toLowerCase().includes(q))
    );
  }, [allApplicants, applicantsSearch, statusFilter]);

  // ── Sidebar nav ────────────────────────────────────────────────────────────
  const navItems: { view: RecruiterView; icon: React.ReactNode; label: string; badge?: number }[] = [
    { view: 'dashboard',  icon: <LayoutDashboard size={15} />, label: 'Overview' },
    { view: 'postings',   icon: <Briefcase size={15} />,       label: 'My Postings', badge: jobs.length },
    { view: 'applicants', icon: <Users size={15} />,           label: 'All Applicants', badge: totalApps },
    { view: 'analytics',  icon: <BarChart2 size={15} />,       label: 'Analytics' },
    { view: 'post-job',   icon: <PlusCircle size={15} />,      label: 'Post a Job' },
  ];

  return (
    <div className="flex gap-6 items-start w-full">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR (Wellfound Style)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className="w-60 shrink-0 hidden lg:flex flex-col gap-3 sticky top-24 self-start animate-slide-in-left">

        {/* Company avatar & identity */}
        <div className="wellfound-card p-5 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-warm-terracotta text-white flex items-center justify-center shadow-sm ring-4 ring-warm-sandTint dark:ring-warm-darkBorder">
            <Briefcase size={22} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              Recruiter Hub
            </p>
            <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-0.5">ZingHire Talent Engine</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal text-xs font-semibold rounded-md">
              {activeJobs} Active
            </span>
            <span className="px-2.5 py-1 bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted text-xs font-semibold rounded-md">
              {totalApps} Apps
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="wellfound-card p-2 flex flex-col gap-1">
          <p className="type-label px-3 py-1.5 text-warm-muted dark:text-warm-darkMuted">Workspace</p>
          {navItems.map(({ view, icon, label, badge }) => {
            const isActive = activeView === view;
            const isPost = view === 'post-job';
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 w-full text-left cursor-pointer',
                  isActive
                    ? 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal border-l-2 border-warm-terracotta font-bold'
                    : isPost
                    ? 'text-warm-terracotta dark:text-warm-darkTerracotta hover:bg-warm-sandTint/50 dark:hover:bg-warm-darkElevated/50 font-bold'
                    : 'text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint/40 dark:hover:bg-warm-darkElevated/40'
                )}
              >
                <span className={cn(isActive || isPost ? 'text-warm-terracotta dark:text-warm-darkTerracotta' : 'text-warm-muted dark:text-warm-darkMuted')}>
                  {icon}
                </span>
                <span>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-warm-sandTint dark:bg-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal px-1.5 py-0.5 rounded-full border border-warm-border dark:border-warm-darkBorder">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick stats strip */}
        <div className="wellfound-card p-4 space-y-3">
          <p className="type-label text-warm-muted dark:text-warm-darkMuted">Metrics Overview</p>
          {[
            { label: 'Active Jobs',  value: activeJobs,  color: 'text-[#2D7A58] dark:text-[#52C58E]' },
            { label: 'Total Apps',   value: totalApps,   color: 'text-warm-terracotta dark:text-warm-darkTerracotta'  },
            { label: 'Avg Days Up',  value: `${avgDays}d`, color: 'text-warm-charcoal dark:text-warm-darkCharcoal'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-warm-muted dark:text-warm-darkMuted font-medium">{label}</span>
              <span className={cn('text-sm font-bold', color)}>{value}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0">

        {/* ─── VIEW: DASHBOARD ─────────────────────────────────────────────── */}
        {activeView === 'dashboard' && (
          <div className="space-y-5 animate-view-enter">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-warm-border dark:border-warm-darkBorder">
              <div>
                <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                  Recruiter Dashboard
                </h1>
                <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm">
                  Track postings, candidate responses, and AI match analytics
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openChat(null)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-warm-border dark:border-warm-darkBorder bg-white dark:bg-warm-darkCard hover:bg-warm-sandTint/50 dark:hover:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare size={14} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                  <span>Live Chat</span>
                </button>
                <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />
                <button
                  onClick={() => setActiveView('post-job')}
                  className="flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracottaHover text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle size={14} />Post a Job
                </button>
                <button
                  onClick={() => void fetchJobs()}
                  disabled={loadingJobs}
                  className="p-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
                  title="Refresh listings"
                >
                  <RefreshCw size={15} className={loadingJobs ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loadingJobs ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="wellfound-card p-5"><div className="skeleton h-3.5 w-20 mb-4" /><div className="skeleton h-10 w-16 mb-1" /><div className="skeleton h-3 w-28" /></div>
              )) : [
                { label: 'Active Postings',    value: activeJobs, sub: `${jobs.length - activeJobs} closed`,  icon: <Briefcase size={18} className="text-warm-terracotta dark:text-warm-darkTerracotta" /> },
                { label: 'Total Applications', value: totalApps,  sub: 'across active pipelines',     icon: <Users size={18} className="text-[#2D7A58] dark:text-[#52C58E]" /> },
                { label: 'Avg. Days Live',     value: `${avgDays}d`, sub: 'avg time on market',       icon: <Clock size={18} className="text-warm-muted dark:text-warm-darkMuted" /> },
              ].map(({ label, value, sub, icon }, i) => (
                <div key={label} className={cn('wellfound-card p-5 animate-view-enter', `stagger-${i + 1}`)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="type-label text-warm-muted dark:text-warm-darkMuted">{label}</span>
                    <div className="p-2 rounded-lg bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder">{icon}</div>
                  </div>
                  <p className="text-3xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.03em' }}>{value}</p>
                  <p className="text-xs text-warm-muted dark:text-warm-darkMuted font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* Recent postings preview */}
            <div className="wellfound-card p-6 animate-view-enter stagger-3">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-warm-border dark:border-warm-darkBorder">
                <h2 className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-2">
                  <Briefcase size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />Recent Postings
                </h2>
                <button onClick={() => setActiveView('postings')} className="text-xs text-warm-terracotta dark:text-warm-darkTerracotta font-semibold hover:underline cursor-pointer">
                  View All ({jobs.length}) →
                </button>
              </div>
              {loadingJobs ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-10">
                  <Briefcase size={28} className="text-warm-muted/40 mx-auto mb-3" />
                  <p className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">No jobs posted yet</p>
                  <button onClick={() => setActiveView('post-job')} className="mt-3 text-sm text-warm-terracotta dark:text-warm-darkTerracotta font-semibold hover:underline cursor-pointer">
                    Post your first job →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-warm-border dark:divide-warm-darkBorder">
                  {jobs.slice(0, 4).map(job => (
                    <div key={job.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm">{job.title}</p>
                        <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-0.5">
                          {new Date(job.createdAt).toLocaleDateString()} · {job._count?.applications ?? 0} applicants
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-semibold border',
                          job.isActive
                            ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]'
                            : 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted dark:text-warm-darkMuted border-warm-border dark:border-warm-darkBorder'
                        )}>
                          {job.isActive ? 'Active' : 'Closed'}
                        </span>
                        <button
                          onClick={() => setActiveView('postings')}
                          className="text-xs font-semibold text-warm-terracotta dark:text-warm-darkTerracotta hover:underline cursor-pointer"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wellfound Tips card */}
            <div className="wellfound-card p-5 border-l-4 border-l-warm-terracotta bg-warm-sandTint/30 dark:bg-warm-darkElevated/30 animate-view-enter stagger-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2 bg-warm-sandTint dark:bg-warm-darkElevated rounded-lg flex-shrink-0 border border-warm-border dark:border-warm-darkBorder">
                  <Sparkles size={16} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                </div>
                <div>
                  <p className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm">Hiring Recommendations</p>
                  <ul className="mt-2 space-y-1 text-xs text-warm-muted dark:text-warm-darkMuted">
                    <li>• Clear, transparent requirements yield better candidate matches from Gemini AI</li>
                    <li>• Candidates are ranked by Jaccard skill overlap combined with CGPA and experience weights</li>
                    <li>• Unlock real-time 1-on-1 messaging instantly by Shortlisting high-scoring applicants</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── VIEW: MY POSTINGS ───────────────────────────────────────────── */}
        {activeView === 'postings' && (
          <div className="space-y-5 animate-view-enter">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-warm-border dark:border-warm-darkBorder">
              <div>
                <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                  My Job Postings
                </h1>
                <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm">{jobs.length} total · {activeJobs} active</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveView('post-job')}
                  className="flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracottaHover text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle size={14} />New Job
                </button>
                <button
                  onClick={() => void fetchJobs()}
                  disabled={loadingJobs}
                  className="p-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
                >
                  <RefreshCw size={15} className={loadingJobs ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {loadingJobs ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
            ) : jobs.length === 0 ? (
              <div className="wellfound-card p-14 text-center">
                <Briefcase size={36} className="text-warm-muted/40 mx-auto mb-4" />
                <p className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-base">No postings yet</p>
                <p className="text-warm-muted dark:text-warm-darkMuted text-sm mt-1">Post your first job to start receiving AI-ranked applicants</p>
                <button onClick={() => setActiveView('post-job')} className="btn-primary mt-5">Post a Job</button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job, idx) => {
                  const isExpanded = expandedJob === job.id;
                  const jobApplicants = applicantsByJob[job.id] ?? [];
                  return (
                    <div
                      key={job.id}
                      id={`job-posting-${job.id}`}
                      className={cn(
                        'wellfound-card overflow-hidden animate-view-enter transition-all duration-300',
                        `stagger-${Math.min(idx + 1, 6)}`,
                        highlightedJobId === job.id && 'ring-2 ring-warm-terracotta shadow-md'
                      )}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-base truncate" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                              {job.title}
                            </h3>
                            <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-0.5">
                              Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={cn(
                            'flex-shrink-0 px-2.5 py-1 rounded text-xs font-semibold border',
                            job.isActive
                              ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]'
                              : 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted dark:text-warm-darkMuted border-warm-border dark:border-warm-darkBorder'
                          )}>
                            {job.isActive ? 'Active' : 'Closed'}
                          </span>
                        </div>

                        {/* Skill pills */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.requiredSkills.slice(0, 6).map(s => (
                            <span key={s} className="px-2 py-0.5 bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal text-[11px] font-medium rounded">
                              {s}
                            </span>
                          ))}
                          {job.requiredSkills.length > 6 && (
                            <span className="text-warm-muted dark:text-warm-darkMuted text-xs font-medium self-center">
                              +{job.requiredSkills.length - 6} more
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-warm-muted dark:text-warm-darkMuted pt-3 border-t border-warm-border dark:border-warm-darkBorder">
                          <span>CGPA ≥ <span className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal">{job.minCgpa}</span></span>
                          <span>Exp ≥ <span className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal">{job.minExperience} yrs</span></span>
                          <span className="font-semibold text-warm-terracotta dark:text-warm-darkTerracotta">
                            {job._count?.applications ?? 0} Applicant{(job._count?.applications ?? 0) !== 1 ? 's' : ''}
                          </span>
                          <div className="ml-auto flex items-center gap-3">
                            <button
                              onClick={() => setJdPreviewJob(job)}
                              className="flex items-center gap-1 text-warm-muted dark:text-warm-darkMuted font-semibold hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal transition-colors cursor-pointer"
                            >
                              <BookOpen size={13} />View JD
                            </button>
                            <button
                              onClick={() => void handleDeleteJob(job.id)}
                              className="flex items-center gap-1 text-[#B83E28] font-semibold hover:text-[#8E2816] transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />Delete
                            </button>
                            <button
                              onClick={async () => {
                                if (isExpanded) { setExpandedJob(null); return; }
                                setExpandedJob(job.id);
                                await fetchApplicantsForJob(job.id);
                              }}
                              className="flex items-center gap-1 text-warm-terracotta dark:text-warm-darkTerracotta font-bold hover:underline transition-colors cursor-pointer"
                            >
                              <Users size={13} />
                              {isExpanded ? 'Hide Applicants' : 'View Applicants'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Applicant panel */}
                      {isExpanded && (
                        <div className="bg-warm-sandTint/40 dark:bg-warm-darkElevated/40 border-t border-warm-border dark:border-warm-darkBorder p-5 animate-slide-up">
                          <h4 className="type-label mb-4 flex items-center gap-2 text-warm-muted dark:text-warm-darkMuted">
                            <Search size={12} className="text-warm-terracotta dark:text-warm-darkTerracotta" />AI Ranked Applicants
                            {!loadingApplicantsFor && (
                              <span className="ml-auto text-warm-charcoal dark:text-warm-darkCharcoal font-bold normal-case text-sm">
                                {jobApplicants.length}
                              </span>
                            )}
                          </h4>
                          {loadingApplicantsFor === job.id ? (
                            <div className="flex items-center justify-center py-8 gap-3 text-warm-muted">
                              <Loader2 size={18} className="animate-spin text-warm-terracotta" />
                              <span className="text-sm">Loading applicants…</span>
                            </div>
                          ) : jobApplicants.length === 0 ? (
                            <div className="text-center py-8">
                              <Users size={22} className="text-warm-muted/40 mx-auto mb-2" />
                              <p className="text-sm text-warm-muted dark:text-warm-darkMuted">No applications yet</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {jobApplicants.map(a => (
                                <ApplicantRow
                                  key={a.id}
                                  applicant={a}
                                  onDownload={handleDownloadResume}
                                  onView={handleViewResume}
                                  downloadingId={downloadingId}
                                  viewingId={viewingId}
                                  onStatusChange={handleStatusChange}
                                  onOpenChat={(convId) => openChat(convId ?? null)}
                                  statusLoadingId={statusUpdatingId}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW: ALL APPLICANTS ────────────────────────────────────────── */}
        {activeView === 'applicants' && (
          <div className="space-y-5 animate-view-enter">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-warm-border dark:border-warm-darkBorder">
              <div>
                <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                  All Candidates
                </h1>
                <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm">Every applicant across all postings, ranked by AI match score</p>
              </div>
              <button
                onClick={() => { setAllLoaded(false); void fetchAllApplicants(); }}
                disabled={loadingAll}
                className="p-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
              >
                <RefreshCw size={15} className={loadingAll ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Summary stats */}
            {!loadingAll && allLoaded && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-view-enter">
                {[
                  { label: 'Total Candidates', value: allApplicants.length, icon: <Users size={16} className="text-warm-terracotta dark:text-warm-darkTerracotta" /> },
                  { label: 'Avg Match Score',  value: `${analytics.avgScore}%`, icon: <Target size={16} className="text-[#2D7A58] dark:text-[#52C58E]" /> },
                  { label: 'Pending Review',   value: analytics.statusBreakdown['PENDING'] ?? 0, icon: <AlertCircle size={16} className="text-[#A66908] dark:text-[#E8A538]" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="wellfound-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="type-label text-warm-muted dark:text-warm-darkMuted">{label}</span>
                      <div className="p-1.5 rounded bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder">{icon}</div>
                    </div>
                    <p className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Search & Status Filter bar */}
            {allLoaded && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-view-enter stagger-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-muted" />
                  <input
                    type="text"
                    placeholder="Search candidate name, college, skills, email…"
                    value={applicantsSearch}
                    onChange={e => setApplicantsSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                  />
                </div>
                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-warm-sandTint/50 dark:bg-warm-darkElevated rounded-lg border border-warm-border dark:border-warm-darkBorder overflow-x-auto no-scrollbar">
                  {[
                    { key: 'ALL', label: `All (${allApplicants.length})` },
                    { key: 'PENDING', label: `Pending (${analytics.statusBreakdown['PENDING'] ?? 0})` },
                    { key: 'SHORTLISTED', label: `Shortlisted (${analytics.statusBreakdown['SHORTLISTED'] ?? 0})` },
                    { key: 'REJECTED', label: `Rejected (${analytics.statusBreakdown['REJECTED'] ?? 0})` },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key as typeof statusFilter)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer',
                        statusFilter === key
                          ? 'bg-white dark:bg-warm-darkCard text-warm-charcoal dark:text-warm-darkCharcoal shadow-sm border border-warm-border dark:border-warm-darkBorder font-bold'
                          : 'text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Applicant list */}
            {loadingAll ? (
              <div className="wellfound-card p-12 flex flex-col items-center gap-4">
                <Loader2 size={28} className="animate-spin text-warm-terracotta" />
                <p className="text-sm font-medium text-warm-muted">Fetching candidates across {jobs.length} postings…</p>
              </div>
            ) : !allLoaded ? (
              <div className="wellfound-card p-12 text-center">
                <Users size={32} className="text-warm-muted/40 mx-auto mb-3" />
                <p className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">No data loaded yet</p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="wellfound-card p-12 text-center">
                <Search size={28} className="text-warm-muted/40 mx-auto mb-3" />
                <p className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">No applicants found</p>
                <p className="text-warm-muted dark:text-warm-darkMuted text-xs mt-1">{applicantsSearch ? 'Try adjusting your search filters' : 'No applications received yet'}</p>
              </div>
            ) : (
              <div className="wellfound-card p-6 animate-view-enter stagger-3">
                <h2 className="type-label mb-4 flex items-center gap-2 text-warm-muted dark:text-warm-darkMuted">
                  <Users size={12} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                  {filteredApplicants.length} Candidate{filteredApplicants.length !== 1 ? 's' : ''}
                  {applicantsSearch && <span className="normal-case text-warm-muted font-normal">matching "{applicantsSearch}"</span>}
                </h2>
                <div className="space-y-3">
                  {filteredApplicants.map((a, i) => (
                    <div key={`${a.id}-${i}`} className={cn('animate-view-enter', `stagger-${Math.min(i + 1, 6)}`)}>
                      <ApplicantRow
                        applicant={a}
                        onDownload={handleDownloadResume}
                        onView={handleViewResume}
                        downloadingId={downloadingId}
                        viewingId={viewingId}
                        onStatusChange={handleStatusChange}
                        onOpenChat={(convId) => openChat(convId ?? null)}
                        statusLoadingId={statusUpdatingId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW: ANALYTICS ─────────────────────────────────────────────── */}
        {activeView === 'analytics' && (
          <div className="space-y-5 animate-view-enter">
            <div className="pb-2 border-b border-warm-border dark:border-warm-darkBorder">
              <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                Hiring Analytics
              </h1>
              <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm">Aggregated insights across active postings and candidate skill pools</p>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-view-enter">
              {[
                { label: 'Total Jobs',    value: jobs.length,  icon: <Briefcase size={16} className="text-warm-terracotta dark:text-warm-darkTerracotta" /> },
                { label: 'Active Jobs',   value: activeJobs,   icon: <CheckCircle size={16} className="text-[#2D7A58] dark:text-[#52C58E]" /> },
                { label: 'Total Apps',    value: totalApps,    icon: <Users size={16} className="text-warm-charcoal dark:text-warm-darkCharcoal" /> },
                { label: 'Avg Days Up',   value: `${avgDays}d`, icon: <Clock size={16} className="text-warm-muted dark:text-warm-darkMuted" /> },
              ].map(({ label, value, icon }, i) => (
                <div key={label} className={cn('wellfound-card p-4 animate-view-enter', `stagger-${i + 1}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="type-label text-warm-muted dark:text-warm-darkMuted">{label}</span>
                    <div className="p-1.5 rounded bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder">{icon}</div>
                  </div>
                  <p className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.03em' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Top required skills */}
            <div className="wellfound-card p-6 animate-view-enter stagger-2">
              <h2 className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-2 mb-5">
                <Zap size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />Top In-Demand Skills
                <span className="type-label ml-1 text-warm-muted dark:text-warm-darkMuted">across all listings</span>
              </h2>
              {analytics.topSkills.length === 0 ? (
                <p className="text-xs text-warm-muted dark:text-warm-darkMuted text-center py-4">Post jobs to visualize demand metrics</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topSkills.map(({ skill, count }, i) => {
                    const pct = Math.round((count / jobs.length) * 100);
                    return (
                      <div key={skill} className={cn('animate-view-enter', `stagger-${Math.min(i + 1, 6)}`)}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-warm-muted w-4">#{i + 1}</span>
                            <span className="text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal capitalize">{skill}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-warm-muted">{count}/{jobs.length} jobs</span>
                            <span className="text-xs font-bold text-warm-terracotta dark:text-warm-darkTerracotta">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-warm-sandTint dark:bg-warm-darkElevated rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-warm-terracotta" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Jobs performance table */}
            {jobs.length > 0 && (
              <div className="wellfound-card p-6 animate-view-enter stagger-3">
                <h2 className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />Job Pipeline Performance
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-warm-border dark:border-warm-darkBorder">
                        {['Job Title', 'Posted', 'Applicants', 'Skills', 'Status'].map(h => (
                          <th key={h} className="type-label pb-2 text-left pr-4 last:pr-0 text-warm-muted dark:text-warm-darkMuted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-border dark:divide-warm-darkBorder">
                      {jobs.map(job => (
                        <tr key={job.id} className="hover:bg-warm-sandTint/30 dark:hover:bg-warm-darkElevated/30 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-warm-charcoal dark:text-warm-darkCharcoal max-w-[160px] truncate">{job.title}</td>
                          <td className="py-3 pr-4 text-warm-muted dark:text-warm-darkMuted">{new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                          <td className="py-3 pr-4 font-bold text-warm-terracotta dark:text-warm-darkTerracotta">{job._count?.applications ?? 0}</td>
                          <td className="py-3 pr-4 text-warm-muted dark:text-warm-darkMuted">{job.requiredSkills.length} skills</td>
                          <td className="py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-semibold border',
                              job.isActive
                                ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]'
                                : 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted dark:text-warm-darkMuted border-warm-border dark:border-warm-darkBorder'
                            )}>
                              {job.isActive ? 'Active' : 'Closed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Applicant status breakdown */}
            {Object.keys(analytics.statusBreakdown).length > 0 && (
              <div className="wellfound-card p-6 animate-view-enter stagger-4">
                <h2 className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-2 mb-4">
                  <Award size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />Candidate Pipeline Status
                </h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                    <div key={status} className={cn(
                      'px-4 py-3 rounded-lg border text-center min-w-[110px]',
                      status === 'PENDING'     ? 'bg-[#FFF8E7] dark:bg-[#2C210E] border-[#FFE2A8] dark:border-[#523A15]'  :
                      status === 'SHORTLISTED' ? 'bg-[#EAF5EF] dark:bg-[#142A1E] border-[#C3E6D3] dark:border-[#1E4D34]' : 'bg-warm-sandTint dark:bg-warm-darkElevated border-warm-border dark:border-warm-darkBorder'
                    )}>
                      <p className={cn(
                        'text-2xl font-bold',
                        status === 'PENDING' ? 'text-[#A66908] dark:text-[#E8A538]' :
                        status === 'SHORTLISTED' ? 'text-[#2D7A58] dark:text-[#52C58E]' : 'text-warm-charcoal dark:text-warm-darkCharcoal'
                      )} style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>{count}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-warm-muted dark:text-warm-darkMuted mt-1">{status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW: POST A JOB ────────────────────────────────────────────── */}
        {activeView === 'post-job' && (
          <div className="space-y-5 animate-view-enter">
            <div className="pb-2 border-b border-warm-border dark:border-warm-darkBorder">
              <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                Post a New Role
              </h1>
              <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm flex items-center gap-1.5">
                <Sparkles size={13} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                Gemini AI will automatically extract technical skills and requirements from your job description
              </p>
            </div>

            <div className="wellfound-card p-6 sm:p-8 animate-view-enter stagger-1">
              <form onSubmit={e => { void handlePost(e); }} className="space-y-5 max-w-2xl">
                {/* Job Title */}
                <div>
                  <label className="type-label block mb-2 text-warm-charcoal dark:text-warm-darkCharcoal">Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Frontend Engineer (React/TypeScript)"
                    className="w-full bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2.5 text-sm text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="type-label block mb-2 text-warm-charcoal dark:text-warm-darkCharcoal">Job Description *</label>
                  <div className="relative">
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required
                      rows={8}
                      placeholder={`Describe the role, responsibilities, and qualifications.\n\nExample:\nWe are hiring a Frontend Engineer with strong React and TypeScript experience.\n\nRequired Skills: React, TypeScript, Next.js, Tailwind CSS, REST APIs\nMin CGPA: 7.0\nExperience: 1+ year`}
                      className="w-full bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2.5 text-sm text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 resize-y focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all font-mono text-xs"
                    />
                    {description.length > 0 && (
                      <span className="absolute bottom-3 right-3 text-[10px] text-warm-muted font-medium bg-white/80 dark:bg-warm-darkCard/80 px-1.5 py-0.5 rounded border border-warm-border dark:border-warm-darkBorder">
                        {description.length} chars
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-1.5 flex items-center gap-1">
                    <Sparkles size={11} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                    The clearer your description, the more accurately Gemini AI ranks matching candidate profiles.
                  </p>
                </div>

                {/* CGPA + Experience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="type-label block mb-2 text-warm-charcoal dark:text-warm-darkCharcoal">
                      Min CGPA <span className="normal-case font-normal text-warm-muted">(optional)</span>
                    </label>
                    <input
                      type="number"
                      value={minCgpa}
                      onChange={e => setMinCgpa(e.target.value)}
                      step="0.1"
                      min="0"
                      max="10"
                      placeholder="e.g. 7.5 — or leave blank"
                      className="w-full bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2.5 text-sm text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                    />
                  </div>
                  <div>
                    <label className="type-label block mb-2 text-warm-charcoal dark:text-warm-darkCharcoal">
                      Min Experience <span className="normal-case font-normal text-warm-muted">(years, optional)</span>
                    </label>
                    <input
                      type="number"
                      value={minExp}
                      onChange={e => setMinExp(e.target.value)}
                      step="0.5"
                      min="0"
                      placeholder="e.g. 1 — or leave blank"
                      className="w-full bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2.5 text-sm text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                    />
                  </div>
                </div>

                {/* AI info callout */}
                <div className="bg-warm-sandTint/50 dark:bg-warm-darkElevated/50 border border-warm-border dark:border-warm-darkBorder rounded-lg p-3.5 flex items-start gap-3">
                  <Sparkles size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warm-charcoal dark:text-warm-darkCharcoal leading-relaxed">
                    <strong>Autonomous Skill Extraction:</strong> ZingHire parses your posting in real-time, extracts key competencies, and computes instant cosine/Jaccard similarity against resumes submitted by talent.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-warm-terracotta hover:bg-warm-terracottaHover text-white text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {submitting ? 'Publishing & Parsing…' : 'Publish Role'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('dashboard')}
                    className="px-4 py-2.5 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal bg-white dark:bg-warm-darkCard text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* JD Preview Modal */}
      {jdPreviewJob && <RecruiterJDModal job={jdPreviewJob} onClose={() => setJdPreviewJob(null)} />}
    </div>
  );
}

// =============================================================================
// Shared: ApplicantRow (Wellfound Card Layout)
// =============================================================================
function ApplicantRow({
  applicant,
  onDownload,
  onView,
  downloadingId,
  viewingId,
  onStatusChange,
  onOpenChat,
  statusLoadingId,
}: {
  applicant: RealApplicant;
  onDownload: (url: string, name: string, id: string) => Promise<void>;
  onView: (url: string, id: string) => Promise<void>;
  downloadingId: string | null;
  viewingId: string | null;
  onStatusChange?: (applicantId: string, status: 'SHORTLISTED' | 'REJECTED') => Promise<void>;
  onOpenChat?: (conversationId?: string) => void;
  statusLoadingId?: string | null;
}) {
  const name  = `${applicant.student.firstName} ${applicant.student.lastName}`.trim() || applicant.student.user.email;
  const score = applicant.matchScore ?? 0;
  const isUpdatingStatus = statusLoadingId === applicant.id;

  return (
    <div className="bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-warm-terracotta/40 dark:hover:border-warm-darkTerracotta/40 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0"><CircularProgress score={score} size={48} stroke={4.5} /></div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              {name}
            </p>
            <span className={cn(
              'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
              applicant.status === 'PENDING' ? 'bg-[#FFF8E7] dark:bg-[#2C210E] text-[#A66908] dark:text-[#E8A538] border-[#FFE2A8] dark:border-[#523A15]' :
              applicant.status === 'SHORTLISTED' ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]' :
              'bg-[#FDF0ED] dark:bg-[#2D1612] text-[#B83E28] dark:text-[#E57361] border-[#F7CBC3] dark:border-[#4D221B]'
            )}>
              {applicant.status}
            </span>
          </div>
          <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-0.5">
            {applicant.student.college} · <span className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">{applicant.student.cgpa}</span> CGPA
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Shortlist & Reject Actions */}
        {onStatusChange && (
          <div className="flex items-center gap-1.5 mr-1 border-r border-warm-border dark:border-warm-darkBorder pr-2">
            {applicant.status !== 'SHORTLISTED' && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => void onStatusChange(applicant.id, 'SHORTLISTED')}
                className="px-2.5 py-1.5 bg-[#2D7A58] hover:bg-[#236045] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                title="Shortlist applicant & unlock live chat"
              >
                {isUpdatingStatus ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Shortlist
              </button>
            )}

            {applicant.status === 'SHORTLISTED' && onOpenChat && (
              <button
                onClick={() => onOpenChat(applicant.conversationId ?? undefined)}
                className="px-3 py-1.5 bg-warm-terracotta hover:bg-warm-terracottaHover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Direct 1-on-1 Live Chat"
              >
                <MessageSquare size={13} />
                Live Chat
              </button>
            )}

            {applicant.status !== 'REJECTED' && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => void onStatusChange(applicant.id, 'REJECTED')}
                className="px-2 py-1.5 bg-warm-sandTint dark:bg-warm-darkElevated hover:bg-[#FDF0ED] dark:hover:bg-[#2D1612] text-warm-muted dark:text-warm-darkMuted hover:text-[#B83E28] text-xs font-semibold rounded-lg border border-warm-border dark:border-warm-darkBorder hover:border-[#F7CBC3] transition-colors disabled:opacity-50 cursor-pointer"
                title="Reject candidate"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* View & PDF & Email actions */}
        {applicant.student.resumeUrl ? (
          <>
            <button
              disabled={viewingId === applicant.id}
              onClick={() => void onView(applicant.student.resumeUrl!, applicant.id)}
              className="px-2.5 py-1.5 bg-warm-sandTint dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal hover:bg-warm-border/50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-warm-border dark:border-warm-darkBorder disabled:opacity-50 cursor-pointer"
            >
              {viewingId === applicant.id ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
              {viewingId === applicant.id ? '…' : 'View'}
              {viewingId !== applicant.id && <ExternalLink size={9} />}
            </button>
            <button
              disabled={downloadingId === applicant.id}
              onClick={() => void onDownload(applicant.student.resumeUrl!, name, applicant.id)}
              className="px-2.5 py-1.5 bg-warm-sandTint dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal hover:bg-warm-border/50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-warm-border dark:border-warm-darkBorder disabled:opacity-50 cursor-pointer"
            >
              {downloadingId === applicant.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              {downloadingId === applicant.id ? '…' : 'PDF'}
            </button>
          </>
        ) : (
          <span className="px-2 py-1 bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted text-xs rounded border border-warm-border dark:border-warm-darkBorder">
            No Resume
          </span>
        )}
        <a
          href={`mailto:${applicant.student.user.email}`}
          className="p-1.5 text-warm-muted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated rounded-lg transition-colors"
          title={applicant.student.user.email}
        >
          <Mail size={15} />
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// RecruiterJDModal (Wellfound Style)
// =============================================================================
function RecruiterJDModal({ job, onClose }: { job: Job; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder w-full sm:max-w-2xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-slide-up overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-warm-border dark:border-warm-darkBorder flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
              {job.title}
            </h2>
            <p className="text-xs text-warm-muted dark:text-warm-darkMuted mt-0.5">
              Posted {new Date(job.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-warm-muted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-md px-2.5 py-1 text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">
              Min CGPA: <span className="text-warm-terracotta dark:text-warm-darkTerracotta font-bold ml-0.5">{job.minCgpa}</span>
            </span>
            <span className="bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-md px-2.5 py-1 text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">
              Min Experience: <span className="text-warm-terracotta dark:text-warm-darkTerracotta font-bold ml-0.5">{job.minExperience} yrs</span>
            </span>
            <span className={cn(
              'px-2.5 py-1 rounded-md text-xs font-semibold border',
              job.isActive
                ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]'
                : 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted dark:text-warm-darkMuted border-warm-border dark:border-warm-darkBorder'
            )}>
              {job.isActive ? 'Active' : 'Closed'}
            </span>
          </div>
          <div>
            <p className="type-label mb-2 text-warm-muted dark:text-warm-darkMuted">AI-Extracted Required Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map(s => (
                <span key={s} className="px-2.5 py-1 bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal text-xs font-medium rounded">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="type-label mb-3 flex items-center gap-1.5 text-warm-muted dark:text-warm-darkMuted">
              <FileText size={11} className="text-warm-terracotta dark:text-warm-darkTerracotta" />Full Job Description
            </p>
            <p className="text-xs text-warm-charcoal dark:text-warm-darkCharcoal leading-relaxed whitespace-pre-wrap font-sans">
              {job.description}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-warm-border dark:border-warm-darkBorder p-4 bg-warm-sandTint/20 dark:bg-warm-darkElevated/20">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
