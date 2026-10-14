import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, GraduationCap, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore, type Role } from '../store/authStore';
import { cn } from '../lib/cn';
import Logo from '../components/Logo';

// The Google icon as an inline SVG
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
  </svg>
);

type Tab = 'login' | 'register';

export default function Auth() {
  const navigate        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setAuth         = useAuthStore((s) => s.setAuth);

  // Show error toast if Google OAuth failed
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      toast.error('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const urlTab = searchParams.get('tab') || searchParams.get('mode');
  const initialTab: Tab = (urlTab === 'register' || urlTab === 'signup') ? 'register' : 'login';
  const [tab, setTab] = useState<Tab>(initialTab);

  const urlRole = searchParams.get('role');
  const initialRole: Role = urlRole?.toUpperCase() === 'RECRUITER' ? 'RECRUITER' : 'STUDENT';
  const [role, setRole] = useState<Role>(initialRole);

  // Sync tab and role whenever URL query params change (e.g. clicking Sign up in navbar)
  useEffect(() => {
    const t = searchParams.get('tab') || searchParams.get('mode');
    if (t === 'register' || t === 'signup') {
      setTab('register');
    } else if (t === 'login' || t === 'signin') {
      setTab('login');
    }
    const r = searchParams.get('role');
    if (r?.toUpperCase() === 'RECRUITER') {
      setRole('RECRUITER');
    } else if (r?.toUpperCase() === 'STUDENT') {
      setRole('STUDENT');
    }
  }, [searchParams]);

  const handleSwitchTab = (newTab: Tab) => {
    setTab(newTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', newTab);
    setSearchParams(next, { replace: true });
  };
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);

  // --- Register-only fields ---
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [college,       setCollege]       = useState('');
  const [cgpa,          setCgpa]          = useState('');
  const [companyName,   setCompanyName]   = useState('');
  const [designation,   setDesignation]   = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const currentEmail = (formData.get('email') as string) || email;
    const currentPassword = (formData.get('password') as string) || password;

    try {
      if (tab === 'login') {
        const { data: res } = await api.post<{
          success: boolean;
          message: string;
          data: { token: string; user: { userId: string; role: Role; email: string } };
        }>('/auth/login', { email: currentEmail, password: currentPassword });

        setAuth(res.data.token, res.data.user);
        toast.success('Welcome back to ZingHire! 🎉');
        navigate(res.data.user.role === 'STUDENT' ? '/student' : '/recruiter');
      } else {
        const payload =
          role === 'STUDENT'
            ? { email: currentEmail, password: currentPassword, role, firstName, lastName, college, cgpa: Number(cgpa) }
            : { email: currentEmail, password: currentPassword, role, companyName, designation };

        await api.post<{ success: boolean; message: string }>('/auth/register', payload);

        const { data: loginRes } = await api.post<{
          success: boolean;
          message: string;
          data: { token: string; user: { userId: string; role: Role; email: string } };
        }>('/auth/login', { email: currentEmail, password: currentPassword });

        setAuth(loginRes.data.token, loginRes.data.user);
        toast.success('Account created! Welcome to ZingHire. 🚀');
        navigate(loginRes.data.user.role === 'STUDENT' ? '/student' : '/recruiter');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 relative">
      {/* Background dot pattern */}
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-40" />

      {/* Ambient warm glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-warm-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-warm-sand/30 dark:bg-warm-darkElevated/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warm-muted dark:text-warm-darkMuted text-xs font-medium">
            {tab === 'login' ? 'Welcome back! Sign in to continue exploring matches.' : 'Create your ZingHire account to start matching with top startups.'}
          </p>
        </div>

        {/* Wellfound Auth Card */}
        <div className="wellfound-card p-6 sm:p-8 shadow-sm">
          {/* Tab switcher */}
          <div className="flex bg-warm-sandTint dark:bg-warm-darkElevated rounded-lg p-1 mb-6 gap-1 border border-warm-border dark:border-warm-darkBorder">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSwitchTab(t)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer',
                  tab === t
                    ? 'bg-white dark:bg-warm-darkCard text-warm-charcoal dark:text-warm-darkCharcoal shadow-sm border border-warm-border dark:border-warm-darkBorder font-bold'
                    : 'text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal',
                )}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role picker (register only) */}
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-2.5 mb-2">
                {(['STUDENT', 'RECRUITER'] as Role[]).map((r) => {
                  const Icon = r === 'STUDENT' ? GraduationCap : Briefcase;
                  const isSelected = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-150 cursor-pointer',
                        isSelected
                          ? 'border-warm-terracotta bg-warm-sandTint/70 dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal font-bold'
                          : 'border-warm-border dark:border-warm-darkBorder text-warm-muted dark:text-warm-darkMuted hover:border-warm-sand bg-white dark:bg-warm-darkCard',
                      )}
                    >
                      <Icon size={18} className={isSelected ? 'text-warm-terracotta dark:text-warm-darkTerracotta' : ''} />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{r}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Extra fields for Student */}
            {tab === 'register' && role === 'STUDENT' && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <InputField label="First Name" value={firstName} onChange={setFirstName} placeholder="e.g. Alex" />
                  <InputField label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="e.g. Mercer" />
                </div>
                <InputField label="University / College" value={college} onChange={setCollege} placeholder="e.g. Stanford University" />
                <InputField label="Current CGPA / Grade" value={cgpa} onChange={setCgpa} placeholder="e.g. 8.5" type="number" />
              </>
            )}
            {tab === 'register' && role === 'RECRUITER' && (
              <>
                <InputField label="Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Ventures" />
                <InputField label="Your Role / Title" value={designation} onChange={setDesignation} placeholder="e.g. Head of Talent" />
              </>
            )}

            {/* Email */}
            <InputField label="Email Address" name="email" value={email} onChange={setEmail} placeholder="you@domain.com" type="email" />

            {/* Password */}
            <div>
              <label className="type-label block mb-1 text-warm-charcoal dark:text-warm-darkCharcoal">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2 pr-9 text-xs text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 text-xs font-bold active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-sm cursor-pointer !bg-[#B85C38] hover:!bg-[#9F4A29] !text-white"
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
            >
              {loading && <Loader2 size={15} className="animate-spin text-white" />}
              <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            </button>
          </form>

          {/* ── Google OAuth divider ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-warm-border dark:bg-warm-darkBorder" />
            <span className="text-[10px] text-warm-muted font-semibold uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-warm-border dark:bg-warm-darkBorder" />
          </div>

          {/* Continue with Google */}
          <a
            href={`${(import.meta.env['VITE_API_URL'] as string | undefined) || '/api'}/auth/google`}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg border border-warm-border dark:border-warm-darkBorder bg-white dark:bg-warm-darkCard hover:bg-warm-sandTint/50 dark:hover:bg-warm-darkElevated active:scale-[0.99] text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal shadow-sm transition-all duration-150"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Footer toggle */}
          <div className="mt-5 text-center">
            <p className="text-xs text-warm-muted dark:text-warm-darkMuted">
              {tab === 'login' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab(tab === 'login' ? 'register' : 'login')}
                className="text-warm-terracotta dark:text-warm-darkTerracotta font-semibold hover:underline cursor-pointer"
              >
                {tab === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-warm-muted dark:text-warm-darkMuted text-[11px] mt-4">
          By signing in or creating an account, you agree to ZingHire's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// ── Reusable input sub-component ──────────────────────────────────────────────
function InputField({
  label, value, onChange, placeholder, type = 'text', name
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  name?: string;
}) {
  return (
    <div>
      <label className="type-label block mb-1 text-warm-charcoal dark:text-warm-darkCharcoal">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2 text-xs text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
      />
    </div>
  );
}
