'use client';

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Clock
} from "lucide-react";

import { useGenericAPI } from "../../app/useGenericAPI";

interface NotificationDrawerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function NotificationDrawer({ isOpen, setIsOpen }: NotificationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { read, update } = useGenericAPI();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[aria-label="Notifications"]')) {
        return;
      }
      if (drawerRef.current && !drawerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const agentId = localStorage.getItem('agentId');
      const data = await read('notifications', { filter: { receiver: agentId } });
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );

      await update('notifications', id, { isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Optimistic delete
      setNotifications(prev => prev.filter(n => n._id !== id));

      await update('notifications', id, { isDeleted: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead && !n.read);
    if (unread.length === 0) return;

    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      await Promise.all(
        unread.map(n => update('notifications', n._id, { isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    try {
      setNotifications([]);

      await Promise.all(
        notifications.map(n => update('notifications', n._id, { isDeleted: true }))
      );
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch =
      (n.message && n.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const unreadCount = notifications.filter(n => !(n.isRead || n.read)).length;

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      className="fixed right-0 top-[64px] bottom-0 w-full sm:w-[350px] bg-white text-ink shadow-2xl flex flex-col border-l border-border z-40 transition-all duration-200"
      style={{ 
        boxShadow: "var(--lmx-shadow-overlay)", 
        backgroundColor: "var(--lmx-surface-0)",
        borderColor: "var(--lmx-border)"
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 text-white flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, var(--lmx-brand-from), var(--lmx-brand-to))" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight leading-none">Notifications</h2>
            <p className="text-[11px] text-white/75 mt-1.5 leading-none">
              {unreadCount > 0 ? `${unreadCount} unread updates` : "All caught up!"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action Controls Bar */}
      <div className="p-2 border-b border-border flex items-center gap-1.5 bg-surface-1/40">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded border border-border bg-white text-ink focus:outline-none focus:border-brand-mid transition-all"
            style={{ borderColor: "var(--lmx-border)" }}
          />
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2 py-1.5 rounded border border-red-100">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            {unreadCount}
          </div>
        )}

        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="p-1.5 rounded border bg-white hover:bg-surface-1 text-ink-muted border-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Mark all as read"
          aria-label="Mark all read"
        >
          <CheckCheck className="h-4 w-4" />
        </button>

        <button
          onClick={handleClearAll}
          disabled={notifications.length === 0}
          className="p-1.5 rounded border bg-white hover:bg-red-50 hover:text-red-600 text-ink-muted border-border disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Clear all notifications"
          aria-label="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Notification List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-canvas/40" style={{ backgroundColor: "var(--lmx-canvas)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-mid border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 bg-surface-1 flex items-center justify-center rounded-full mb-3 text-ink-subtle">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-ink">No notifications found</p>
            <p className="text-[10px] text-ink-subtle mt-1 px-4">
              We'll notify you when tickets or comments get updated.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isRead = notif.isRead || notif.read;
            return (
              <div
                key={notif._id}
                onClick={() => {
                  if (!isRead) {
                    markAsRead(notif._id);
                  }
                }}
                className={`group relative flex items-start p-3 rounded-lg border border-border transition-all duration-150 cursor-pointer ${isRead
                  ? "bg-white text-ink-muted hover:bg-surface-1/40"
                  : "bg-surface-0 text-ink hover:bg-surface-1 font-medium shadow-sm"
                  }`}
                style={{ 
                  borderColor: "var(--lmx-border)",
                  backgroundColor: isRead ? "var(--lmx-surface-0)" : "var(--lmx-surface-chip)"
                }}
              >
                {!isRead && (
                  <div className="absolute top-4 left-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 block animate-pulse" title="Unread" />
                  </div>
                )}

                <div className={`flex-1 min-w-0 ${!isRead ? "pl-2" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink text-[12px] truncate">{notif.title}</span>
                    <span className="text-[9px] text-ink-subtle shrink-0 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 leading-normal ${isRead ? "text-ink-subtle" : "text-ink-muted"}`}>
                    {notif.message}
                  </p>
                </div>

                {/* Actions on hover */}
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1.5">
                  {!isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif._id);
                      }}
                      className="p-1 rounded hover:bg-surface-1 text-ink-muted hover:text-brand-mid transition-all"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif._id);
                    }}
                    className="p-1 rounded hover:bg-red-50 text-ink-muted hover:text-red-600 transition-all"
                    title="Dismiss notification"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
