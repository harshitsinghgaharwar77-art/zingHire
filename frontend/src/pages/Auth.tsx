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
  const [searchParams]  = useSearchParams();
  const setAuth         = useAuthStore((s) => s.setAuth);

  // Show error toast if Google OAuth failed
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      toast.error('Google sign-in failed. Please try again.');
    }
  }, [searchParams]);

  const [tab,        setTab]        = useState<Tab>('login');
  const [role,       setRole]       = useState<Role>('STUDENT');
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
        toast.success('Welcome to ZingHire! 🎉');
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
        toast.success('Welcome to ZingHire! Account created. 🚀');
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
      {/* Background dot grid */}
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-50" />

      {/* Ambient gradient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-400/20 dark:bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {tab === 'login' ? 'Welcome back! Sign in to accelerate your career.' : 'Create your ZingHire account to start matching.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-7 sm:p-8 shadow-lg">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 mb-6 gap-1">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer',
                  tab === t
                    ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-cyan-400 shadow-sm border border-slate-200/80 dark:border-slate-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role picker (register only) */}
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                {(['STUDENT', 'RECRUITER'] as Role[]).map((r) => {
                  const Icon = r === 'STUDENT' ? GraduationCap : Briefcase;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                        role === r
                          ? 'border-violet-500 bg-violet-50/80 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60',
                      )}
                    >
                      <Icon size={20} className={role === r ? 'text-violet-600 dark:text-cyan-400' : ''} />
                      <span className="text-xs font-bold uppercase tracking-wide">{r}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Extra fields for Student */}
            {tab === 'register' && role === 'STUDENT' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="First Name" value={firstName} onChange={setFirstName} placeholder="Rahul" />
                  <InputField label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Sharma" />
                </div>
                <InputField label="College" value={college} onChange={setCollege} placeholder="IIT Bombay" />
                <InputField label="CGPA" value={cgpa} onChange={setCgpa} placeholder="8.5" type="number" />
              </>
            )}
            {tab === 'register' && role === 'RECRUITER' && (
              <>
                <InputField label="Company" value={companyName} onChange={setCompanyName} placeholder="Acme Corp" />
                <InputField label="Designation" value={designation} onChange={setDesignation} placeholder="Talent Lead" />
              </>
            )}

            {/* Email */}
            <InputField label="Email" name="email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
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
                  className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10
                             text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                             focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white font-bold
                         py-3 rounded-xl hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.99]
                         transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 mt-3 shadow-md text-sm cursor-pointer"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {tab === 'login' ? 'Sign In to ZingHire' : 'Create My ZingHire Account'}
            </button>
          </form>

          {/* ── Google OAuth divider ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Continue with Google */}
          <a
            href={`${(import.meta.env['VITE_API_URL'] as string | undefined) || '/api'}/auth/google`}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl
                       border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800
                       hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-[0.99]
                       text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm
                       transition-all duration-150"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Footer toggle */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tab === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
              <button
                onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                className="text-violet-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer"
              >
                {tab === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-6">
          By continuing, you agree to ZingHire's Terms & Privacy Policy.
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
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5
                   text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
                   focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                   transition-colors"
      />
    </div>
  );
}
