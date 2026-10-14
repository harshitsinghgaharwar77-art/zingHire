/**
 * @file LiveChatDrawer.tsx
 * @description Real-Time 1-on-1 Recruiter ↔ Candidate Messaging Drawer.
 * Built with Socket.io streaming, typing wave relays, optimistic message delivery,
 * double checkmark read receipts, presence monitoring, date grouping, and auto-URL parsing.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Check,
  CheckCheck,
  Briefcase,
  ChevronLeft,
  Circle,
  Sparkles,
  ExternalLink,
  FileText,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import api from '../lib/axios';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { playNotificationChime } from './NotificationBell';

export interface ChatSender {
  id: string;
  email: string;
  role: 'STUDENT' | 'RECRUITER' | 'ADMIN';
  studentProfile?: { firstName: string; lastName: string } | null;
  recruiterProfile?: { companyName: string; designation: string } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  sender?: ChatSender;
}

export interface ConversationItem {
  id: string;
  applicationId: string;
  recruiterId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  application: {
    id: string;
    status: string;
    matchScore: number | null;
    job: {
      id: string;
      title: string;
      recruiter: {
        id: string;
        email: string;
        recruiterProfile?: { companyName: string; designation: string } | null;
      };
    };
    student: {
      id: string;
      firstName: string;
      lastName: string;
      college: string;
      cgpa: number;
      resumeUrl: string | null;
      user: { id: string; email: string };
    };
  };
  messages: ChatMessage[];
  _count: { messages: number };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string | null;
}

// Format message content with clickable URLs
function renderMessageContent(content: string, isMine: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline font-medium break-all transition-colors inline-flex items-center gap-0.5 ${
            isMine ? 'text-white/90 hover:text-white' : 'text-warm-terracotta dark:text-warm-darkTerracotta hover:underline'
          }`}
        >
          {part}
          <ExternalLink size={10} className="inline ml-0.5" />
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// Group date separators
function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const QUICK_EMOJIS = ['👍', '🤝', '🎯', '🎉', '📅', '🚀', '💡'];

export default function LiveChatDrawer({ isOpen, onClose, initialConversationId }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const currentUserRole = useAuthStore((s) => s.user?.role);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch all conversations for current user
  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await api.get<{ success: boolean; data: ConversationItem[] }>('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.warn('[LiveChatDrawer] Error loading conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMsg(true);
      const res = await api.get<{
        success: boolean;
        data: { conversation: ConversationItem; messages: ChatMessage[] };
      }>(`/chat/conversations/${convId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data.messages);
        setTimeout(() => scrollToBottom('auto'), 80);

        // Notify socket that messages in this conversation are read
        const socket = getSocket();
        socket.emit('chat:mark_read', { conversationId: convId });

        // Update local unread counter in list
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, _count: { messages: 0 } } : c)),
        );
      }
    } catch (err) {
      console.error('[LiveChatDrawer] Error loading messages:', err);
    } finally {
      setLoadingMsg(false);
    }
  };

  // Initialize drawer & handle passed initial conversation ID
  useEffect(() => {
    if (isOpen) {
      void fetchConversations();
      if (initialConversationId) {
        setActiveConvId(initialConversationId);
      }
    } else {
      setActiveConvId(null);
      setMessages([]);
      setInputValue('');
    }
  }, [isOpen, initialConversationId]);

  // Load messages when activeConvId changes
  useEffect(() => {
    if (activeConvId) {
      void fetchMessages(activeConvId);
      const socket = getSocket();
      socket.emit('chat:join', { conversationId: activeConvId });

      return () => {
        socket.emit('chat:leave', { conversationId: activeConvId });
      };
    }
  }, [activeConvId]);

  // Setup Socket listeners for real-time messages, typing waves, and presence
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (newMsg: ChatMessage) => {
      if (activeConvId === newMsg.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);

        // If I am looking at this conversation and the message is from peer, mark read immediately
        if (newMsg.senderId !== currentUserId) {
          socket.emit('chat:mark_read', { conversationId: newMsg.conversationId });
        }
      } else {
        // Increment unread in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newMsg.conversationId
              ? {
                  ...c,
                  messages: [newMsg],
                  _count: { messages: (c._count?.messages ?? 0) + 1 },
                }
              : c,
          ),
        );
        playNotificationChime();
      }
    };

    const handleMessagesRead = (data: { conversationId: string; readByUserId: string }) => {
      if (activeConvId === data.conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m)),
        );
      }
    };

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (activeConvId === data.conversationId && data.userId !== currentUserId) {
        setPeerTyping(data.isTyping);
      }
    };

    const handlePresence = (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.isOnline) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:read', handleMessagesRead);
    socket.on('chat:typing', handleTyping);
    socket.on('user:presence', handlePresence);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:read', handleMessagesRead);
      socket.off('chat:typing', handleTyping);
      socket.off('user:presence', handlePresence);
    };
  }, [activeConvId, currentUserId]);

  // Handle Send Message (Optimistic Dispatch)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || !activeConvId || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConvId,
      senderId: currentUserId || '',
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputValue('');
    setShowEmojiPicker(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    // Stop typing relay
    const socket = getSocket();
    socket.emit('chat:typing', { conversationId: activeConvId, isTyping: false });

    try {
      setSending(true);
      const res = await api.post<{ success: boolean; data: ChatMessage }>(
        `/chat/conversations/${activeConvId}/messages`,
        { content: text },
      );
      if (res.data.success) {
        // Swap optimistic message with official saved message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data.data : m)),
        );
        // Update snippet in conversation item list
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, messages: [res.data.data] } : c)),
        );
      }
    } catch (err) {
      console.error('[LiveChatDrawer] Failed to send message:', err);
      // Remove failed optimistic msg
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Broadcast typing wave with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!activeConvId) return;

    const socket = getSocket();
    socket.emit('chat:typing', { conversationId: activeConvId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { conversationId: activeConvId, isTyping: false });
    }, 1500);
  };

  // Find active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId);
  }, [conversations, activeConvId]);

  // Derived peer details
  const peerDetails = useMemo(() => {
    if (!activeConversation) return null;
    const isStudent = currentUserRole === 'STUDENT';
    const app = activeConversation.application;
    if (isStudent) {
      const company = app.job.recruiter.recruiterProfile?.companyName || app.job.recruiter.email;
      const desig = app.job.recruiter.recruiterProfile?.designation || 'Hiring Team';
      const isOnline = onlineUsers.has(activeConversation.recruiterId);
      return {
        name: company,
        subtitle: `${desig} · ${app.job.title}`,
        isOnline,
        matchScore: app.matchScore,
        resumeUrl: null,
      };
    } else {
      const studentName = `${app.student.firstName} ${app.student.lastName}`.trim() || app.student.user.email;
      const subtitle = `${app.student.college} · ${app.job.title}`;
      const isOnline = onlineUsers.has(activeConversation.studentId);
      return {
        name: studentName,
        subtitle,
        isOnline,
        matchScore: app.matchScore,
        resumeUrl: app.student.resumeUrl,
      };
    }
  }, [activeConversation, currentUserRole, onlineUsers]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Messages grouped with date markers
  const messageGroups = useMemo(() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const dateKey = formatDateSeparator(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.items.push(msg);
      } else {
        groups.push({ date: dateKey, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Drawer Container (Wellfound Clean Slate) */}
      <div
        className="relative w-full max-w-lg bg-warm-canvas dark:bg-warm-darkCard border-l border-warm-border dark:border-warm-darkBorder shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-warm-border dark:border-warm-darkBorder bg-white dark:bg-warm-darkElevated flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeConvId && (
              <button
                type="button"
                onClick={() => setActiveConvId(null)}
                className="p-1 -ml-1 text-warm-muted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal rounded-lg hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors flex-shrink-0 cursor-pointer"
                title="Back to conversations"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              {peerDetails ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm truncate max-w-[200px]"
                      style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
                    >
                      {peerDetails.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        peerDetails.isOnline
                          ? 'text-[#2D7A58] dark:text-[#52C58E] bg-[#EAF5EF] dark:bg-[#142A1E] border-[#C3E6D3] dark:border-[#1E4D34]'
                          : 'text-warm-muted bg-warm-sandTint dark:bg-warm-darkElevated border-warm-border dark:border-warm-darkBorder'
                      }`}
                    >
                      <Circle
                        size={5}
                        className={peerDetails.isOnline ? 'fill-[#2D7A58] animate-pulse' : 'fill-warm-muted'}
                      />
                      {peerDetails.isOnline ? 'Online' : 'Offline'}
                    </span>
                    {peerDetails.matchScore !== null && (
                      <span className="text-[10px] font-bold text-warm-terracotta dark:text-warm-darkTerracotta bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder px-1.5 py-0.5 rounded">
                        {peerDetails.matchScore}% Match
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-warm-muted dark:text-warm-darkMuted truncate mt-0.5">{peerDetails.subtitle}</p>
                </div>
              ) : (
                <div>
                  <h2 className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
                    <MessageSquare size={16} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                    Messages
                  </h2>
                  <p className="text-xs text-warm-muted dark:text-warm-darkMuted">Direct 1-on-1 candidate and recruiter chat</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {peerDetails?.resumeUrl && (
              <a
                href={peerDetails.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warm-sandTint dark:bg-warm-darkElevated hover:bg-warm-border/50 border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal text-xs font-semibold transition-colors"
                title="Open Candidate's Resume"
              >
                <FileText size={12} />
                <span>Resume</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-warm-muted hover:text-warm-charcoal dark:hover:text-warm-darkCharcoal rounded-lg hover:bg-warm-sandTint dark:hover:bg-warm-darkElevated transition-colors cursor-pointer"
              title="Close chat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!activeConvId ? (
          /* Conversation List */
          <div className="flex-1 overflow-y-auto divide-y divide-warm-border dark:divide-warm-darkBorder p-2">
            {loadingConv ? (
              <div className="py-20 text-center text-xs text-warm-muted flex flex-col items-center gap-2">
                <span className="w-4 h-4 border-2 border-warm-terracotta border-t-transparent rounded-full animate-spin" />
                <span>Syncing conversations…</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-24 text-center px-6 animate-in fade-in duration-200">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder flex items-center justify-center text-warm-terracotta">
                  <MessageSquare size={22} />
                </div>
                <h3 className="font-bold text-warm-charcoal dark:text-warm-darkCharcoal text-sm mb-1">No Active Chats Yet</h3>
                <p className="text-xs text-warm-muted dark:text-warm-darkMuted max-w-xs mx-auto leading-relaxed">
                  {currentUserRole === 'RECRUITER'
                    ? 'Shortlist a candidate to unlock a private live chat channel with them!'
                    : 'Once a recruiter shortlists your application, your live chat channel will appear here!'}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-warm-muted bg-warm-sandTint dark:bg-warm-darkElevated px-3 py-1 rounded-full border border-warm-border dark:border-warm-darkBorder">
                  <ShieldCheck size={12} className="text-[#2D7A58] dark:text-[#52C58E]" />
                  <span>Real-time End-to-End WebSocket Channel</span>
                </div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isStudent = currentUserRole === 'STUDENT';
                const name = isStudent
                  ? conv.application.job.recruiter.recruiterProfile?.companyName || conv.application.job.recruiter.email
                  : `${conv.application.student.firstName} ${conv.application.student.lastName}`.trim() ||
                    conv.application.student.user.email;
                const jobTitle = conv.application.job.title;
                const lastMsg = conv.messages[0];
                const unread = conv._count?.messages ?? 0;
                const peerId = isStudent ? conv.recruiterId : conv.studentId;
                const isOnline = onlineUsers.has(peerId);

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className="p-3 rounded-xl cursor-pointer hover:bg-warm-sandTint/40 dark:hover:bg-warm-darkElevated/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-xl bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder flex items-center justify-center font-bold text-warm-terracotta dark:text-warm-darkTerracotta text-xs flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#2D7A58] border-2 border-white dark:border-warm-darkCard rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-warm-charcoal dark:text-warm-darkCharcoal truncate group-hover:text-warm-terracotta transition-colors">
                            {name}
                          </p>
                          <span className="text-[10px] text-warm-muted font-medium bg-warm-sandTint dark:bg-warm-darkElevated px-1.5 py-0.2 rounded border border-warm-border dark:border-warm-darkBorder truncate">
                            {jobTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-warm-muted dark:text-warm-darkMuted truncate mt-0.5">
                          {lastMsg ? lastMsg.content : 'Chat channel unlocked. Say hello!'}
                        </p>
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-warm-terracotta text-white text-[10px] font-bold shadow-xs flex-shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Active Chat Room View */
          <div className="flex-1 flex flex-col min-h-0 bg-warm-canvas dark:bg-warm-darkCard">
            {/* Quick Chips for fast professional interaction */}
            <div className="px-3 py-2 bg-warm-sandTint/30 dark:bg-warm-darkElevated/30 border-b border-warm-border dark:border-warm-darkBorder flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-warm-muted tracking-wider flex items-center gap-1 flex-shrink-0">
                <Sparkles size={11} className="text-warm-terracotta dark:text-warm-darkTerracotta" />
                Quick:
              </span>
              {(currentUserRole === 'RECRUITER'
                ? [
                    'Hi! We loved your profile.',
                    'When are you free for a call?',
                    'Here is our assignment repository.',
                    'Could you share your GitHub link?',
                  ]
                : [
                    'Thank you for shortlisting me!',
                    'I am available for an interview this week.',
                    'Here is my portfolio & project link.',
                    'Happy to answer any technical questions!',
                  ]
              ).map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSendMessage(chip)}
                  className="px-2.5 py-0.5 rounded-full bg-white dark:bg-warm-darkElevated hover:bg-warm-sandTint text-warm-charcoal dark:text-warm-darkCharcoal text-[11px] font-medium border border-warm-border dark:border-warm-darkBorder transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsg ? (
                <div className="py-14 text-center text-xs text-warm-muted flex flex-col items-center gap-2">
                  <span className="w-4 h-4 border-2 border-warm-terracotta border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to secure chat channel…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center animate-in fade-in duration-200">
                  <div className="inline-flex p-3 rounded-2xl bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-terracotta mb-2">
                    <Briefcase size={20} />
                  </div>
                  <p className="text-xs font-semibold text-warm-charcoal dark:text-warm-darkCharcoal">Private hiring channel established</p>
                  <p className="text-[11px] text-warm-muted dark:text-warm-darkMuted mt-1 max-w-xs mx-auto leading-relaxed">
                    Say hello to discuss role expectations, project assignments, or interview timings.
                  </p>
                </div>
              ) : (
                messageGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2.5">
                    {/* Date Divider */}
                    <div className="flex items-center justify-center my-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-warm-sandTint dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-[9px] font-bold text-warm-muted uppercase tracking-wider">
                        {group.date}
                      </span>
                    </div>

                    {group.items.map((msg) => {
                      const isMine = msg.senderId === currentUserId;
                      const time = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed break-words transition-all ${
                              isMine
                                ? 'bg-warm-terracotta text-white rounded-tr-none shadow-xs'
                                : 'bg-white dark:bg-warm-darkElevated border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal rounded-tl-none shadow-xs'
                            }`}
                          >
                            <div>{renderMessageContent(msg.content, isMine)}</div>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isMine ? 'text-white/80' : 'text-warm-muted'
                              }`}
                            >
                              <span>{time}</span>
                              {isMine &&
                                (msg.isRead ? (
                                  <span title="Read">
                                    <CheckCheck size={12} className="text-white font-bold" />
                                  </span>
                                ) : (
                                  <span title="Sent">
                                    <Check size={12} className="text-white/80" />
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Peer typing indicator */}
              {peerTyping && (
                <div className="flex items-center gap-2 text-warm-muted text-xs pl-1 animate-in fade-in duration-150">
                  <div className="flex gap-1 items-center bg-white dark:bg-warm-darkElevated px-2.5 py-1 rounded-full border border-warm-border dark:border-warm-darkBorder shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-terracotta animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-terracotta animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-terracotta animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1 text-[10px] font-medium text-warm-muted">typing…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar (Toggled) */}
            {showEmojiPicker && (
              <div className="px-3 py-1.5 bg-warm-sandTint/50 dark:bg-warm-darkElevated border-t border-warm-border dark:border-warm-darkBorder flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 duration-150">
                <span className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">React:</span>
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputValue((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-warm-sandTint rounded text-sm transition-transform active:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-warm-border dark:border-warm-darkBorder bg-white dark:bg-warm-darkElevated">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    showEmojiPicker
                      ? 'bg-warm-sandTint dark:bg-warm-darkCard text-warm-terracotta border-warm-terracotta'
                      : 'bg-warm-sandTint/40 dark:bg-warm-darkCard text-warm-muted hover:text-warm-charcoal border-warm-border dark:border-warm-darkBorder'
                  }`}
                  title="Emoji"
                >
                  <Smile size={16} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 px-3.5 py-2 rounded-lg bg-warm-sandTint/30 dark:bg-warm-darkCard border border-warm-border dark:border-warm-darkBorder text-warm-charcoal dark:text-warm-darkCharcoal placeholder-warm-muted/60 text-xs focus:outline-none focus:border-warm-terracotta focus:ring-1 focus:ring-warm-terracotta transition-all"
                />
                <button
                  type="button"
                  disabled={!inputValue.trim() || sending}
                  onClick={() => void handleSendMessage()}
                  className="p-2 rounded-lg bg-warm-terracotta hover:bg-warm-terracottaHover text-white disabled:opacity-40 transition-all shadow-sm flex-shrink-0 active:scale-95 cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
