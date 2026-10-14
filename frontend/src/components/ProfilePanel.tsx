import { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2, LogOut, Briefcase, GraduationCap, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StudentProfile {
  firstName: string;
  lastName: string;
  college: string;
  cgpa: number;
  experienceYears: number;
  parsedSkills: string[];
}

interface RecruiterProfile {
  companyName: string;
  designation: string;
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Student State
  const [studentForm, setStudentForm] = useState<StudentProfile>({
    firstName: '',
    lastName: '',
    college: '',
    cgpa: 0,
    experienceYears: 0,
    parsedSkills: [],
  });

  // Recruiter State
  const [recruiterForm, setRecruiterForm] = useState<RecruiterProfile>({
    companyName: '',
    designation: '',
  });

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (user.role === 'STUDENT') {
        const { data } = await api.get<{ data: StudentProfile }>('/student/profile');
        setStudentForm(data.data);
      } else if (user.role === 'RECRUITER') {
        const { data } = await api.get<{ data: RecruiterProfile }>('/student/recruiter-profile');
        setRecruiterForm(data.data);
      }
    } catch {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      void fetchProfile();
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, fetchProfile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (user.role === 'STUDENT') {
        await api.put('/student/profile', studentForm);
        toast.success('Profile updated successfully!');
      } else if (user.role === 'RECRUITER') {
        await api.put('/student/recruiter-profile', recruiterForm);
        toast.success('Profile updated successfully!');
      }
      onClose();
    } catch {
      toast.error('Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (user?.role === 'STUDENT') {
      const f = studentForm.firstName || '';
      const l = studentForm.lastName || '';
      if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    } else if (user?.role === 'RECRUITER') {
      const c = recruiterForm.companyName || '';
      if (c) return c.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Panel (Wellfound Style) */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-warm-darkCard shadow-2xl z-[110] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-warm-border dark:border-warm-darkBorder">
        
        {/* Header */}
        <div className="p-5 border-b border-warm-border dark:border-warm-darkBorder flex items-center justify-between bg-warm-sandTint/30 dark:bg-warm-darkElevated/30">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-warm-terracotta text-white flex items-center justify-center shadow-xs ring-4 ring-warm-sandTint dark:ring-warm-darkBorder">
              <span className="font-bold text-base tracking-wide">{getInitials()}</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-warm-charcoal dark:text-warm-darkCharcoal" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                Profile Settings
              </h2>
              <p className="text-xs text-warm-muted dark:text-warm-darkMuted font-medium">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-warm-muted hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-warm-muted gap-2">
              <Loader2 className="animate-spin text-warm-terracotta" size={20} />
              <p className="text-xs font-medium">Loading profile…</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Role Badge Section */}
              <div className="bg-warm-sandTint/40 dark:bg-warm-darkElevated/40 p-3.5 rounded-lg border border-warm-border dark:border-warm-darkBorder flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-warm-muted uppercase tracking-wider mb-0.5">Account Role</p>
                  <p className="text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal flex items-center gap-1.5">
                    {user?.role === 'STUDENT' && <GraduationCap size={15} className="text-warm-terracotta" />}
                    {user?.role === 'RECRUITER' && <Briefcase size={15} className="text-[#2D7A58]" />}
                    {user?.role === 'ADMIN' && <Shield size={15} className="text-warm-charcoal" />}
                    {user?.role}
                  </p>
                </div>
              </div>

              {user?.role === 'STUDENT' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">First Name</label>
                      <input
                        type="text"
                        value={studentForm.firstName}
                        onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">Last Name</label>
                      <input
                        type="text"
                        value={studentForm.lastName}
                        onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">College / University</label>
                    <input
                      type="text"
                      value={studentForm.college}
                      onChange={(e) => setStudentForm({ ...studentForm, college: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">CGPA</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={studentForm.cgpa}
                        onChange={(e) => setStudentForm({ ...studentForm, cgpa: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={studentForm.experienceYears}
                        onChange={(e) => setStudentForm({ ...studentForm, experienceYears: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                      />
                    </div>
                  </div>

                  {studentForm.parsedSkills.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">Verified Resume Skills</label>
                      <div className="flex flex-wrap gap-1.5">
                        {studentForm.parsedSkills.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-warm-sandTint dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal text-[11px] font-medium rounded border border-warm-border dark:border-warm-darkBorder">
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-warm-muted mt-1">Re-upload your resume on the Talent Hub to update skills.</p>
                    </div>
                  )}
                </>
              )}

              {user?.role === 'RECRUITER' && (
                <>
                  <div className="space-y-1">
                    <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">Company Name</label>
                    <input
                      type="text"
                      value={recruiterForm.companyName}
                      onChange={(e) => setRecruiterForm({ ...recruiterForm, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="type-label block text-warm-charcoal dark:text-warm-darkCharcoal">Designation / Role</label>
                    <input
                      type="text"
                      value={recruiterForm.designation}
                      onChange={(e) => setRecruiterForm({ ...recruiterForm, designation: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder rounded-lg text-xs text-warm-charcoal dark:text-warm-darkCharcoal focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                    />
                  </div>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <div className="p-4 bg-warm-sandTint/50 dark:bg-warm-darkElevated text-warm-charcoal dark:text-warm-darkCharcoal rounded-lg border border-warm-border dark:border-warm-darkBorder flex items-center justify-center">
                  <p className="text-xs font-medium text-center">Admin accounts are system-managed.<br/>No editable profile fields.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-warm-border dark:border-warm-darkBorder bg-white dark:bg-warm-darkElevated space-y-2">
          {user?.role !== 'ADMIN' && (
            <button
              onClick={() => void handleSave()}
              disabled={saving || loading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracottaHover text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          )}
          
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#B83E28] bg-[#FDF0ED] dark:bg-[#2D1612] hover:bg-[#FBE4DE] transition-colors border border-[#F7CBC3] dark:border-[#4D221B] cursor-pointer"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
