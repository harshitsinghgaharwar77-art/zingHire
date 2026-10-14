import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UploadCloud, FileText, Zap, Trophy, TrendingUp,
  Briefcase, CheckCircle, Loader2, RefreshCw,
  Info, GraduationCap, Building2, X, BookOpen, Award,
  Target, LayoutDashboard, BarChart2, Lightbulb,
  Star, ExternalLink, AlertCircle, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { getSocket } from '../../lib/socket';
import CircularProgress from '../../components/CircularProgress';
import ResumeAnalyzing from '../../components/ResumeAnalyzing';
import NotificationBell, { playNotificationChime } from '../../components/NotificationBell';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/cn';

// =============================================================================
// Types
// =============================================================================
interface StudentProfile {
  firstName:       string;
  lastName:        string;
  college:         string;
  branch?:         string | null;
  cgpa:            number;
  experienceYears: number;
  avatarUrl?:      string | null;
  resumeUrl:       string | null;
  parsedSkills:    string[];
}


interface MatchedJob {
  matchScore: number;
  hasApplied: boolean;
  applicationStatus?: string | null;
  conversationId?: string | null;
  job: {
    id:             string;
    title:          string;
    description:    string;
    requiredSkills: string[];
    minCgpa:        number;
    minExperience:  number;
    isActive?:      boolean;
    createdAt?:     string;
    recruiter?: {
      recruiterProfile?: { companyName: string; designation: string } | null;
    };
  };
}

type ActiveView = 'dashboard' | 'matches' | 'skill-development' | 'documents' | 'analysis';

// =============================================================================
// Frontend Skill Alias Map — mirrors backend matcher.service.ts
// =============================================================================
const FRONTEND_SKILL_ALIASES: Record<string, string> = {
  'dsa': 'data structures and algorithms', 'data structures': 'data structures and algorithms',
  'data structure': 'data structures and algorithms', 'algorithms': 'data structures and algorithms',
  'ds & algorithms': 'data structures and algorithms', 'oop': 'object-oriented programming',
  'oops': 'object-oriented programming', 'object oriented programming': 'object-oriented programming',
  'object-oriented': 'object-oriented programming', 'os': 'operating system',
  'operating systems': 'operating system', 'dbms': 'database management system',
  'database management': 'database management system', 'cn': 'computer networks',
  'computer networking': 'computer networks', 'networking': 'computer networks',
  'ml': 'machine learning', 'dl': 'deep learning', 'ai': 'artificial intelligence',
  'nlp': 'natural language processing', 'cv': 'computer vision', 'computer-vision': 'computer vision',
  'cicd': 'ci cd', 'ci/cd': 'ci cd', 'restapi': 'rest api', 'rest apis': 'rest api',
  'restful': 'rest api', 'restful api': 'rest api', 'restful apis': 'rest api', 'rest': 'rest api',
  'js': 'javascript', 'ts': 'typescript', 'reactjs': 'react', 'react.js': 'react',
  'vuejs': 'vue.js', 'vue': 'vue.js', 'angularjs': 'angular', 'nodejs': 'node.js',
  'node js': 'node.js', 'nextjs': 'next.js', 'next js': 'next.js', 'expressjs': 'express',
  'express.js': 'express', 'postgres': 'postgresql', 'mongo': 'mongodb',
  'gcp': 'google cloud platform', 'google cloud': 'google cloud platform',
  'k8s': 'kubernetes', 'kube': 'kubernetes', 'sklearn': 'scikit-learn',
  'scikit learn': 'scikit-learn', 'tf': 'tensorflow', 'torch': 'pytorch',
};

function normalizeSkillFrontend(s: string): string {
  const lower = s.toLowerCase().trim();
  return FRONTEND_SKILL_ALIASES[lower] ?? lower;
}

// Cloudinary raw resource URLs are served as application/octet-stream — the
// browser cannot render them as PDF natively. Wrapping with Google Docs Viewer
// forces inline PDF rendering in any browser without any server changes.
function getViewableResumeUrl(url: string): string {
  if (!url) return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

function analyzeSkillGap(required: string[], studentSkills: string[]) {
  const studentNormalized = new Set(studentSkills.map(s => normalizeSkillFrontend(s)));
  const matched: string[] = [];
  const missing: string[] = [];
  required.forEach(skill => {
    (studentNormalized.has(normalizeSkillFrontend(skill)) ? matched : missing).push(skill);
  });
  return { matched, missing };
}

// =============================================================================
// Skill Advice Map
// =============================================================================
const SKILL_ADVICE: Record<string, string> = {
  'data structures and algorithms': 'Practice on LeetCode — start with NeetCode 150 roadmap. Target 2–3 problems/day.',
  'react': 'Build a portfolio project: todo-app → weather dashboard → e-commerce. Official docs + Scrimba React cover 90% of interviews.',
  'node.js': 'Build a REST API with Express + MongoDB. Add JWT authentication to stand out.',
  'rest api': 'Create a CRUD API with Node.js + Express. Document with Postman/Swagger.',
  'express': 'Build 2–3 REST APIs. Middleware, routing, and error handling are the key interview topics.',
  'python': 'Complete Python basics on freeCodeCamp, then build a web scraper or data analysis script with pandas.',
  'machine learning': 'Start with Andrew Ng\'s ML Specialization on Coursera. Build a classification project with scikit-learn.',
  'deep learning': 'Complete fast.ai\'s Practical Deep Learning. Build an image classifier using PyTorch or TensorFlow.',
  'docker': 'Complete Docker\'s official "Get Started" guide (2 hrs). Containerize one of your existing projects.',
  'kubernetes': 'After Docker, do the official Kubernetes Basics tutorial. Focus on Pods, Services, and Deployments.',
  'ci cd': 'Set up a GitHub Actions pipeline: lint → test → build. This is a top hiring differentiator.',
  'sql': 'Complete SQLZoo or Mode Analytics SQL Tutorial. Practice JOINs, GROUP BY, and window functions.',
  'postgresql': 'Install Postgres locally, design a schema for a real project, practice complex queries and indexing.',
  'mongodb': 'Build a CRUD app with Mongoose + Express. Understand schema design and aggregation pipelines.',
  'typescript': 'Convert one of your JavaScript projects to TypeScript. Focus on interfaces, generics, and strict mode.',
  'javascript': 'Master async/await, closures, prototypes, and the event loop.',
  'java': 'Practice OOP design patterns (Singleton, Factory, Observer). These appear in almost every Java interview.',
  'spring': 'Build a Spring Boot REST API with JPA/Hibernate. Add Spring Security for authentication.',
  'aws': 'Get the AWS Cloud Practitioner certification. Set up an EC2 + S3 project.',
  'google cloud platform': 'Complete Google Cloud Skills Boost free labs. Build a basic Cloud Run deployment.',
  'system design': 'Study Grokking the System Design Interview. Practice designing URL shortener and Twitter feed.',
  'object-oriented programming': 'Study the SOLID principles and implement design patterns in your primary language.',
  'git': 'Practice branching strategies (GitFlow), pull requests, and conflict resolution.',
  'computer networks': 'Study OSI model, TCP/IP, HTTP/HTTPS, DNS, and sockets.',
  'operating system': 'Focus on process management, memory management, deadlocks, and threading.',
  'database management system': 'Study normalization (1NF–3NF–BCNF), ACID properties, transactions, and indexing.',
  'tensorflow': 'Complete TensorFlow\'s official tutorials. Build a CNN for image classification.',
  'pytorch': 'Complete fast.ai\'s PyTorch course. Build a custom neural network from scratch.',
  'scikit-learn': 'Build end-to-end ML pipelines: preprocessing → training → evaluation → tuning.',
  'next.js': 'Build a full-stack app using Next.js App Router with server components and API routes.',
  'graphql': 'Add a GraphQL API using Apollo Server. Compare REST vs GraphQL in your project README.',
  'redis': 'Implement caching and session management with Redis in a Node.js app.',
};

// =============================================================================
// SVG Radar Chart
// =============================================================================
function RadarChart({ values, size = 180 }: { values: { label: string; value: number }[]; size?: number }) {
  const center = size / 2;
  const maxR   = center - 28;
  const n      = values.length;

  const toXY = (i: number, pct: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return { x: center + pct * maxR * Math.cos(angle), y: center + pct * maxR * Math.sin(angle) };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = values.map((v, i) => toXY(i, v.value / 100));
  const polygon    = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Grid rings */}
      {gridLevels.map(level => {
        const pts = values.map((_, i) => { const p = toXY(i, level); return `${p.x},${p.y}`; }).join(' ');
        return <polygon key={level} points={pts} fill="none" stroke="#E9DFD1" strokeWidth="1" />;
      })}
      {/* Axis lines */}
      {values.map((_, i) => {
        const p = toXY(i, 1);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#E9DFD1" strokeWidth="1" />;
      })}
      {/* Data fill */}
      <polygon points={polygon} fill="rgba(184,92,56,0.18)" stroke="#B85C38" strokeWidth="2" className="radar-polygon" />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#B85C38" stroke="white" strokeWidth="1.5" />
      ))}
      {/* Labels */}
      {values.map((v, i) => {
        const lp = toXY(i, 1.22);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fontWeight="600" fill="#74685C" fontFamily="Inter, sans-serif">
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}

// =============================================================================
// StudentDashboard
// =============================================================================
export default function StudentDashboard() {

  // ── State ──────────────────────────────────────────────────────────────────
  const [profile,        setProfile]        = useState<StudentProfile | null>(null);
  const [matches,        setMatches]        = useState<MatchedJob[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [isAnalyzing,    setIsAnalyzing]    = useState(false); // shows ResumeAnalyzing overlay
  const [applying,       setApplying]       = useState<string | null>(null);
  const [appliedJobs,    setAppliedJobs]    = useState<Set<string>>(new Set());
  const [dragOver,       setDragOver]       = useState(false);
  const [selectedJob,    setSelectedJob]    = useState<MatchedJob | null>(null);
  const [activeView,     setActiveView]     = useState<ActiveView>('dashboard');
  const [matchFilter,    setMatchFilter]    = useState<'all' | 'eligible' | 'applied'>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  // Real-time Chat state
  const openChat = useChatStore((s) => s.openChat);
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();


  useEffect(() => {
    const qConvId = searchParams.get('conversationId');
    if (qConvId) {
      openChat(qConvId);
    }
    const qView = searchParams.get('view');
    if (qView && ['dashboard', 'matches', 'skill-development', 'documents', 'analysis'].includes(qView)) {
      setActiveView(qView as any);
    }
  }, [searchParams, openChat]);

  useEffect(() => {
    const handleNotificationEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ linkUrl?: string }>;
      const linkUrl = customEvent.detail?.linkUrl;
      if (!linkUrl) return;

      try {
        const url = new URL(linkUrl, window.location.origin);
        const cId = url.searchParams.get('conversationId');
        if (cId) openChat(cId);
        const v = url.searchParams.get('view');
        if (v && ['dashboard', 'matches', 'skill-development', 'documents', 'analysis'].includes(v)) {
          setActiveView(v as any);
        }
      } catch {
        // fallback ignore
      }
    };

    window.addEventListener('zinghire:notification-click', handleNotificationEvent);
    return () => window.removeEventListener('zinghire:notification-click', handleNotificationEvent);
  }, [openChat]);


  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: StudentProfile }>('/student/profile');
      setProfile(data.data);
    } catch { /* 404 = not yet created */ } finally { setLoadingProfile(false); }
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const { data } = await api.get<{ data: MatchedJob[] }>('/eligibility/matches');
      const fetched  = data.data ?? [];
      setMatches(fetched);
      setAppliedJobs(new Set(fetched.filter(m => m.hasApplied).map(m => m.job.id)));
    } catch { /* silently fail */ } finally { setLoadingMatches(false); }
  }, []);

  // ── WebSocket: resume:parsed / resume:parse-failed ─────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onParsed = (data: {
      parsedSkills:    string[];
      experienceYears: number;
      cgpa:            number;
      college:         string;
      resumeUrl:       string;
      skillCount:      number;
    }) => {
      console.log('[Dashboard] Received resume:parsed via WebSocket:', data);
      setProfile(prev => prev ? {
        ...prev,
        parsedSkills:    data.parsedSkills,
        experienceYears: data.experienceYears,
        cgpa:            data.cgpa,
        college:         data.college || prev.college,
        resumeUrl:       data.resumeUrl,
      } : prev);
      setIsAnalyzing(false);
      toast.success(`✨ AI extracted ${data.skillCount} skills from your resume!`, { duration: 5000 });
      void fetchMatches();
      void fetchProfile();
    };

    const onFailed = (data: { message: string }) => {
      console.warn('[Dashboard] Received resume:parse-failed via WebSocket:', data);
      setIsAnalyzing(false);
      setUploading(false);
      toast.error(data.message ?? 'AI parsing failed. Please try again.');
    };

    const onStatusChanged = (data: { applicationId: string; jobTitle: string; status: string; conversationId?: string }) => {
      console.log('[Dashboard] Received application:status_changed via WebSocket:', data);
      if (data.status === 'SHORTLISTED') {
        toast.success(`🎉 Congratulations! You have been Shortlisted for "${data.jobTitle}"! Live recruiter chat is now unlocked.`, { duration: 8000 });
        playNotificationChime();
      } else if (data.status === 'REJECTED') {
        toast(`Application update: Your application for "${data.jobTitle}" has been reviewed.`, { duration: 5000 });
      }
      void fetchMatches();
      void fetchProfile();
    };

    socket.on('resume:parsed',       onParsed);
    socket.on('resume:parse-failed', onFailed);
    socket.on('application:status_changed', onStatusChanged);

    return () => {
      socket.off('resume:parsed',       onParsed);
      socket.off('resume:parse-failed', onFailed);
      socket.off('application:status_changed', onStatusChanged);
    };
  }, [fetchMatches, fetchProfile]);

  // ── Polling Fallback during isAnalyzing ─────────────────────────────────────
  // If the WebSocket event is missed, dropped, or blocked by a proxy,
  // this polling safety net ensures the user NEVER gets stuck at 92%.
  useEffect(() => {
    if (!isAnalyzing) return;

    let pollCount = 0;
    const maxPolls = 8; // 8 * 3s = 24 seconds max

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const { data } = await api.get<{ data: StudentProfile }>('/student/profile');
        if (data.data?.parsedSkills && data.data.parsedSkills.length > 0) {
          console.log('[Dashboard Polling Fallback] Detected parsed skills in DB:', data.data.parsedSkills.length);
          setProfile(data.data);
          setIsAnalyzing(false);
          toast.success(`✨ AI extracted ${data.data.parsedSkills.length} skills from your resume!`, { duration: 5000 });
          void fetchMatches();
          clearInterval(interval);
          return;
        }
      } catch {
        // Silently retry
      }

      if (pollCount >= maxPolls) {
        console.log('[Dashboard Polling Fallback] Max attempts reached, auto-closing overlay');
        setIsAnalyzing(false);
        void fetchProfile();
        void fetchMatches();
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAnalyzing, fetchMatches, fetchProfile]);

  useEffect(() => { void fetchProfile(); void fetchMatches(); }, [fetchProfile, fetchMatches]);

  useEffect(() => {
    const handleProfileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl?: string; branch?: string; college?: string }>;
      if (customEvent.detail) {
        setProfile((prev) => prev ? {
          ...prev,
          ...(customEvent.detail.avatarUrl !== undefined && { avatarUrl: customEvent.detail.avatarUrl }),
          ...(customEvent.detail.branch !== undefined && { branch: customEvent.detail.branch }),
          ...(customEvent.detail.college !== undefined && { college: customEvent.detail.college }),
        } : prev);
      }
      void fetchProfile();
    };
    window.addEventListener('profile:updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile:updated', handleProfileUpdated);
    };
  }, [fetchProfile]);


  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('File size must be under 5 MB.'); return; }
    setUploading(true);
    const form = new FormData();
    form.append('resume', file);
    try {
      // Backend now returns 202 Accepted immediately — the real work is in the background worker
      await api.post('/student/resume', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploading(false);
      setIsAnalyzing(true); // show the premium analyzing overlay
      toast('📤 Resume received! AI is now analysing your skills…', { icon: '🤖', duration: 4000 });
      // Result will arrive via socket event 'resume:parsed' — no polling needed
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed.');
      setUploading(false);
    }
  };

  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplying(jobId);
    try {
      await api.post(`/eligibility/apply/${jobId}`);
      toast.success(`Successfully applied to "${jobTitle}"! 🎉`);
      setAppliedJobs(prev => new Set(prev).add(jobId));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Application failed.');
    } finally { setApplying(null); }
  };

  // ── Computed: Skill Mastery ────────────────────────────────────────────────
  const skillMastery = useMemo(() => {
    if (!profile?.parsedSkills.length) return [];
    return profile.parsedSkills.slice(0, 7).map(skill => {
      const normalized = normalizeSkillFrontend(skill);
      const demandCount = matches.filter(m => m.job.requiredSkills.some(s => normalizeSkillFrontend(s) === normalized)).length;
      const pct = matches.length > 0 ? Math.max(8, Math.round((demandCount / matches.length) * 100)) : 70;
      return { skill, pct };
    }).sort((a, b) => b.pct - a.pct);
  }, [profile, matches]);

  // ── Computed: Skill Development data ──────────────────────────────────────
  const skillDevData = useMemo(() => {
    if (!profile || !matches.length) return { missing: [], have: [] };
    const missingFreq: Record<string, number> = {};
    matches.forEach(m => {
      analyzeSkillGap(m.job.requiredSkills, profile.parsedSkills).missing.forEach(s => {
        const k = s.toLowerCase();
        missingFreq[k] = (missingFreq[k] ?? 0) + 1;
      });
    });
    const missing = Object.entries(missingFreq)
      .map(([skill, count]) => ({
        skill, count,
        jobsPct: Math.round((count / matches.length) * 100),
        advice: SKILL_ADVICE[skill] ?? `Build a hands-on project demonstrating ${skill} and document it on GitHub.`,
      }))
      .sort((a, b) => b.count - a.count);
    return { missing };
  }, [profile, matches]);

  // ── Computed: Analysis data ────────────────────────────────────────────────
  const analysisData = useMemo(() => {
    if (!profile) return null;
    const totalRequired = matches.reduce((s, m) => s + m.job.requiredSkills.length, 0);
    const totalMatched  = matches.reduce((s, m) => s + analyzeSkillGap(m.job.requiredSkills, profile.parsedSkills).matched.length, 0);
    const skillMatchPct = totalRequired > 0 ? Math.round((totalMatched / totalRequired) * 100) : 0;
    const cgpaPct       = Math.min(100, Math.round((profile.cgpa / 10) * 100));
    const maxExpReq     = matches.length > 0 ? Math.max(...matches.map(m => m.job.minExperience)) : 1;
    const expPct        = maxExpReq > 0 ? Math.min(100, Math.round(((profile.experienceYears + 0.5) / Math.max(maxExpReq, 1)) * 100)) : 75;
    const appliedCount  = appliedJobs.size;
    const topScore      = matches[0]?.matchScore ?? 0;
    const overallScore  = Math.round((skillMatchPct * 0.5) + (cgpaPct * 0.3) + (expPct * 0.2));

    const rec = overallScore >= 75
      ? 'Excellent profile. You are highly competitive for most available roles. Apply confidently.'
      : overallScore >= 55
      ? 'Strong profile. Focus on 2–3 missing skills to unlock significantly more opportunities.'
      : overallScore >= 35
      ? 'Developing profile. Prioritize building the top missing skills shown in Skill Development.'
      : 'Early stage. Upload an updated resume with more technical skills to improve match rate.';

    return { skillMatchPct, cgpaPct, expPct, appliedCount, topScore, overallScore, recommendation: rec,
      appliedJobs: matches.filter(m => appliedJobs.has(m.job.id)) };
  }, [profile, matches, appliedJobs]);

  const displayName   = profile ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`.trim() : 'Student';
  const eligibleCount = matches.filter(m => m.matchScore >= 50).length;

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'eligible') return matches.filter(m => m.matchScore >= 50);
    if (matchFilter === 'applied')  return matches.filter(m => appliedJobs.has(m.job.id));
    return matches;
  }, [matches, matchFilter, appliedJobs]);

  // ── Sidebar nav config ─────────────────────────────────────────────────────
  const navItems: { view: ActiveView; icon: React.ReactNode; label: string }[] = [
    { view: 'dashboard',        icon: <LayoutDashboard size={15} />, label: 'Dashboard'         },
    { view: 'matches',          icon: <Briefcase size={15} />,       label: 'Job Matches'        },
    { view: 'skill-development',icon: <Target size={15} />,          label: 'Skill Development'  },
    { view: 'documents',        icon: <FileText size={15} />,        label: 'Documents'          },
    { view: 'analysis',         icon: <BarChart2 size={15} />,       label: 'My Analysis'        },
  ];

  return (
    <div className="flex gap-6 items-start w-full">

      {/* AI Analyzing overlay — shown while BullMQ worker processes the resume */}
      {isAnalyzing && (
        <ResumeAnalyzing
          onComplete={() => {
            setIsAnalyzing(false);
            void fetchProfile();
            void fetchMatches();
          }}
          onDismiss={() => {
            setIsAnalyzing(false);
            void fetchProfile();
            void fetchMatches();
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <aside className="w-56 shrink-0 hidden lg:flex flex-col gap-3 sticky top-24 self-start animate-slide-in-left">

        {/* Profile card */}
        <div className="enterprise-card p-5 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#B85C38] dark:bg-[#D9734E]
                          flex items-center justify-center shadow-xs ring-4 ring-[#FAEEE9] dark:ring-[#2C241D] overflow-hidden">
            {(profile?.avatarUrl || user?.avatarUrl) ? (
              <img 
                src={profile?.avatarUrl || user?.avatarUrl || ''} 
                alt={displayName} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {profile?.firstName?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          {loadingProfile ? (
            <div className="space-y-2 w-full">
              <div className="skeleton h-3.5 w-24 mx-auto" />
              <div className="skeleton h-3 w-32 mx-auto" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6]">{displayName}</p>
                {profile?.branch && (
                  <p className="text-[11px] font-semibold text-[#B85C38] dark:text-[#D9734E] mt-0.5 truncate max-w-[180px]" title={profile.branch}>
                    {profile.branch}
                  </p>
                )}
                <p className="text-xs text-[#74685C] dark:text-[#A89A8A] mt-0.5 truncate max-w-[180px]">{profile?.college ?? 'College not set'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="px-2.5 py-0.5 bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] border border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)] text-[#B85C38] dark:text-[#D9734E] text-xs font-semibold rounded-md">
                  CGPA {profile?.cgpa.toFixed(1) ?? '—'}
                </span>

                <span className="px-2 py-0.5 bg-[#F3EBDD] dark:bg-[#2C241D] text-[#74685C] dark:text-[#D8CEBF] text-xs font-medium rounded-md border border-[#E9DFD1] dark:border-[#382E25]">
                  {profile?.experienceYears ?? 0} yrs
                </span>
              </div>
              <div className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border',
                profile?.resumeUrl ? 'bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)]'
                                   : 'bg-[#FDEEED] dark:bg-[rgba(194,65,52,0.22)] text-[#C24134] dark:text-[#F07167] border-[#F6BDB7] dark:border-[rgba(240,113,103,0.35)]',
              )}>
                {profile?.resumeUrl ? <><CheckCircle size={12} /> Resume Active</> : <><UploadCloud size={12} /> No Resume</>}
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <div className="enterprise-card p-2 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider px-3 py-1.5">Navigation</p>
          {navItems.map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn('nav-item w-full text-left', activeView === view && 'active')}
            >
              <span className="nav-icon text-[#74685C] dark:text-[#A89A8A]">{icon}</span>
              <span>{label}</span>
              {view === 'matches' && matches.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] px-1.5 py-0.5 rounded-md">
                  {matches.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Upload CTA */}
        <button
          onClick={() => { setActiveView('documents'); fileRef.current?.click(); }}
          disabled={uploading}
          className="btn-primary w-full text-xs !py-2.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {uploading ? 'Parsing…' : profile?.resumeUrl ? 'Update Resume' : 'Upload Resume'}
        </button>

        <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }} />
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT — view switcher
      ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0">

        {/* ─── VIEW: DASHBOARD ─────────────────────────────────────────────── */}
        {activeView === 'dashboard' && (
          <div className="space-y-5 animate-view-enter">
            {/* Header */}
            <div className="section-header">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-black text-[#30291F] dark:text-[#F6EFE6]">Candidate Talent Hub</h1>
                  <p className="text-[#74685C] dark:text-[#B0A294] mt-0.5 text-sm">Welcome back, <span className="font-semibold text-[#30291F] dark:text-[#F6EFE6]">{displayName}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openChat(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E9DFD1] dark:border-[#382E25] bg-white dark:bg-[#221C16] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] text-[#30291F] dark:text-[#F6EFE6] text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare size={14} className="text-[#B85C38] dark:text-[#D9734E]" />
                    <span>Live Chat</span>
                  </button>
                  <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />
                  {profile && (
                    <div className="flex items-center gap-1.5 bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] rounded-lg px-2.5 py-1">
                      <CheckCircle size={13} className="text-[#2D7A58] dark:text-[#52B788]" />
                      <span className="text-xs font-semibold text-[#2D7A58] dark:text-[#52B788]">Profile Active</span>
                    </div>
                  )}
                  <button onClick={() => void fetchMatches()} disabled={loadingMatches}
                    className="p-1.5 rounded-lg text-[#74685C] hover:text-[#B85C38] dark:hover:text-[#D9734E] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors cursor-pointer"
                    title="Refresh matches">
                    <RefreshCw size={14} className={loadingMatches ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {loadingProfile ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="stat-card"><div className="skeleton h-3.5 w-20 mb-4" /><div className="skeleton h-8 w-14 mb-1" /><div className="skeleton h-3 w-24" /></div>
              )) : [
                { label: 'Skills Parsed', value: profile?.parsedSkills.length ?? 0, sub: 'from your resume', icon: <Zap size={18} className="text-[#B85C38] dark:text-[#D9734E]" />, bg: 'bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)]' },
                { label: 'Job Matches',   value: matches.length,  sub: `${eligibleCount} eligible`, icon: <Trophy size={18} className="text-[#2D7A58] dark:text-[#52B788]" />, bg: 'bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)]' },
                { label: 'Top Score',     value: matches[0] ? `${matches[0].matchScore}%` : '—', sub: 'best AI match', icon: <TrendingUp size={18} className="text-[#B57324] dark:text-[#E49D46]" />, bg: 'bg-[#FEF6EB] dark:bg-[rgba(181,115,36,0.22)]' },
              ].map(({ label, value, sub, icon, bg }, i) => (
                <div key={label} className={cn('stat-card animate-view-enter', i === 0 && 'stagger-1', i === 1 && 'stagger-2', i === 2 && 'stagger-3')}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wide">{label}</span>
                    <div className={cn('p-2 rounded-lg', bg)}>{icon}</div>
                  </div>
                  <p className="text-3xl font-black text-[#30291F] dark:text-[#F6EFE6] mb-0.5">{value}</p>
                  <p className="text-xs text-[#74685C] dark:text-[#A89A8A] font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* Profile overview + Skill mastery */}
            {profile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="enterprise-card p-5 animate-view-enter stagger-2">
                  <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-[#B85C38] dark:text-[#D9734E]" />Profile Overview
                  </h2>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'CGPA',    value: profile.cgpa.toFixed(1),          accent: 'text-[#B85C38] dark:text-[#D9734E]' },
                      { label: 'Exp.',    value: `${profile.experienceYears} yrs`,  accent: 'text-[#30291F] dark:text-[#F6EFE6]' },
                      { label: 'Resume',  value: profile.resumeUrl ? 'Active ✓' : 'Missing ✗', accent: profile.resumeUrl ? 'text-[#2D7A58] dark:text-[#52B788]' : 'text-[#C24134] dark:text-[#F07167]' },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="bg-[#FAF6EF] dark:bg-[#2C241D] rounded-xl p-3 border border-[#E9DFD1] dark:border-[#382E25] text-center">
                        <p className="text-[10px] text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-1 font-semibold">{label}</p>
                        <p className={cn('text-sm font-black truncate', accent)}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#FAF6EF] dark:bg-[#2C241D] rounded-xl p-3 border border-[#E9DFD1] dark:border-[#382E25] mb-4">
                    <p className="text-[10px] text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-0.5 font-semibold">College & Stream</p>
                    <p className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] truncate">{profile.college}</p>
                    {profile.branch && (
                      <p className="text-xs font-semibold text-[#B85C38] dark:text-[#D9734E] truncate mt-0.5">{profile.branch}</p>
                    )}
                  </div>

                  {profile.parsedSkills.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-2 font-bold flex items-center gap-1"><Zap size={10} className="text-[#B85C38] dark:text-[#D9734E]" />Parsed Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.parsedSkills.slice(0, 12).map(skill => (
                          <span key={skill} className="px-2 py-0.5 bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] border border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)] text-[#B85C38] dark:text-[#D9734E] text-[11px] font-semibold rounded-md">{skill}</span>
                        ))}
                        {profile.parsedSkills.length > 12 && <span className="text-xs text-[#74685C] dark:text-[#A89A8A] font-medium self-center">+{profile.parsedSkills.length - 12} more</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Skill Mastery */}
                <div className="enterprise-card p-5 animate-view-enter stagger-3">
                  <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <BarChart2 size={13} className="text-[#B85C38] dark:text-[#D9734E]" />Skill Market Demand
                  </h2>
                  <p className="text-[10px] text-[#74685C] dark:text-[#A89A8A] mb-4">% of active roles requiring your skills</p>
                  {skillMastery.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-28 text-center">
                      <UploadCloud size={28} className="text-[#74685C] dark:text-[#A89A8A] mb-2" /><p className="text-sm text-[#74685C] dark:text-[#A89A8A]">Upload resume to see skill demand</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {skillMastery.map(({ skill, pct }, i) => (
                        <div key={skill} className={cn('animate-view-enter', `stagger-${Math.min(i + 1, 6)}`)}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-[#30291F] dark:text-[#F6EFE6] capitalize truncate max-w-[70%]">{skill}</span>
                            <span className="text-xs font-bold text-[#B85C38] dark:text-[#D9734E] ml-2">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#B85C38] dark:bg-[#D9734E] skill-bar-fill"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick match preview */}
            <div className="enterprise-card p-6 animate-view-enter stagger-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] flex items-center gap-2">
                  <Briefcase size={15} className="text-[#B85C38] dark:text-[#D9734E]" />Job Match Feed
                  {matches.length > 0 && <span className="ml-1 px-2 py-0.5 bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] rounded-full text-xs font-bold">{matches.length}</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#B85C38] dark:text-[#D9734E] bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] border border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)] px-2 py-0.5 rounded-md uppercase tracking-wide">AI Match</span>
                  {matches.length > 3 && (
                    <button onClick={() => setActiveView('matches')} className="text-xs text-[#B85C38] dark:text-[#D9734E] font-semibold hover:underline underline-offset-2 cursor-pointer">View All →</button>
                  )}
                </div>
              </div>
              <JobMatchList
                matches={matches.slice(0, 3)}
                profile={profile}
                loadingMatches={loadingMatches}
                appliedJobs={appliedJobs}
                applying={applying}
                onApply={handleApply}
                onViewDetails={setSelectedJob}
                onOpenChat={(convId) => openChat(convId ?? null)}
              />
            </div>
          </div>
        )}

        {/* ─── VIEW: JOB MATCHES ───────────────────────────────────────────── */}
        {activeView === 'matches' && (
          <div className="space-y-5 animate-view-enter">
            <div className="section-header">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-black text-[#30291F] dark:text-[#F6EFE6]">Job Discovery & Matches</h1>
                  <p className="text-[#74685C] dark:text-[#B0A294] mt-0.5 text-sm">Transparent match scoring computed via Jaccard algorithm against your profile</p>
                </div>
                <button onClick={() => void fetchMatches()} disabled={loadingMatches}
                  className="p-1.5 rounded-lg text-[#74685C] hover:text-[#B85C38] dark:hover:text-[#D9734E] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors cursor-pointer"
                  title="Refresh matches">
                  <RefreshCw size={14} className={loadingMatches ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F3EBDD] dark:bg-[#2C241D] rounded-xl w-fit border border-[#E9DFD1] dark:border-[#382E25]">
              {([['all', 'All Roles'], ['eligible', `Eligible (≥50%) · ${eligibleCount}`], ['applied', `Applied · ${appliedJobs.size}`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setMatchFilter(key)}
                  className={cn('px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer',
                    matchFilter === key ? 'bg-white dark:bg-[#221C16] text-[#B85C38] dark:text-[#D9734E] shadow-xs border border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)] font-bold' : 'text-[#74685C] dark:text-[#A89A8A] hover:text-[#30291F] dark:hover:text-[#F6EFE6]')}>
                  {label}
                </button>
              ))}
            </div>

            <JobMatchList
              matches={filteredMatches}
              profile={profile}
              loadingMatches={loadingMatches}
              appliedJobs={appliedJobs}
              applying={applying}
              onApply={handleApply}
              onViewDetails={setSelectedJob}
              onOpenChat={(convId) => openChat(convId ?? null)}
              showAll
            />
          </div>
        )}

        {/* ─── VIEW: SKILL DEVELOPMENT ─────────────────────────────────────── */}
        {activeView === 'skill-development' && (
          <div className="space-y-5 animate-view-enter">
            <div className="section-header">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Skill Development</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                Prioritised learning roadmap based on {matches.length} available job{matches.length !== 1 ? 's' : ''}
              </p>
            </div>

            {!profile ? (
              <div className="enterprise-card p-12 text-center">
                <UploadCloud size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-semibold text-slate-700 dark:text-slate-200">Upload your resume first</p>
                <p className="text-slate-400 text-sm mt-1">We need your parsed skills to generate a roadmap</p>
                <button onClick={() => fileRef.current?.click()} className="btn-primary mt-4">Upload Resume</button>
              </div>
            ) : skillDevData.missing.length === 0 && matches.length === 0 ? (
              <div className="enterprise-card p-12 text-center">
                <Briefcase size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-semibold text-slate-700 dark:text-slate-200">No job matches to analyse yet</p>
                <p className="text-slate-400 text-sm mt-1">Job matches drive the skill gap analysis</p>
              </div>
            ) : skillDevData.missing.length === 0 ? (
              <div className="enterprise-card p-8 text-center border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20">
                <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">You cover all required skills! 🎉</p>
                <p className="text-emerald-700 dark:text-emerald-400 text-sm mt-1">Your resume matches every required skill across all available jobs.</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Skills to Build', value: skillDevData.missing.length, icon: <Target size={18} className="text-red-500" />, bg: 'bg-red-50' },
                    { label: 'Skills You Have', value: profile.parsedSkills.length, icon: <CheckCircle size={18} className="text-emerald-600" />, bg: 'bg-emerald-50' },
                    { label: 'Top Priority',    value: skillDevData.missing[0]?.skill ?? '—', icon: <Star size={18} className="text-amber-500" />, bg: 'bg-amber-50', small: true },
                  ].map(({ label, value, icon, bg, small }) => (
                    <div key={label} className="stat-card animate-view-enter">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
                        <div className={cn('p-2 rounded-lg', bg)}>{icon}</div>
                      </div>
                      <p className={cn('font-black text-slate-900 dark:text-white mb-0.5', small ? 'text-base capitalize truncate' : 'text-3xl')}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Missing skills list */}
                <div className="enterprise-card p-6">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-5">
                    <Lightbulb size={15} className="text-amber-500" />
                    Skills to Build — Prioritised by Market Demand
                  </h2>
                  <div className="space-y-4">
                    {skillDevData.missing.map(({ skill, jobsPct, advice }, i) => (
                      <div key={skill} className={cn('border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-card transition-all duration-200 animate-view-enter', `stagger-${Math.min(i + 1, 6)}`)}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white',
                              i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : i <= 4 ? 'bg-amber-500' : 'bg-slate-400')}>
                              #{i + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white capitalize">{skill}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{Math.round((jobsPct / 100) * matches.length)} of {matches.length} jobs require this</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{jobsPct}%</p>
                            <p className="text-[10px] text-slate-400 font-medium">demand</p>
                          </div>
                        </div>

                        {/* Demand bar */}
                        <div className="h-1.5 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full overflow-hidden mb-3">
                          <div
                            className={cn(
                              'h-full rounded-full skill-bar-fill',
                              jobsPct >= 70
                                ? 'bg-[#C24134]'
                                : jobsPct >= 40
                                ? 'bg-[#B57324]'
                                : 'bg-[#74685C]'
                            )}
                            style={{ width: `${jobsPct}%` }}
                          />
                        </div>

                        {/* Advice */}
                        <div className="bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-lg p-3 flex items-start gap-2">
                          <Lightbulb size={13} className="text-[#B57324] dark:text-[#E49D46] mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-[#544A3E] dark:text-[#D8CEBF] leading-relaxed">{advice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Existing skills */}
                {profile.parsedSkills.length > 0 && (
                  <div className="enterprise-card p-5">
                    <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle size={13} className="text-[#2D7A58] dark:text-[#52B788]" />Your Existing Skills
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.parsedSkills.map(skill => (
                        <span key={skill} className="skill-matched">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── VIEW: DOCUMENTS ─────────────────────────────────────────────── */}
        {activeView === 'documents' && (
          <div className="space-y-5 animate-view-enter">
            <div className="section-header">
              <h1 className="text-2xl font-black text-[#30291F] dark:text-[#F6EFE6]">Documents & Resume</h1>
              <p className="text-[#74685C] dark:text-[#B0A294] mt-0.5 text-sm">Manage your candidate resume — our AI parses skills automatically on upload</p>
            </div>

            {/* Status card */}
            {profile?.resumeUrl && (
              <div className="enterprise-card p-5 border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] animate-view-enter">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-[#221C16] rounded-xl flex items-center justify-center border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)]">
                      <FileText size={20} className="text-[#2D7A58] dark:text-[#52B788]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#2D7A58] dark:text-[#52B788]">Active Resume on Profile</p>
                      <p className="text-xs text-[#2D7A58]/80 dark:text-[#52B788]/80 mt-0.5">
                        {profile.parsedSkills.length} skills verified and ready for matching
                      </p>
                    </div>
                  </div>
                  <a href={getViewableResumeUrl(profile.resumeUrl)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#221C16] border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] text-[#2D7A58] dark:text-[#52B788]
                               text-xs font-semibold rounded-lg hover:bg-[#D4EDDF] transition-colors flex-shrink-0">
                    <ExternalLink size={13} />View PDF
                  </a>
                </div>
              </div>
            )}

            {/* Upload dropzone */}
            <div className="enterprise-card p-6 animate-view-enter stagger-2">
              <h2 className="text-sm font-bold text-[#30291F] dark:text-[#F6EFE6] flex items-center gap-2 mb-4">
                <UploadCloud size={15} className="text-[#B85C38] dark:text-[#D9734E]" />
                {profile?.resumeUrl ? 'Replace Resume' : 'Upload Resume'}
              </h2>
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void handleUpload(f); }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200',
                  uploading ? 'border-[#B85C38] bg-[#FAEEE9]/50 dark:bg-[rgba(217,115,78,0.14)] cursor-not-allowed'
                  : dragOver  ? 'border-[#B85C38] bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] scale-[1.01]'
                  : 'border-[#E9DFD1] dark:border-[#382E25] bg-[#FAF6EF] dark:bg-[#2C241D] hover:border-[#B85C38] dark:hover:border-[#D9734E] hover:bg-[#FAEEE9]/40',
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 size={36} className="text-[#B85C38] dark:text-[#D9734E] animate-spin" />
                    <div className="text-center">
                      <p className="text-[#B85C38] dark:text-[#D9734E] font-bold text-sm">Uploading &amp; Parsing with Gemini 2.0…</p>
                      <p className="text-[#74685C] dark:text-[#A89A8A] text-xs mt-1">Extracting technical skills and coursework</p>
                    </div>
                  </>
                ) : dragOver ? (
                  <>
                    <div className="w-12 h-12 bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.22)] rounded-full flex items-center justify-center">
                      <UploadCloud size={24} className="text-[#B85C38] dark:text-[#D9734E]" />
                    </div>
                    <p className="text-[#B85C38] dark:text-[#D9734E] font-bold text-sm">Drop PDF to upload!</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-[#F3EBDD] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full flex items-center justify-center">
                      <UploadCloud size={22} className="text-[#74685C] dark:text-[#A89A8A]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[#30291F] dark:text-[#F6EFE6] font-semibold text-sm">Drag and drop your PDF resume here</p>
                      <p className="text-[#74685C] dark:text-[#A89A8A] text-xs mt-1">
                        or <span className="text-[#B85C38] dark:text-[#D9734E] font-bold underline underline-offset-2">browse files</span>
                      </p>
                      <p className="text-[#9A8D7E] text-[11px] mt-1.5">PDF only • Maximum 5 MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Parsed skills summary */}
            {profile?.parsedSkills && profile.parsedSkills.length > 0 && (
              <div className="enterprise-card p-5 animate-view-enter stagger-3">
                <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Zap size={13} className="text-[#B85C38] dark:text-[#D9734E]" />Extracted Skills ({profile.parsedSkills.length} verified)
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {profile.parsedSkills.map(skill => (
                    <span key={skill} className="skill-matched">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="enterprise-card p-4 border-[#F7DCB5] dark:border-[rgba(228,157,70,0.35)] bg-[#FEF6EB] dark:bg-[rgba(181,115,36,0.22)] animate-view-enter stagger-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-[#B57324] dark:text-[#E49D46] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#B57324] dark:text-[#E49D46]">Resume Parsing Tip</p>
                  <p className="text-xs text-[#B57324] dark:text-[#E49D46] mt-0.5 leading-relaxed">
                    Use a text-based PDF rather than an image scan. Clearly label your technical skills (Languages, Frameworks, Developer Tools) to maximize automated Jaccard matching accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── VIEW: ANALYSIS ──────────────────────────────────────────────── */}
        {activeView === 'analysis' && (
          <div className="space-y-5 animate-view-enter">
            <div className="section-header">
              <h1 className="text-2xl font-black text-[#30291F] dark:text-[#F6EFE6]">Candidate Match Analysis</h1>
              <p className="text-[#74685C] dark:text-[#B0A294] mt-0.5 text-sm">In-depth multi-dimensional profile positioning against current market demand</p>
            </div>

            {!profile || !analysisData ? (
              <div className="enterprise-card p-12 text-center">
                <BarChart2 size={36} className="text-[#74685C] dark:text-[#A89A8A] mx-auto mb-3" />
                <p className="font-bold text-[#30291F] dark:text-[#F6EFE6]">Upload your resume to view analysis</p>
                <p className="text-[#74685C] dark:text-[#A89A8A] text-xs mt-1">Profile data is required to compute multi-dimensional readiness</p>
                <button onClick={() => { setActiveView('documents'); fileRef.current?.click(); }} className="btn-primary mt-4">Upload Resume</button>
              </div>
            ) : (
              <>
                {/* Top hero: score + recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* Overall score card */}
                  <div className="enterprise-card p-6 flex flex-col items-center text-center gap-4 animate-view-enter stagger-1">
                    <div className="relative">
                      <CircularProgress score={analysisData.overallScore} size={96} stroke={8} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider">Overall AI Score</p>
                      <p className={cn('text-base font-bold mt-0.5',
                        analysisData.overallScore >= 75 ? 'text-[#2D7A58] dark:text-[#52B788]'
                        : analysisData.overallScore >= 55 ? 'text-[#B85C38] dark:text-[#D9734E]' : 'text-[#C24134] dark:text-[#F07167]')}>
                        {analysisData.overallScore >= 75 ? 'Strong Fit' : analysisData.overallScore >= 55 ? 'Good Alignment' : 'Developing'}
                      </p>
                    </div>
                    <div className="w-full text-left space-y-2 pt-3 border-t border-[#E9DFD1] dark:border-[#382E25]">
                      {[
                        { label: 'Skills Match',  value: analysisData.skillMatchPct },
                        { label: 'CGPA Score',    value: analysisData.cgpaPct },
                        { label: 'Experience',    value: analysisData.expPct },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-[#74685C] dark:text-[#A89A8A] font-medium">{label}</span>
                            <span className="font-bold text-[#B85C38] dark:text-[#D9734E]">{value}%</span>
                          </div>
                          <div className="h-1 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full overflow-hidden">
                            <div className="h-full bg-[#B85C38] dark:bg-[#D9734E] rounded-full skill-bar-fill" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Radar chart */}
                  <div className="enterprise-card p-6 flex flex-col items-center gap-4 animate-view-enter stagger-2">
                    <p className="text-[11px] font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider self-start">Readiness Radar</p>
                    <RadarChart size={180} values={[
                      { label: 'Skills',      value: analysisData.skillMatchPct },
                      { label: 'CGPA',        value: analysisData.cgpaPct },
                      { label: 'Experience',  value: analysisData.expPct },
                      { label: 'Applications',value: Math.min(100, analysisData.appliedCount * 20) },
                    ]} />
                    <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A] text-center leading-relaxed">
                      Evaluated across 4 dimensions relative to active startup requirements
                    </p>
                  </div>

                  {/* Quick stats */}
                  <div className="flex flex-col gap-3 animate-view-enter stagger-3">
                    {[
                      { label: 'Top Match Score',   value: `${analysisData.topScore}%`, icon: <Trophy size={16} className="text-[#B85C38] dark:text-[#D9734E]" />,   bg: 'bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)]' },
                      { label: 'Jobs Applied',       value: analysisData.appliedCount,   icon: <CheckCircle size={16} className="text-[#2D7A58] dark:text-[#52B788]" />, bg: 'bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)]' },
                      { label: 'Skills Parsed',      value: profile.parsedSkills.length,  icon: <Zap size={16} className="text-[#B57324] dark:text-[#E49D46]" />,       bg: 'bg-[#FEF6EB] dark:bg-[rgba(181,115,36,0.22)]' },
                      { label: 'Skills to Build',    value: skillDevData.missing.length,   icon: <Target size={16} className="text-[#C24134] dark:text-[#F07167]" />,      bg: 'bg-[#FDEEED] dark:bg-[rgba(194,65,52,0.22)]' },
                    ].map(({ label, value, icon, bg }) => (
                      <div key={label} className="enterprise-card p-3.5 flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-lg flex-shrink-0', bg)}>{icon}</div>
                        <div>
                          <p className="text-lg font-bold text-[#30291F] dark:text-[#F6EFE6]">{value}</p>
                          <p className="text-xs text-[#74685C] dark:text-[#A89A8A] font-medium">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation banner */}
                <div className={cn('enterprise-card p-5 flex items-start gap-3.5 animate-view-enter stagger-4',
                  analysisData.overallScore >= 75 ? 'border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)]'
                  : analysisData.overallScore >= 55 ? 'border-[#F7DCB5] dark:border-[rgba(228,157,70,0.35)] bg-[#FEF6EB] dark:bg-[rgba(181,115,36,0.22)]'
                  : 'border-[#F6BDB7] dark:border-[rgba(240,113,103,0.35)] bg-[#FDEEED] dark:bg-[rgba(194,65,52,0.22)]')}>
                  <div className={cn('p-2 rounded-lg flex-shrink-0',
                    analysisData.overallScore >= 75 ? 'bg-white dark:bg-[#221C16]' : analysisData.overallScore >= 55 ? 'bg-white dark:bg-[#221C16]' : 'bg-white dark:bg-[#221C16]')}>
                    <Star size={18} className={analysisData.overallScore >= 75 ? 'text-[#2D7A58] dark:text-[#52B788]' : analysisData.overallScore >= 55 ? 'text-[#B57324] dark:text-[#E49D46]' : 'text-[#C24134] dark:text-[#F07167]'} />
                  </div>
                  <div>
                    <p className="font-bold text-[#30291F] dark:text-[#F6EFE6] text-sm">Personalized Strategic Recommendation</p>
                    <p className="text-xs text-[#544A3E] dark:text-[#D8CEBF] mt-1 leading-relaxed">{analysisData.recommendation}</p>
                  </div>
                </div>

                {/* Skill comparison */}
                <div className="enterprise-card p-6 animate-view-enter stagger-6">
                  <h2 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-5 flex items-center gap-1.5">
                    <BarChart2 size={13} className="text-[#B85C38] dark:text-[#D9734E]" />Skills Alignment vs. Active Job Postings
                  </h2>
                  {matches.slice(0, 3).map(({ job, matchScore }) => {
                    const { matched, missing } = analyzeSkillGap(job.requiredSkills, profile.parsedSkills);
                    return (
                      <div key={job.id} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-0 border-[#E9DFD1] dark:border-[#382E25]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-[#30291F] dark:text-[#F6EFE6] text-sm">{job.title}</p>
                          <span className="text-xs font-bold text-[#B85C38] dark:text-[#D9734E]">{matchScore}% match</span>
                        </div>
                        <div className="h-1.5 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full overflow-hidden mb-1.5">
                          <div className="h-full bg-[#B85C38] dark:bg-[#D9734E] rounded-full skill-bar-fill"
                            style={{ width: `${Math.round((matched.length / Math.max(job.requiredSkills.length, 1)) * 100)}%` }} />
                        </div>
                        <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A]">{matched.length}/{job.requiredSkills.length} skills covered · {missing.length} missing</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Job Details Modal ────────────────────────────────────────────────── */}
      {selectedJob && (
        <JobDetailsModal
          match={selectedJob} profile={profile} applying={applying}
          appliedJobs={appliedJobs} onApply={handleApply}
          onClose={() => setSelectedJob(null)}
          onOpenChat={(convId) => {
            setSelectedJob(null);
            openChat(convId ?? null);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Shared: JobMatchList
// =============================================================================
function JobMatchList({
  matches,
  profile,
  loadingMatches,
  appliedJobs,
  applying,
  onApply,
  onViewDetails,
  onOpenChat,
  showAll = false,
}: {
  matches: MatchedJob[];
  profile: StudentProfile | null;
  loadingMatches: boolean;
  appliedJobs: Set<string>;
  applying: string | null;
  onApply: (id: string, title: string) => Promise<void>;
  onViewDetails: (m: MatchedJob) => void;
  onOpenChat?: (conversationId?: string) => void;
  showAll?: boolean;
}) {
  if (loadingMatches) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="wellfound-card p-5">
          <div className="skeleton h-4 w-1/3 mb-2.5" />
          <div className="skeleton h-5 w-1/2 mb-3" />
          <div className="skeleton h-3 w-3/4 mb-3" />
          <div className="skeleton h-7 w-28" />
        </div>
      ))}
    </div>
  );

  if (matches.length === 0) return (
    <div className="wellfound-card text-center py-14 px-4">
      <div className="w-14 h-14 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-full flex items-center justify-center mx-auto mb-3">
        <Briefcase size={24} className="text-[#74685C] dark:text-[#A89A8A]" />
      </div>
      <p className="font-bold text-[#30291F] dark:text-[#F6EFE6] text-base">No matching positions found</p>
      <p className="text-[#74685C] dark:text-[#A89A8A] text-xs mt-1 max-w-sm mx-auto">
        {!profile ? 'Upload your resume so our AI can match your skills against active roles' : 'Try switching the filter to "All Roles"'}
      </p>
    </div>
  );

  return (
    <div className="space-y-3.5">
      {(showAll ? matches : matches).map((jobMatch, idx) => {
        const { matchScore, job, applicationStatus, conversationId } = jobMatch;
        const { matched, missing } = analyzeSkillGap(job.requiredSkills, profile?.parsedSkills ?? []);
        const isApplied = appliedJobs.has(job.id);
        const canApply  = matchScore >= 50 && !isApplied;

        return (
          <div
            key={job.id}
            className={cn('wellfound-card p-5 flex flex-col gap-3 animate-view-enter', idx < 6 && `stagger-${Math.min(idx + 1, 6)}`)}
          >
            {/* ── Top Header: Company Identity & Match Score ── */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] flex items-center justify-center font-bold text-base text-[#B85C38] dark:text-[#D9734E] flex-shrink-0">
                  {job.recruiter?.recruiterProfile?.companyName?.[0]?.toUpperCase() ?? 'Z'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#30291F] dark:text-[#F6EFE6] truncate">
                      {job.recruiter?.recruiterProfile?.companyName ?? 'Startup Partner'}
                    </span>
                    {job.recruiter?.recruiterProfile?.designation && (
                      <>
                        <span className="text-[#D8CBBA] dark:text-[#4A3D32]">•</span>
                        <span className="text-[11px] text-[#74685C] dark:text-[#A89A8A] truncate">{job.recruiter.recruiterProfile.designation}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-[#74685C] dark:text-[#A89A8A]">Active Hiring • University Network</p>
                </div>
              </div>

              {/* Match Score */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <CircularProgress score={matchScore} size={44} stroke={4.5} />
              </div>
            </div>

            {/* ── Role Title ── */}
            <div>
              <button
                type="button"
                onClick={() => onViewDetails(jobMatch)}
                className="text-base font-bold text-[#30291F] dark:text-[#F6EFE6] hover:text-[#B85C38] dark:hover:text-[#D9734E] text-left transition-colors cursor-pointer"
              >
                {job.title}
              </button>
            </div>

            {/* ── Metadata Tags ── */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FAF6EF] dark:bg-[#2C241D] text-[#544A3E] dark:text-[#D8CEBF] border border-[#E9DFD1] dark:border-[#382E25] rounded-md px-2.5 py-0.5">
                🎓 Min CGPA: <strong className="text-[#30291F] dark:text-[#F6EFE6]">{job.minCgpa}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FAF6EF] dark:bg-[#2C241D] text-[#544A3E] dark:text-[#D8CEBF] border border-[#E9DFD1] dark:border-[#382E25] rounded-md px-2.5 py-0.5">
                💼 Exp: <strong className="text-[#30291F] dark:text-[#F6EFE6]">{job.minExperience} yrs</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FAF6EF] dark:bg-[#2C241D] text-[#544A3E] dark:text-[#D8CEBF] border border-[#E9DFD1] dark:border-[#382E25] rounded-md px-2.5 py-0.5">
                📍 Campus Placement
              </span>
              {isApplied && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] rounded-md px-2.5 py-0.5">
                  ✓ Applied
                </span>
              )}
            </div>

            {/* ── Description Preview ── */}
            {job.description && (
              <p className="text-xs text-[#74685C] dark:text-[#B0A294] leading-relaxed line-clamp-2">
                {job.description}
              </p>
            )}

            {/* ── Skill Gap Chips ── */}
            <div className="flex flex-wrap gap-1 items-center pt-1">
              {matched.slice(0, 5).map(s => <span key={s} className="skill-matched">✓ {s}</span>)}
              {missing.slice(0, 3).map(s  => <span key={s} className="skill-missing">✗ {s}</span>)}
              {(matched.length + missing.length > 8) && (
                <span className="text-[11px] text-[#74685C] dark:text-[#A89A8A] font-medium self-center pl-1">
                  +{matched.length + missing.length - 8} more
                </span>
              )}
            </div>

            {/* ── Footer Actions ── */}
            <div className="pt-3 border-t border-[#E9DFD1] dark:border-[#382E25] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onViewDetails(jobMatch)}
                className="text-xs text-[#74685C] dark:text-[#A89A8A] hover:text-[#B85C38] dark:hover:text-[#D9734E] font-semibold transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <BookOpen size={13} />
                View Full Details
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isApplied && applicationStatus === 'SHORTLISTED' && onOpenChat && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(conversationId ?? undefined)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] hover:bg-[#D4EDDF] transition-colors cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    Chat with Recruiter
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void onApply(job.id, job.title)}
                  disabled={applying === job.id || !canApply}
                  className={cn(
                    'text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center',
                    isApplied
                      ? 'bg-[#F3EBDD] dark:bg-[#2C241D] text-[#74685C] dark:text-[#D8CEBF] border border-[#E9DFD1] dark:border-[#382E25] cursor-not-allowed'
                      : canApply
                      ? 'btn-primary'
                      : 'bg-[#F3EBDD] dark:bg-[#2C241D] text-[#9A8D7E] border border-[#E9DFD1] dark:border-[#382E25] cursor-not-allowed',
                    applying === job.id && 'opacity-70'
                  )}
                >
                  {applying === job.id ? <Loader2 size={13} className="animate-spin" /> : isApplied ? <CheckCircle size={13} /> : null}
                  {isApplied
                    ? (applicationStatus === 'SHORTLISTED' ? 'Shortlisted 🎉' : applicationStatus === 'REJECTED' ? 'Reviewed' : 'Applied')
                    : matchScore >= 50 ? 'Quick Apply' : 'Below 50% Threshold'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// JobDetailsModal
// =============================================================================
function JobDetailsModal({
  match,
  profile,
  applying,
  appliedJobs,
  onApply,
  onClose,
  onOpenChat,
}: {
  match: MatchedJob;
  profile: StudentProfile | null;
  applying: string | null;
  appliedJobs: Set<string>;
  onApply: (id: string, title: string) => Promise<void>;
  onClose: () => void;
  onOpenChat?: (conversationId?: string) => void;
}) {
  const { matchScore, job, applicationStatus, conversationId } = match;
  const isApplied   = appliedJobs.has(job.id);
  const canApply    = matchScore >= 50 && !isApplied;
  const company     = job.recruiter?.recruiterProfile?.companyName;
  const designation = job.recruiter?.recruiterProfile?.designation;
  const { matched, missing } = analyzeSkillGap(job.requiredSkills, profile?.parsedSkills ?? []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-xl shadow-lg flex flex-col animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#E9DFD1] dark:border-[#382E25] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#30291F] dark:text-[#F6EFE6]">{job.title}</h2>
            {company && (
              <p className="text-xs text-[#74685C] dark:text-[#A89A8A] mt-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
                <span className="font-semibold text-[#30291F] dark:text-[#F6EFE6]">{company}</span>
                {designation && <><span className="text-[#D8CBBA] dark:text-[#4A3D32]">·</span><span>{designation}</span></>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CircularProgress score={matchScore} size={48} stroke={5} />
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#74685C] dark:text-[#A89A8A] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-md px-3 py-1 text-xs font-semibold text-[#544A3E] dark:text-[#D8CEBF]">
              <Award size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
              Min CGPA: <strong className="text-[#30291F] dark:text-[#F6EFE6] ml-0.5">{job.minCgpa}</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-md px-3 py-1 text-xs font-semibold text-[#544A3E] dark:text-[#D8CEBF]">
              <Briefcase size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
              Min Exp: <strong className="text-[#30291F] dark:text-[#F6EFE6] ml-0.5">{job.minExperience} yrs</strong>
            </span>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
              Job Description
            </h3>
            <p className="text-sm text-[#30291F] dark:text-[#D8CEBF] leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#74685C] dark:text-[#A89A8A] uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-[#B85C38] dark:text-[#D9734E]" />
                Required Skills
              </h3>
              <span className="text-xs font-semibold text-[#74685C] dark:text-[#A89A8A]">
                {matched.length}/{job.requiredSkills.length} matched
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredSkills.map(skill => {
                const isMat = matched.map(s => s.toLowerCase()).includes(skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold border',
                      isMat
                        ? 'bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)]'
                        : 'bg-[#FDEEED] dark:bg-[rgba(194,65,52,0.22)] text-[#C24134] dark:text-[#F07167] border-[#F6BDB7] dark:border-[rgba(240,113,103,0.35)]'
                    )}
                  >
                    {isMat ? '✓' : '✗'} {skill}
                  </span>
                );
              })}
            </div>
          </div>

          {missing.length > 0 && (
            <div className="bg-[#FAF6EF] dark:bg-[#2C241D] border border-[#E9DFD1] dark:border-[#382E25] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-[#B57324] dark:text-[#E49D46]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[#30291F] dark:text-[#F6EFE6]">
                  {missing.length} skill{missing.length !== 1 ? 's' : ''} to build
                </p>
              </div>
              <div className="space-y-1.5">
                {missing.map(skill => (
                  <div key={skill} className="bg-white dark:bg-[#221C16] border border-[#E9DFD1] dark:border-[#382E25] rounded-lg p-2.5">
                    <span className="text-xs font-bold text-[#30291F] dark:text-[#F6EFE6] capitalize">{skill}</span>
                    <p className="text-xs text-[#74685C] dark:text-[#B0A294] mt-0.5 leading-relaxed">
                      {SKILL_ADVICE[skill.toLowerCase()] ?? `Build a hands-on project demonstrating ${skill}.`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-[#E9DFD1] dark:border-[#382E25] p-4 sm:p-5 bg-[#FAF6EF] dark:bg-[#171411] flex items-center justify-end gap-2.5">
          {isApplied && applicationStatus === 'SHORTLISTED' && onOpenChat && (
            <button
              type="button"
              onClick={() => onOpenChat(conversationId ?? undefined)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#EBF7F0] dark:bg-[rgba(45,122,88,0.22)] text-[#2D7A58] dark:text-[#52B788] border border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)] hover:bg-[#D4EDDF] transition-colors cursor-pointer"
            >
              <MessageSquare size={14} />
              Chat with Recruiter
            </button>
          )}
          <button
            onClick={() => void onApply(job.id, job.title)}
            disabled={applying === job.id || !canApply}
            className={cn(
              'px-5 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer',
              isApplied
                ? 'bg-[#F3EBDD] dark:bg-[#2C241D] text-[#74685C] dark:text-[#D8CEBF] border border-[#E9DFD1] dark:border-[#382E25] cursor-not-allowed'
                : canApply
                ? 'btn-primary'
                : 'bg-[#F3EBDD] dark:bg-[#2C241D] text-[#9A8D7E] border border-[#E9DFD1] dark:border-[#382E25] cursor-not-allowed',
              applying === job.id && 'opacity-70'
            )}
          >
            {applying === job.id ? <Loader2 size={13} className="animate-spin" /> : isApplied ? <CheckCircle size={13} /> : null}
            {isApplied ? 'Already Applied' : matchScore >= 50 ? 'Apply Now' : 'Below 50% Threshold'}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary text-xs !py-2 !px-4 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
