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
          icon: <Sparkles size={15} className="text-[#2D7A58] dark:text-[#52C58E]" />,
          bg: 'bg-[#EAF5EF] dark:bg-[#142A1E] border-[#C3E6D3] dark:border-[#1E4D34]',
        };
      case 'APPLICATION_REJECTED':
        return {
          icon: <XCircle size={15} className="text-[#B83E28] dark:text-[#E57361]" />,
          bg: 'bg-[#FDF0ED] dark:bg-[#2D1612] border-[#F7CBC3] dark:border-[#4D221B]',
        };
      case 'NEW_APPLICATION_RECEIVED':
        return {
          icon: <FileText size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />,
          bg: 'bg-warm-sandTint dark:bg-warm-darkElevated border-warm-border dark:border-warm-darkBorder',
        };
      case 'NEW_CHAT_MESSAGE':
        return {
          icon: <MessageSquare size={15} className="text-warm-terracotta dark:text-warm-darkTerracotta" />,
          bg: 'bg-warm-sandTint dark:bg-warm-darkElevated border-warm-border dark:border-warm-darkBorder',
        };
      default:
        return {
          icon: <Bell size={15} className="text-warm-charcoal dark:text-warm-darkCharcoal" />,
          bg: 'bg-warm-sandTint dark:bg-warm-darkElevated border-warm-border dark:border-warm-darkBorder',
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
        className="relative p-2 rounded-lg border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-all duration-150 cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-warm-terracotta dark:text-warm-darkTerracotta' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-warm-terracotta text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Wellfound Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[340px] sm:w-[400px] rounded-xl bg-white dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-warm-border dark:border-warm-darkBorder bg-warm-sandTint/30 dark:bg-warm-darkElevated/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-warm-sandTint dark:bg-warm-darkElevated text-warm-terracotta dark:text-warm-darkTerracotta border border-warm-border dark:border-warm-darkBorder">
                <Bell size={14} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3
                    className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-xs leading-tight"
                    style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
                  >
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-warm-terracotta text-white text-[9px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal flex items-center gap-1 px-2 py-0.5 rounded hover:bg-warm-sandTint/60 transition-all cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck size={12} className="text-warm-terracotta" />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 bg-warm-sandTint/20 dark:bg-warm-darkElevated/20 border-b border-warm-border dark:border-warm-darkBorder flex items-center justify-between">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-warm-sandTint/60 dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white dark:bg-warm-darkCard text-warm-charcoal dark:text-warm-darkCharcoal shadow-xs font-bold'
                    : 'text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal'
                }`}
              >
                All <span className="opacity-70 text-[10px]">({notifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-warm-darkCard text-warm-terracotta dark:text-warm-darkTerracotta shadow-xs font-bold'
                    : 'text-warm-muted dark:text-warm-darkMuted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal'
                }`}
              >
                Unread <span className="opacity-70 text-[10px]">({unreadCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#2D7A58] dark:text-[#52C58E]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D7A58] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#2D7A58]"></span>
              </span>
              <span>Live Mesh</span>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-warm-border dark:divide-warm-darkBorder">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-warm-muted flex flex-col items-center gap-2">
                <span className="w-4 h-4 border-2 border-warm-terracotta border-t-transparent rounded-full animate-spin" />
                <span>Syncing notifications…</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-6">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder flex items-center justify-center text-warm-muted">
                  <Inbox size={18} />
                </div>
                <p className="text-xs font-bold text-warm-charcoal dark:text-warm-darkCharcoal">
                  {filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
                </p>
                <p className="text-[11px] text-warm-muted dark:text-warm-darkMuted mt-0.5 max-w-[240px] mx-auto leading-relaxed">
                  {filter === 'unread'
                    ? 'You have reviewed all your hiring alerts.'
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
                    className={`p-3 flex items-start gap-3 cursor-pointer transition-all group relative ${
                      notif.isRead
                        ? 'bg-transparent hover:bg-warm-sandTint/30 dark:hover:bg-warm-darkElevated/30'
                        : 'bg-warm-sandTint/40 dark:bg-warm-darkElevated/40 hover:bg-warm-sandTint/60 border-l-2 border-warm-terracotta'
                    }`}
                  >
                    {/* Themed Icon */}
                    <div className={`p-2 rounded-lg border flex-shrink-0 shadow-xs ${theme.bg}`}>
                      {theme.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p
                          className={`text-xs font-bold truncate ${
                            notif.isRead
                              ? 'text-warm-charcoal dark:text-warm-darkCharcoal'
                              : 'text-warm-charcoal dark:text-warm-darkCharcoal font-extrabold'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-warm-muted flex-shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-warm-muted dark:text-warm-darkMuted leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.linkUrl && (
                        <div className="mt-1.5 flex items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warm-terracotta dark:text-warm-darkTerracotta group-hover:underline">
                            {notif.linkUrl.includes('conversationId=') ? (
                              <>
                                <MessageSquare size={11} />
                                Open live chat
                              </>
                            ) : (
                              <>
                                View details & applicants
                                <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Trailing dismiss button */}
                    <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 pl-1">
                      {!notif.isRead ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-warm-terracotta" />
                      ) : (
                        <div className="w-1.5 h-1.5" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => void handleDeleteNotification(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FDF0ED] dark:hover:bg-[#2D1612] text-warm-muted hover:text-[#B83E28] transition-all ml-auto mt-auto cursor-pointer"
                        title="Dismiss notification"
                        aria-label="Dismiss notification"
                      >
                        <Trash2 size={12} />
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
