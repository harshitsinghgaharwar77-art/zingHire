/**
 * @file NotificationBell.tsx
 * @description Real-Time In-App Notification Center & Popover.
 * Synchronizes incoming system and hiring events live via Socket.io,
 * synthesizes acoustic notifications via the Web Audio API,
 * and enables instantaneous unread filtering, batch read, and dismissal.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Sparkles,
  XCircle,
  FileText,
  MessageSquare,
  Trash2,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import api from '../lib/axios';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../store/chatStore';

export interface AppNotification {
  id: string;
  type:
    | 'APPLICATION_SHORTLISTED'
    | 'APPLICATION_REJECTED'
    | 'NEW_APPLICATION_RECEIVED'
    | 'NEW_CHAT_MESSAGE'
    | 'CAMPUS_ANNOUNCEMENT';
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

// Synthesizes a clean two-tone chime (D5 -> A5) without external audio file assets
export function playNotificationChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Autoplay policy or unsupported audio environment — gracefully ignore
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface Props {
  onOpenChat?: (conversationId?: string) => void;
  className?: string;
}

export default function NotificationBell({ onOpenChat, className = '' }: Props) {
  const navigate = useNavigate();
  const openChatFromStore = useChatStore((s) => s.openChat);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from REST API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get<{
        success: boolean;
        data: { notifications: AppNotification[]; unreadCount: number };
      }>('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    // Listen to real-time notifications via Socket.io
    const socket = getSocket();
    const handleNewNotification = (notif: AppNotification) => {
      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setUnreadCount((prev) => prev + 1);
      playNotificationChime();
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notif: AppNotification) => {
    // Mark as read if not already
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[NotificationBell] Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);

    // If notification has a conversation link, open live chat
    if (notif.linkUrl?.includes('conversationId=')) {
      const match = notif.linkUrl.match(/conversationId=([^&]+)/);
      if (match?.[1]) {
        if (onOpenChat) {
          onOpenChat(match[1]);
        } else {
          openChatFromStore(match[1]);
        }
        return;
      }
    }

    // Otherwise navigate to destination URL if present
    if (notif.linkUrl) {
      let targetUrl = notif.linkUrl;
      // Normalize legacy /recruiter/dashboard -> /recruiter and /student/dashboard -> /student
      targetUrl = targetUrl
        .replace(/^\/recruiter\/dashboard/, '/recruiter')
        .replace(/^\/student\/dashboard/, '/student')
        .replace(/^\/admin\/dashboard/, '/admin');
      navigate(targetUrl);
      window.dispatchEvent(
        new CustomEvent('zinghire:notification-click', {
          detail: { notif, linkUrl: targetUrl },
        }),
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] Failed to mark all as read:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('[NotificationBell] Failed to delete notification:', err);
    }
  };

  const getNotificationTheme = (type: AppNotification['type']) => {
    switch (type) {
      case 'APPLICATION_SHORTLISTED':
        return {
          icon: <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60',
        };
      case 'APPLICATION_REJECTED':
        return {
          icon: <XCircle size={16} className="text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-800/60',
        };
      case 'NEW_APPLICATION_RECEIVED':
        return {
          icon: <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />,
          bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-800/60',
        };
      case 'NEW_CHAT_MESSAGE':
        return {
          icon: <MessageSquare size={16} className="text-sky-600 dark:text-sky-400" />,
          bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/80 dark:border-sky-800/60',
        };
      default:
        return {
          icon: <Bell size={16} className="text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/60',
        };
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) void fetchNotifications();
        }}
        className="relative p-2.5 rounded-xl text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-100 dark:hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={19} className={unreadCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-[10px] font-black text-white shadow-md shadow-rose-500/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2.5 w-[340px] sm:w-[420px] rounded-2xl bg-white dark:bg-[#161324] border border-stone-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-stone-200/80 dark:border-white/10 bg-stone-50/70 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Bell size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className="font-bold text-slate-900 dark:text-white text-sm leading-tight"
                    style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
                  >
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-stone-400 font-medium mt-0.5">
                  Activity updates & applicant alerts
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-slate-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-white/5 transition-all cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck size={13} className="text-indigo-500" />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2.5 bg-stone-100/70 dark:bg-white/[0.03] border-b border-stone-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-stone-200/60 dark:bg-white/5 border border-stone-200 dark:border-white/5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-stone-200'
                }`}
              >
                All <span className="opacity-70 text-[11px]">({notifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-stone-200'
                }`}
              >
                Unread <span className="opacity-70 text-[11px]">({unreadCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Sync</span>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100 dark:divide-white/5">
            {loading && notifications.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500 dark:text-stone-400 flex flex-col items-center gap-2.5">
                <span className="w-5 h-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Loading notifications…</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center px-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 dark:bg-white/5 border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-stone-400 dark:text-stone-500">
                  <Inbox size={22} />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-stone-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                  {filter === 'unread'
                    ? 'You have reviewed all your candidate alerts.'
                    : 'New applicants, shortlist updates, and chat messages will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const theme = getNotificationTheme(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => void handleNotificationClick(notif)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3.5 cursor-pointer transition-all group relative ${
                      notif.isRead
                        ? 'bg-transparent hover:bg-stone-50/90 dark:hover:bg-white/[0.03]'
                        : 'bg-indigo-50/50 dark:bg-indigo-950/25 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border-l-3 border-indigo-600 dark:border-indigo-400'
                    }`}
                  >
                    {/* Themed Icon */}
                    <div className={`p-2.5 rounded-xl border flex-shrink-0 shadow-xs ${theme.bg}`}>
                      {theme.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p
                          className={`text-xs font-bold truncate ${
                            notif.isRead
                              ? 'text-slate-700 dark:text-stone-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] font-medium text-stone-400 dark:text-stone-500 flex-shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-stone-300 leading-relaxed font-normal">
                        {notif.message}
                      </p>

                      {notif.linkUrl && (
                        <div className="mt-2 flex items-center">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            {notif.linkUrl.includes('conversationId=') ? (
                              <>
                                <MessageSquare size={12} />
                                Open live chat
                              </>
                            ) : (
                              <>
                                View details & applicants
                                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Trailing actions: unread indicator + dismiss button */}
                    <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 pl-1">
                      {!notif.isRead ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-500/20" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteNotification(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-stone-400 hover:text-rose-600 transition-all ml-auto mt-auto cursor-pointer"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
