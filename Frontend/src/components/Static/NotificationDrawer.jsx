/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNotification } from "../../context/notificationProvider";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Ticket,
  FolderKanban,
  Calendar,
  MessageSquare,
  AtSign,
  Clock
} from "lucide-react";
import ProfileImage from "../Common/ProfileImage.jsx";

const NotificationDrawer = ({ isOpen, setIsOpen }) => {
  const { notifications, markAsRead, deleteNotification, clearAll } = useNotification();
  const drawerRef = useRef(null);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMentions, setFilterMentions] = useState(false);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if we clicked the bell button itself (to let the toggle work)
      if (event.target.closest('[aria-label="Notifications"]')) {
        return;
      }
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Helper to parse notification text to match the mockup: Sender · Ticket ID – Ticket Title
  const parseNotificationText = (notif) => {
    const type = notif.type;
    const msg = notif.message || "";
    const title = notif.title || "";

    let displaySender = notif.sender
      ? `${notif.sender.basicInfo?.firstName || ""} ${notif.sender.basicInfo?.lastName || ""}`.trim()
      : "System";

    let displayTitle = title;
    let displaySubtitle = msg;

    // If it's a ticket or task, separate details by colon
    if (type?.startsWith("ticket") || msg.includes("ticket:") || msg.includes("Ticket:")) {
      const colonIndex = msg.indexOf(":");
      if (colonIndex !== -1) {
        displayTitle = msg.substring(colonIndex + 1).trim();
        displaySubtitle = msg.substring(0, colonIndex).trim();
      }
    } else if (type === "task_assigned" || type === "task") {
      const colonIndex = msg.indexOf(":");
      if (colonIndex !== -1) {
        displayTitle = msg.substring(colonIndex + 1).trim();
        displaySubtitle = msg.substring(0, colonIndex).trim();
      }
    }

    return { displaySender, displayTitle, displaySubtitle };
  };

  // Get module-based styling configurations
  const getTypeConfig = (type) => {
    switch (type) {
      case "ticket_assigned":
      case "ticket_converted":
      case "ticket":
        return {
          icon: Ticket,
          colorClass: "text-[#E11D48] bg-[#FFE4EC] dark:bg-[#E11D48]/20",
          moduleColor: "var(--module-ticket)"
        };
      case "task_assigned":
      case "task":
        return {
          icon: FolderKanban,
          colorClass: "text-[#0EA5E9] bg-[#E0F2FE] dark:bg-[#0EA5E9]/20",
          moduleColor: "var(--module-project)"
        };
      case "leave":
        return {
          icon: Calendar,
          colorClass: "text-[#7C3AED] bg-[#EDE9FE] dark:bg-[#7C3AED]/20",
          moduleColor: "var(--module-hr)"
        };
      case "comment":
      case "mention":
      case "post":
        return {
          icon: MessageSquare,
          colorClass: "text-[#6C3DE8] bg-[#EEF0FB] dark:bg-[#6C3DE8]/20",
          moduleColor: "var(--brand-solid)"
        };
      default:
        return {
          icon: Bell,
          colorClass: "text-[#8890A8] bg-[#F0F2FA] dark:bg-[#8890A8]/20",
          moduleColor: "var(--tracker-ink-muted)"
        };
    }
  };

  // Get initials for avatar monogram
  const getInitials = (sender) => {
    if (!sender?.basicInfo) return "?";
    const first = sender.basicInfo.firstName || "";
    const last = sender.basicInfo.lastName || "";
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  };

  // Hash code mapping for unique avatar colors
  const getAvatarBg = (name) => {
    if (!name) return "bg-gray-100 text-gray-600";
    const colors = [
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Format time relative or simple text
  const formatTime = (dateStr) => {
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

  // Filter and search calculations
  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch =
      (notif.message && notif.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (notif.title && notif.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMentions = !filterMentions || notif.type === "mention";

    return matchesSearch && matchesMentions;
  });

  const unreadCount = notifications.filter((n) => !(n.isRead || n.read)).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!(n.isRead || n.read)) {
        markAsRead(n._id);
      }
    });
  };

  return (
    <div
      ref={drawerRef}
      className="fixed right-0 top-[var(--topbar-height)] bottom-0 w-full sm:w-[350px] bg-surface text-ink shadow-xl flex flex-col border-l border-hairline z-40 transition-all duration-200"
      style={{ boxShadow: "var(--tracker-shadow-overlay)", backgroundColor: "var(--tracker-surface)" }}
    >
      {/* Header with Brand Gradient */}
      <div
        className="px-4 py-3 text-white flex items-center justify-between"
        style={{ background: "var(--tracker-gradient-brand)" }}
      >
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Notifications</h2>
            <p className="text-[12px] text-white/75 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread updates` : "All caught up!"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Action Controls Bar */}
      <div className="p-2 border-b border-hairline-soft flex items-center gap-1 bg-surface-1/40">
        {/* Search box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-tracker-md border border-hairline bg-surface text-ink focus:outline-none focus:border-[var(--tracker-border-focus)] transition-all"
          />
        </div>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2.5 py-1.5 rounded-tracker-md border border-red-100 dark:border-red-900/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            {unreadCount}
          </div>
        )}

        {/* Mention Filter Toggle */}
        <button
          onClick={() => setFilterMentions(prev => !prev)}
          className={`p-2 rounded-tracker-md border transition-all ${filterMentions
            ? "bg-[var(--module-accent-light)] text-[var(--module-accent)] border-[var(--module-accent)] font-semibold"
            : "bg-surface hover:bg-surface-1 text-ink-muted border-hairline"
            }`}
          title="Filter by mentions"
          aria-label="Mentions filter"
        >
          <AtSign className="h-4 w-4" />
        </button>

        {/* Mark All Read Button */}
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="p-2 rounded-tracker-md border bg-surface hover:bg-surface-1 text-ink-muted border-hairline disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Mark all as read"
          aria-label="Mark all read"
        >
          <CheckCheck className="h-4 w-4" />
        </button>

        {/* Clear All Button */}
        <button
          onClick={clearAll}
          disabled={notifications.length === 0}
          className="p-2 rounded-tracker-md border bg-surface hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-ink-muted border-hairline disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Clear all notifications"
          aria-label="Clear all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Notification List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-canvas/40">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 border-bottom bg-surface-1 flex items-center justify-center mb-3 text-ink-subtle">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-ink">No notifications found</p>
            <p className="text-xs text-ink-subtle mt-1 px-4">
              {searchQuery || filterMentions
                ? "Try adjusting your search query or filters"
                : "We'll notify you when something updates."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isRead = notif.isRead || notif.read;
            const { displaySender, displayTitle, displaySubtitle } = parseNotificationText(notif);
            const config = getTypeConfig(notif.type);
            const TypeIcon = config.icon;

            return (
              <div
                key={notif._id}
                onClick={() => {
                  if (!isRead) {
                    markAsRead(notif._id);
                  }
                  if (notif.relatedModel && notif.relatedId) {
                    navigate(`/${notif.relatedModel}/${notif.relatedId}`);
                  } else if (notif.meta?.model && notif.meta?.modelId) {
                    navigate(`/${notif.meta.model}/${notif.meta.modelId}`);
                  } else if (notif.path) {
                    navigate(notif.path);
                  }
                  setIsOpen(false);
                }}
                className={`group relative flex items-start p-3 border-b border-hairline-soft transition-all duration-150 cursor-pointer ${isRead
                  ? "bg-transparent text-ink-muted hover:bg-surface-2/40"
                  : "bg-surface-1 text-ink hover:bg-surface-2/80 font-medium"
                  }`}
              >
                {/* Unread Status Yellow Dot */}
                {!isRead && (
                  <div className="absolute top-4 left-1.5">
                    <span className="h-2 w-2 rounded-full bg-yellow-500 block animate-pulse" title="Unread" />
                  </div>
                )}

                {/* Avatar Section */}
                <div className={`relative flex-shrink-0 ${!isRead ? "ml-2.5" : ""}`}>
                  {notif.sender?.basicInfo?.profileImage ? (
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-hairline">
                      <ProfileImage
                        profileImage={notif.sender.basicInfo.profileImage}
                        firstName={notif.sender.basicInfo.firstName}
                        lastName={notif.sender.basicInfo.lastName}
                        size="sm"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold border border-hairline/20 ${getAvatarBg(
                        displaySender
                      )}`}
                    >
                      {getInitials(notif.sender)}
                    </div>
                  )}

                  {/* Overlapping Type Icon Badge */}
                  <div
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] shadow-sm border border-white dark:border-gray-800 ${config.colorClass}`}
                  >
                    <TypeIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Content Info Section */}
                <div className="ml-3 flex-1 min-w-0 pr-8">
                  {/* Header: Sender · Title */}
                  <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
                    <span className="font-semibold text-ink text-[13px]">{displaySender}</span>
                    {displayTitle && (
                      <>
                        <span className="text-ink-subtle font-normal">·</span>
                        <span className="font-medium text-ink-muted truncate max-w-[220px]">
                          {displayTitle}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Subtitle / Message */}
                  <p
                    className={`text-xs mt-1 leading-relaxed break-words line-clamp-2 ${isRead ? "text-ink-subtle" : "text-ink-muted font-medium"
                      }`}
                  >
                    {displaySubtitle}
                  </p>

                  {/* Time footer */}
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-ink-subtle">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(notif.createdAt)}</span>
                  </div>
                </div>

                {/* Item Actions Overlay Column (Visible on Hover/Focus) */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-surface pl-2 py-1">
                  {!isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif._id);
                      }}
                      className="p-1.5 rounded-tracker-sm bg-surface-1 hover:bg-[var(--module-accent-light)] text-ink-muted hover:text-[var(--module-accent)] transition-all"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif._id);
                    }}
                    className="p-1.5 rounded-tracker-sm bg-surface-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 text-ink-muted transition-all"
                    title="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationDrawer;
