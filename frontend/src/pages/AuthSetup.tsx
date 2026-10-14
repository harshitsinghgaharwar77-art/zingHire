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
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-40" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-warm-terracotta/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-warm-sand/30 dark:bg-warm-darkElevated/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-warm-muted dark:text-warm-darkMuted text-xs font-medium">
            One quick step — complete your profile for <span className="font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">{email || 'your account'}</span>
          </p>
        </div>

        {/* Card */}
        <div className="wellfound-card p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-warm-charcoal dark:text-warm-darkCharcoal mb-0.5" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            Complete your profile
          </h2>
          <p className="text-warm-muted dark:text-warm-darkMuted text-xs mb-5">Takes less than 30 seconds to get matched.</p>

          <form onSubmit={handleSetup} className="space-y-4">
            {/* Role picker */}
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

            {/* Student fields */}
            {role === 'STUDENT' && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <SetupInput label="First Name" value={firstName} onChange={setFirstName} placeholder="e.g. Alex" />
                  <SetupInput label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="e.g. Mercer" />
                </div>
                <SetupInput label="University / College" value={college} onChange={setCollege} placeholder="e.g. Stanford University" />
                <SetupInput label="Current CGPA / Grade"    value={cgpa}    onChange={setCgpa}    placeholder="e.g. 8.5" type="number" />
              </>
            )}

            {/* Recruiter fields */}
            {role === 'RECRUITER' && (
              <>
                <SetupInput label="Company Name" value={companyName} onChange={setCompanyName} placeholder="e.g. Acme Ventures" />
                <SetupInput label="Your Designation"  value={designation} onChange={setDesignation} placeholder="e.g. Talent Lead" />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 text-xs font-bold active:scale-[0.99] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-sm cursor-pointer !bg-[#B85C38] hover:!bg-[#9F4A29] !text-white"
              style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
            >
              {loading && <Loader2 size={15} className="animate-spin text-white" />}
              <span>Enter ZingHire Marketplace →</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SetupInput({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="type-label block mb-1 text-warm-charcoal dark:text-warm-darkCharcoal">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg px-3.5 py-2 text-xs text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
      />
    </div>
  );
}
