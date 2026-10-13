import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, GraduationCap, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { useAuthStore, type Role } from '../store/authStore';
import { cn } from '../lib/cn';
import Logo from '../components/Logo';

export default function AuthSetup() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth        = useAuthStore((s) => s.setAuth);

  const tempToken = searchParams.get('token') ?? '';
  const email     = searchParams.get('email') ?? '';

  const [role,        setRole]        = useState<Role>('STUDENT');
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [college,     setCollege]     = useState('');
  const [cgpa,        setCgpa]        = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!tempToken) {
      toast.error('Session expired. Please sign in again.');
      navigate('/auth');
      return;
    }

    setLoading(true);

    try {
      const payload =
        role === 'STUDENT'
          ? { role, firstName, lastName, college, cgpa: Number(cgpa) }
          : { role, companyName, designation };

      const { data: res } = await api.post<{
        success: boolean;
        message: string;
        data: { token: string; user: { userId: string; role: Role; email: string } };
      }>('/auth/setup-role', payload, {
        headers: { Authorization: `Bearer ${tempToken}` },
      });

      setAuth(res.data.token, res.data.user);
      toast.success('Account ready! Welcome to ZingHire 🚀');

      const dest = res.data.user.role === 'STUDENT' ? '/student' : '/recruiter';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Setup failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-50" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-400/20 dark:bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            One last step — finish your profile, <span className="font-semibold text-violet-600 dark:text-cyan-400">{email ?? 'friend'}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-7 sm:p-8 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Complete your profile</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Takes less than 30 seconds.</p>

          <form onSubmit={handleSetup} className="space-y-4">
            {/* Role picker */}
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
                    <Icon size={22} className={role === r ? 'text-violet-600 dark:text-cyan-400' : ''} />
                    <span className="text-xs font-bold uppercase tracking-wide">{r}</span>
                  </button>
                );
              })}
            </div>

            {/* Student fields */}
            {role === 'STUDENT' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <SetupInput label="First Name" value={firstName} onChange={setFirstName} placeholder="Rahul" />
                  <SetupInput label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Sharma" />
                </div>
                <SetupInput label="College" value={college} onChange={setCollege} placeholder="IIT Bombay" />
                <SetupInput label="CGPA"    value={cgpa}    onChange={setCgpa}    placeholder="8.5" type="number" />
              </>
            )}

            {/* Recruiter fields */}
            {role === 'RECRUITER' && (
              <>
                <SetupInput label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Acme Corp" />
                <SetupInput label="Designation"  value={designation} onChange={setDesignation} placeholder="HR Manager" />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white font-bold py-3 rounded-xl
                         hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.99] transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 mt-3 shadow-md text-sm cursor-pointer"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Enter ZingHire →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SetupInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type}
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
