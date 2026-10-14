import { useEffect, useState, useCallback } from 'react';
import { Users, Briefcase, FileText, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { cn } from '../../lib/cn';

// =============================================================================
// Types
// =============================================================================
interface Job {
  id:             string;
  title:          string;
  requiredSkills: string[];
  isActive:       boolean;
  createdAt:      string;
  _count?:        { applications: number };
  recruiter?: {
    recruiterProfile?: { companyName: string; designation: string } | null;
  };
}

interface AdminStats {
  totalStudents:      number;
  totalApplications:  number;
  activeJobCount:     number;
}

export default function AdminDashboard() {
  const [jobs,       setJobs]       = useState<Job[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: Job[] }>('/jobs');
      setJobs(data.data ?? []);
    } catch {
      toast.error('Failed to load system activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get<{ data: AdminStats }>('/jobs/admin-stats');
      setAdminStats(data.data);
    } catch {
      toast.error('Failed to load platform statistics.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchJobs(), fetchStats()]);
  }, [fetchJobs, fetchStats]);

  useEffect(() => {
    void fetchJobs();
    void fetchStats();
  }, [fetchJobs, fetchStats]);

  const stats = [
    {
      label:   'Total Registered Students',
      value:   statsLoading ? '…' : (adminStats?.totalStudents ?? 0).toLocaleString(),
      trend:   'Platform talent',
      icon:    <Users size={18} className="text-warm-terracotta dark:text-warm-darkTerracotta" />,
      sub:     'Active student profiles',
    },
    {
      label:   'Active Job Postings',
      value:   statsLoading ? '…' : (adminStats?.activeJobCount ?? 0).toLocaleString(),
      trend:   'Live now',
      icon:    <Briefcase size={18} className="text-[#2D7A58] dark:text-[#52C58E]" />,
      sub:     'Across all verified recruiters',
    },
    {
      label:   'Applications Processed',
      value:   statsLoading ? '…' : (adminStats?.totalApplications ?? 0).toLocaleString(),
      trend:   'AI-scored pipeline',
      icon:    <FileText size={18} className="text-warm-charcoal dark:text-warm-darkCharcoal" />,
      sub:     'Submitted across marketplace',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-warm-border dark:border-warm-darkBorder">
        <div>
          <h1 className="text-2xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
            System Administration
          </h1>
          <p className="text-warm-muted dark:text-warm-darkMuted mt-0.5 text-sm">
            Placement Cell & Marketplace Activity Monitoring
          </p>
        </div>
        <button
          onClick={() => void handleRefreshAll()}
          disabled={loading || statsLoading}
          className="p-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
          aria-label="Refresh metrics"
        >
          <RefreshCw size={15} className={(loading || statsLoading) ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Wellfound Stats Grid — 3 cols ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="wellfound-card p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-warm-sandTint dark:bg-warm-darkElevated rounded-lg" />
                <div className="w-16 h-5 bg-warm-sandTint dark:bg-warm-darkElevated rounded-full" />
              </div>
              <div className="w-20 h-8 bg-warm-sandTint dark:bg-warm-darkElevated rounded mb-2" />
              <div className="w-32 h-3 bg-warm-sandTint/60 dark:bg-warm-darkElevated/60 rounded" />
            </div>
          ))
        ) : (
          stats.map(({ label, value, trend, icon, sub }) => (
            <div key={label} className="wellfound-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder">
                  {icon}
                </div>
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border border-[#C3E6D3] dark:border-[#1E4D34]">
                  <TrendingUp size={10} />
                  {trend}
                </span>
              </div>
              <p className="text-3xl font-bold text-warm-charcoal dark:text-warm-darkCharcoal tabular-nums" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', letterSpacing: '-0.03em' }}>
                {value}
              </p>
              <div className="mt-2 flex flex-col">
                <p className="text-warm-charcoal dark:text-warm-darkCharcoal text-xs font-semibold">{label}</p>
                <p className="text-warm-muted dark:text-warm-darkMuted text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── System Activity Table ────────────────────────────────────────── */}
      <div className="wellfound-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border dark:border-warm-darkBorder bg-warm-sandTint/20 dark:bg-warm-darkElevated/20">
          <h2 className="text-sm font-bold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-2">
            <Briefcase size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
            Marketplace Postings & Activity
          </h2>
          <span className="text-xs text-warm-muted dark:text-warm-darkMuted">
            {jobs.length} total listings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-warm-sandTint/40 dark:bg-warm-darkElevated/40 border-b border-warm-border dark:border-warm-darkBorder">
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Job Title</th>
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Company / Recruiter</th>
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Required Skills</th>
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Applicants</th>
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-3 font-bold text-warm-muted dark:text-warm-darkMuted uppercase tracking-wider text-[10px]">Date Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border dark:divide-warm-darkBorder">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2 text-warm-terracotta" />
                    <p className="text-warm-muted text-xs">Loading marketplace activity…</p>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="w-10 h-10 bg-warm-sandTint dark:bg-warm-darkElevated rounded-full flex items-center justify-center mx-auto mb-2 border border-warm-border dark:border-warm-darkBorder">
                      <Briefcase size={18} className="text-warm-muted" />
                    </div>
                    <p className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal text-sm">No postings in the system</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-warm-sandTint/30 dark:hover:bg-warm-darkElevated/30 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-xs">{job.title}</p>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {job.recruiter?.recruiterProfile ? (
                        <>
                          <span className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal text-xs">
                            {job.recruiter.recruiterProfile.companyName}
                          </span>
                          <span className="text-warm-muted block text-[11px] mt-0.5">
                            {job.recruiter.recruiterProfile.designation}
                          </span>
                        </>
                      ) : (
                        <span className="text-warm-muted italic text-xs">Direct Listing</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-warm-sandTint dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal text-[11px] rounded font-medium border border-warm-border dark:border-warm-darkBorder">
                            {s}
                          </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                          <span className="text-warm-muted text-[11px] font-medium self-center">
                            +{job.requiredSkills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-warm-terracotta dark:text-warm-darkTerracotta text-xs">{job._count?.applications ?? 0}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        job.isActive
                          ? 'bg-[#EAF5EF] dark:bg-[#142A1E] text-[#24704B] dark:text-[#52C58E] border-[#C3E6D3] dark:border-[#1E4D34]'
                          : 'bg-warm-sandTint dark:bg-warm-darkElevated text-warm-muted dark:text-warm-darkMuted border-warm-border dark:border-warm-darkBorder',
                      )}>
                        {job.isActive ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-warm-muted text-xs">
                      {new Date(job.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
