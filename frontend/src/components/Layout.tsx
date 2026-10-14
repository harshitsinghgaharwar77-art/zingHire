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
    ? { label: 'Candidate', icon: <GraduationCap size={13} />, cls: 'bg-[#F3EBDD] text-[#544A3E] dark:bg-[#2C241D] dark:text-[#D8CEBF] border-[#E9DFD1] dark:border-[#382E25]' }
    : isRecruiter
    ? { label: 'Recruiter', icon: <Briefcase size={13} />,     cls: 'bg-[#EBF7F0] text-[#2D7A58] dark:bg-[rgba(45,122,88,0.22)] dark:text-[#52B788] border-[#BBE5CE] dark:border-[rgba(82,183,136,0.35)]' }
    : isAdmin
    ? { label: 'Admin',     icon: <Shield size={13} />,        cls: 'bg-[#FAEEE9] text-[#B85C38] dark:bg-[rgba(217,115,78,0.18)] dark:text-[#D9734E] border-[#EFC8B9] dark:border-[rgba(217,115,78,0.35)]' }
    : null;

  return (
    <div className="w-full min-h-full flex flex-col bg-[#FAF6EF] dark:bg-[#171411] text-[#30291F] dark:text-[#F6EFE6] transition-colors duration-200">
      {/* ── Toast provider ─────────────────────────────────────────────────── */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background:   theme === 'dark' ? '#221C16' : '#FFFFFF',
            color:        theme === 'dark' ? '#F6EFE6' : '#30291F',
            border:       theme === 'dark' ? '1px solid #382E25' : '1px solid #E9DFD1',
            borderRadius: '10px',
            fontSize:     '14px',
            fontWeight:   '500',
            boxShadow:    theme === 'dark' ? '0 8px 24px rgba(0,0,0,0.5)' : '0 4px 14px rgba(48,41,31,0.08)',
          },
          success: { iconTheme: { primary: '#2D7A58', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#C24134', secondary: '#fff' } },
        }}
      />

      {/* ── Top Navigation (Wellfound Style: Clean, high-contrast, warm border) ── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E9DFD1] dark:border-[#382E25] bg-[#FAF6EF]/90 dark:bg-[#171411]/90 backdrop-blur-md transition-colors duration-200">
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
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
                      location.pathname === link.to
                        ? 'bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] font-semibold border border-[#EFC8B9] dark:border-[rgba(217,115,78,0.32)]'
                        : 'text-[#74685C] dark:text-[#A89A8A] hover:text-[#30291F] dark:hover:text-[#F6EFE6] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D]',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                <div className="h-4 w-px bg-[#E9DFD1] dark:bg-[#382E25] mx-1" />

                {/* Role pill badge */}
                {roleMeta && (
                  <span className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </span>
                )}

                <div className="h-4 w-px bg-[#E9DFD1] dark:bg-[#382E25] mx-1" />

                {/* Real-time Messages Action */}
                <button
                  type="button"
                  onClick={() => openChat(null)}
                  className="p-2 rounded-lg text-[#74685C] dark:text-[#A89A8A] hover:text-[#B85C38] dark:hover:text-[#D9734E] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors cursor-pointer"
                  title="Live 1-on-1 Messages"
                  aria-label="Open messages"
                >
                  <MessageSquare size={18} />
                </button>

                {/* Real-time In-App Notification Bell */}
                <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />

                {/* Light / Dark Mode Toggle */}
                <ThemeToggle />

                <div className="h-4 w-px bg-[#E9DFD1] dark:bg-[#382E25] mx-1" />

                {/* Avatar Button */}
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="w-8 h-8 ml-1 rounded-full bg-[#B85C38] dark:bg-[#D9734E] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                  aria-label="Open profile settings"
                >
                  <span>
                    {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium
                             text-[#74685C] dark:text-[#A89A8A] hover:text-[#C24134] dark:hover:text-[#F07167] hover:bg-[#FDEEED] dark:hover:bg-[rgba(194,65,52,0.18)] transition-colors ml-1 cursor-pointer"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             text-[#544A3E] dark:text-[#D8CEBF] hover:text-[#30291F] dark:hover:text-[#F6EFE6] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors"
                >
                  <LogIn size={15} />
                  Log in
                </Link>
                <Link
                  to="/auth"
                  className="btn-primary text-sm !py-1.5 !px-3.5"
                >
                  <UserPlus size={15} />
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile: ThemeToggle + NotificationBell + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            {isAuth && <NotificationBell onOpenChat={(convId) => openChat(convId ?? null)} />}
            <button
              className="p-2 rounded-lg text-[#74685C] dark:text-[#A89A8A] hover:text-[#30291F] dark:hover:text-[#F6EFE6] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D] transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#E9DFD1] dark:border-[#382E25] bg-[#FAF6EF] dark:bg-[#171411] py-3 flex flex-col gap-1 px-4 shadow-md">
            {isAuth ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === link.to
                        ? 'bg-[#FAEEE9] dark:bg-[rgba(217,115,78,0.18)] text-[#B85C38] dark:text-[#D9734E] font-semibold'
                        : 'text-[#74685C] dark:text-[#A89A8A] hover:text-[#30291F] dark:hover:text-[#F6EFE6] hover:bg-[#F3EBDD] dark:hover:bg-[#2C241D]',
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                {roleMeta && (
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border w-fit ml-3 mt-1',
                    roleMeta.cls,
                  )}>
                    {roleMeta.icon}
                    {roleMeta.label}
                  </div>
                )}

                <div className="h-px bg-[#E9DFD1] dark:bg-[#382E25] my-2" />

                <button
                  onClick={() => { setMenuOpen(false); setIsProfileOpen(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                             text-[#B85C38] dark:text-[#D9734E] hover:bg-[#FAEEE9] dark:hover:bg-[rgba(217,115,78,0.14)] transition-colors text-left"
                >
                  <UserPlus size={15} />
                  Profile Settings
                </button>

                <div className="h-px bg-[#E9DFD1] dark:bg-[#382E25] my-2" />

                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                             text-[#C24134] dark:text-[#F07167] hover:bg-[#FDEEED] dark:hover:bg-[rgba(194,65,52,0.18)] transition-colors text-left"
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
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium
                             text-[#30291F] dark:text-[#F6EFE6] bg-[#F3EBDD] dark:bg-[#2C241D] hover:bg-[#ECE3D3] transition-colors"
                >
                  <LogIn size={15} />
                  Log in
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-center justify-center w-full"
                >
                  <UserPlus size={15} />
                  Sign up
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
