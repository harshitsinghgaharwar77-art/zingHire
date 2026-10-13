import { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  GraduationCap, Briefcase, LayoutDashboard, LogOut,
  Menu, X, LogIn, UserPlus, Shield, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import { cn } from '../lib/cn';
import ProfilePanel from './ProfilePanel';
import NotificationBell from './NotificationBell';
import LiveChatDrawer from './LiveChatDrawer';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

/**
 * Global application shell component for ZingHire.
 * Provides top glassmorphism navigation, responsive drawer, notifications,
 * light/dark theme toggle, and role-based dynamic routing links.
 */

interface NavLink {
  label: string;
  to:    string;
  icon:  React.ReactNode;
}

export default function Layout() {
  const { isAuth, user, logout } = useAuthStore();
  const { isOpen: isChatOpen, activeConversationId, openChat, closeChat } = useChatStore();
  const { theme } = useThemeStore();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isStudent   = user?.role === 'STUDENT';
  const isRecruiter = user?.role === 'RECRUITER';
  const isAdmin     = user?.role === 'ADMIN';

  const navLinks: NavLink[] = isStudent
    ? [{ label: 'Dashboard', to: '/student',   icon: <LayoutDashboard size={15} /> }]
    : isRecruiter
    ? [{ label: 'Dashboard', to: '/recruiter', icon: <LayoutDashboard size={15} /> }]
    : isAdmin
    ? [{ label: 'Dashboard', to: '/admin',     icon: <LayoutDashboard size={15} /> }]
    : [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleMeta = isStudent
    ? { label: 'Student',   icon: <GraduationCap size={13} />, cls: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' }
    : isRecruiter
    ? { label: 'Recruiter', icon: <Briefcase size={13} />,     cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' }
    : isAdmin
    ? { label: 'Admin',     icon: <Shield size={13} />,        cls: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' }
    : null;

  return (
    <div className="w-full min-h-full flex flex-col transition-colors duration-300">
      {/* ── Background blur orbs ────────────────────────────────────────── */}
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />

      {/* ── Toast provider ─────────────────────────────────────────────────── */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background:   theme === 'dark' ? '#1e293b' : '#ffffff',
            color:        theme === 'dark' ? '#f8fafc' : '#0f172a',
            border:       theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize:     '14px',
            fontWeight:   '500',
            boxShadow:    theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {/* ── Top Navigation ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-2xl shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 h-16 flex items-center justify-between">

          {/* Left: ZingHire brand */}
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size="md" />
          </Link>

          {/* Right: nav links + theme toggle + actions */}
          <div className="hidden md:flex items-center gap-2">
            {isAuth ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                      location.pathname === link.to
                        ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold border border-violet-200/60 dark:border-violet-800/50'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* Role pill badge */}
                {roleMeta && (
                  <span className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </span>
                )}

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* Real-time Messages Action */}
                <button
                  type="button"
                  onClick={() => openChat(null)}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  title="Live 1-on-1 Messages"
                  aria-label="Open messages"
                >
                  <MessageSquare size={19} />
                </button>

                {/* Real-time In-App Notification Bell */}
                <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />

                {/* Light / Dark Mode Toggle */}
                <ThemeToggle />

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {/* Avatar Button */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="w-9 h-9 ml-1 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-sm hover:ring-2 hover:ring-violet-400 transition-all duration-150 cursor-pointer"
                  aria-label="Open profile settings"
                >
                  <span className="text-white text-sm font-bold tracking-wide">
                    {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                             text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all duration-150 ml-1 cursor-pointer"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Light / Dark Mode Toggle for Guests */}
                <ThemeToggle />

                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                             text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-150"
                >
                  <LogIn size={15} />
                  Login
                </Link>
                <Link
                  to="/auth"
                  className="btn-primary text-sm !py-2 !px-4"
                >
                  <UserPlus size={15} />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile: ThemeToggle + NotificationBell + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {isAuth && <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />}
            <button
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl py-3 flex flex-col gap-1 animate-slide-up px-4 shadow-lg">
            {isAuth ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      location.pathname === link.to
                        ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                {roleMeta && (
                  <div className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border w-fit ml-4 mt-1',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </div>
                )}

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

                <button
                  onClick={() => { setMenuOpen(false); setIsProfileOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                             text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors text-left"
                >
                  <UserPlus size={15} />
                  Profile Settings
                </button>

                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                             text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium
                             text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <LogIn size={15} />
                  Login
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-center justify-center w-full"
                >
                  <UserPlus size={15} />
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="flex-1 w-full relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Profile Settings Panel */}
      <ProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

      {/* Global 1-on-1 Live Chat Drawer */}
      {isAuth && (
        <LiveChatDrawer
          isOpen={isChatOpen}
          onClose={closeChat}
          initialConversationId={activeConversationId}
        />
      )}
    </div>
  );
}
