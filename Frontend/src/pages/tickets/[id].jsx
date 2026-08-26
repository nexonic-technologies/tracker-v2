import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import InlineEdit from "../../components/Common/InLineEdit";
import FileViewerModal from "../../components/Common/FileViewerModal";
import { useAuth } from "../../context/authProvider";
import { useNotification } from "../../context/notificationProvider";
import ProfileImage from "../../components/Common/ProfileImage.jsx";
import {
  MessageSquare, ExternalLink, UserPlus, Check, Flag, Tag, CalendarDays,
  Clock, ArrowUpRight, Lock, Send, Paperclip, X, Download, ImageIcon,
  FileIcon, FileText, FileSpreadsheet, FileArchive, PlayCircle, Music,
  Users, ChevronLeft, Globe, AlertTriangle, Link2, Activity, Info,
  Pencil, CheckCheck, Eye, Plus, MoreHorizontal, Loader2, Hash,
  ChevronDown, AtSign, Smile, Bold, Italic, Code, List, RefreshCw, Trash2
} from "lucide-react";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_OPTS = ["Open", "In Progress", "Review", "Testing", "Completed", "Closed"];

const STATUS_CLS = {
  "Open": "bg-[hsl(213,94%,95%)] text-[hsl(213,80%,42%)] border border-[hsl(213,70%,82%)]",
  "In Progress": "bg-[hsl(38,92%,93%)] text-[hsl(38,80%,35%)] border border-[hsl(38,65%,75%)]",
  "Review": "bg-[hsl(258,85%,95%)] text-[hsl(258,60%,50%)] border border-[hsl(258,55%,80%)]",
  "Testing": "bg-[hsl(174,72%,92%)] text-[hsl(174,65%,30%)] border border-[hsl(174,55%,72%)]",
  "Completed": "bg-[hsl(142,72%,92%)] text-[hsl(142,65%,28%)] border border-[hsl(142,55%,72%)]",
  "Closed": "bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] border border-[var(--tracker-border)]",
};

const PRIORITY_CLS = {
  Critical: "bg-[hsl(0,90%,95%)] text-[hsl(0,75%,42%)] border border-[hsl(0,65%,80%)]",
  High: "bg-[hsl(25,90%,94%)] text-[hsl(25,80%,38%)] border border-[hsl(25,65%,78%)]",
  Medium: "bg-[hsl(45,90%,93%)] text-[hsl(45,75%,32%)] border border-[hsl(45,65%,74%)]",
  Low: "bg-[hsl(142,65%,92%)] text-[hsl(142,60%,28%)] border border-[hsl(142,55%,72%)]",
};

const PRIORITY_DOT = {
  Critical: "bg-[hsl(0,85%,55%)]",
  High: "bg-[hsl(25,88%,52%)]",
  Medium: "bg-[hsl(45,90%,48%)]",
  Low: "bg-[hsl(142,65%,40%)]",
};

const getFileIcon = (mimetype) => {
  const mt = mimetype || "";
  if (mt.startsWith("image/")) return <ImageIcon className="text-pink-500 flex-shrink-0" size={15} />;
  if (mt.includes("pdf")) return <FileText className="text-red-500 flex-shrink-0" size={15} />;
  if (mt.includes("spreadsheet") || mt.includes("excel") || mt.includes("sheet"))
    return <FileSpreadsheet className="text-green-500 flex-shrink-0" size={15} />;
  if (mt.includes("zip") || mt.includes("rar") || mt.includes("archive"))
    return <FileArchive className="text-yellow-600 flex-shrink-0" size={15} />;
  if (mt.includes("video/")) return <PlayCircle className="text-purple-500 flex-shrink-0" size={15} />;
  if (mt.includes("audio/")) return <Music className="text-blue-500 flex-shrink-0" size={15} />;
  return <FileIcon className="text-[var(--tracker-ink-subtle)] flex-shrink-0" size={15} />;
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatRelativeTime = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const getInitials = (firstName = "", lastName = "", name = "") => {
  if (name) return name.slice(0, 2).toUpperCase();
  return ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || "?";
};



// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({ firstName, lastName, name, size = 32, className = "" }) => {
  const initials = getInitials(firstName, lastName, name);
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-teal-100 text-teal-700",
  ];
  const idx = (initials.charCodeAt(0) || 0) % colors.length;
  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold select-none ${colors[idx]} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
};

// ── EditableSection ─────────────────────────────────────────────────────────────
// Always-visible inline textarea that saves on blur. Shows a muted placeholder
// when the field is empty so users know it exists and can click to fill it.
const EditableSection = ({ icon, label, value, placeholder, rows = 3, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  // Sync when ticket data reloads
  useEffect(() => { setDraft(value || ""); }, [value]);

  const startEdit = () => {
    setDraft(value || "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleBlur = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === (value || "").trim()) return; // no change
    setSaving(true);
    try { await onSave(trimmed || ""); }
    finally { setSaving(false); }
  };

  const isEmpty = !value?.trim();

  return (
    <div
      className={`border-b border-[var(--tracker-border-soft)] transition-colors ${
        editing ? "bg-[var(--tracker-surface-1)]" : "hover:bg-[var(--tracker-surface-1)] cursor-pointer"
      } ${saving ? "opacity-60" : ""}`}
      onClick={!editing ? startEdit : undefined}
    >
      <div className="px-5 py-3.5">
        {/* Section label */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tracker-ink-subtle)] mb-1.5 flex items-center gap-1.5">
          {icon}
          {label}
          {saving && <span className="ml-auto text-[9px] font-normal text-[var(--tracker-ink-tertiary)] animate-pulse">Saving…</span>}
          {!editing && !saving && (
            <span className="ml-auto text-[9px] font-normal text-[var(--tracker-ink-tertiary)] opacity-0 group-hover:opacity-100">
              Click to edit
            </span>
          )}
        </p>
        {editing ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full bg-transparent border border-[var(--tracker-border-focus)] rounded-lg px-3 py-2 text-[13px] text-[var(--tracker-ink)] leading-relaxed resize-none outline-none focus:ring-2 focus:ring-[var(--module-ticket)]/20 placeholder:text-[var(--tracker-ink-tertiary)] transition-all"
            style={{ minHeight: `${rows * 1.6}em` }}
          />
        ) : isEmpty ? (
          <p className="text-[13px] text-[var(--tracker-ink-tertiary)] italic leading-relaxed">
            {placeholder}
          </p>
        ) : (
          <p className="text-[13.5px] text-[var(--tracker-ink)] leading-relaxed whitespace-pre-wrap">
            {value}
          </p>
        )}
      </div>
    </div>
  );
};


// ── Status Select ──────────────────────────────────────────────────────────────
const StatusSelect = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${STATUS_CLS[value] || STATUS_CLS["Open"]}`}
      >
        {value || "Open"}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-xl shadow-lg py-1.5 min-w-[140px]">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-[var(--tracker-surface-1)] transition-colors flex items-center gap-2 ${value === s ? "font-semibold" : ""}`}
            >
              {value === s && <Check size={11} className="text-[var(--module-ticket)] flex-shrink-0" />}
              {value !== s && <span className="w-3 flex-shrink-0" />}
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Comment Card ───────────────────────────────────────────────────────────────
const CommentCard = ({
  comment,
  commentReads,
  currentUserId,
  onViewFile,
  onEditComment,
  onDeleteComment
}) => {
  const isPublic = comment.isPublic !== false;

  // Resolve commenter/author details from commentedBy or createdBy
  const commenter = comment.commentedBy || comment.createdBy;
  const commenterId = commenter?._id || commenter;
  const isMe = String(commenterId) === String(currentUserId);

  const firstName = commenter?.basicInfo?.firstName || "";
  const lastName = commenter?.basicInfo?.lastName || "";
  const agentName = commenter?.name || "";
  const isAgent = commenter?.model === "agents" || comment.commenterModel === "agents";
  const displayName = isAgent ? agentName : (`${firstName} ${lastName}`.trim() || "Participant");

  const profileImage = commenter?.basicInfo?.profileImage;

  const reads = (commentReads || []).filter(r => String(r.commentId) === String(comment._id));
  const allRead = reads.length > 0;

  // Local State for Inline Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(comment.message || comment.comment || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dynamic Countdown Timer for 15-min Window
  const [remainingSec, setRemainingSec] = useState(
    comment.remainingEditTimeSeconds != null ? comment.remainingEditTimeSeconds : null
  );

  useEffect(() => {
    if (remainingSec == null || remainingSec <= 0) return;
    const interval = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSec]);

  // Evaluate dynamic capabilities (server-provided, augmented with local countdown)
  const canEdit = Boolean(comment.canEdit && (remainingSec == null || remainingSec > 0));
  const canDelete = Boolean(comment.canDelete && (remainingSec == null || remainingSec > 0));

  const formatTimer = (seconds) => {
    if (seconds == null) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s left`;
    return `${s}s left`;
  };

  const handleSaveEdit = async () => {
    if (!editMessage.trim() || editMessage === '<p><br></p>') return;
    setIsSaving(true);
    try {
      if (onEditComment) {
        await onEditComment(comment._id, editMessage);
      }
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteComment) {
        await onDeleteComment(comment._id);
      }
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`group relative ${!isPublic ? "pl-3 border-l-2 border-[hsl(38,75%,62%)]" : ""}`}>
      {/* Comment header row */}
      <div className="flex items-start gap-2.5">
        <ProfileImage
          profileImage={profileImage}
          firstName={firstName}
          lastName={lastName}
          px={28}
          className="shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          {/* Name + meta row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="text-[12px] font-bold text-[var(--tracker-ink)]">
              {isMe ? "You" : displayName}
            </span>
            {isAgent && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(258,80%,95%)] text-[hsl(258,65%,48%)]">
                Client
              </span>
            )}
            {!isPublic && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(38,90%,92%)] text-[hsl(38,75%,32%)]">
                <Lock size={8} /> Internal
              </span>
            )}
            {comment.edited && (
              <span className="text-[9.5px] italic text-[var(--tracker-ink-subtle)]" title={`Edited on ${formatDate(comment.editedAt)}`}>
                edited
              </span>
            )}
            <span className="text-[10.5px] text-[var(--tracker-ink-subtle)] ml-auto flex items-center gap-1">
              {remainingSec != null && remainingSec > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9.5px] text-[hsl(38,80%,38%)] bg-[hsl(38,90%,93%)] px-1.5 py-0.5 rounded-full">
                  <Clock size={9} />{formatTimer(remainingSec)}
                </span>
              )}
              {formatRelativeTime(comment.createdAt || comment.commentedAt)}
              {isMe && (
                <span className="ml-0.5">
                  {allRead ? <CheckCheck size={11} className="text-[hsl(213,80%,55%)]" /> : <Check size={11} className="text-[var(--tracker-ink-tertiary)]" />}
                </span>
              )}
            </span>
          </div>

          {/* Comment body */}
          {isEditing ? (
            <div className="space-y-2">
              <div className="bg-[var(--tracker-surface)] rounded-xl border border-[var(--tracker-border-focus)] p-2">
                <textarea
                  rows={3}
                  value={editMessage}
                  onChange={e => setEditMessage(e.target.value)}
                  className="w-full text-[13px] text-[var(--tracker-ink)] bg-transparent outline-none resize-none"
                  placeholder="Edit comment…"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditMessage(comment.message || comment.comment || ""); }}
                  disabled={isSaving}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--tracker-ink-muted)] hover:bg-[var(--tracker-surface-2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold bg-[var(--module-ticket)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={10} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className="text-[13px] text-[var(--tracker-ink)] leading-relaxed break-words whitespace-pre-wrap"
            >
              {comment.message?.replace(/<img[^>]*src=["']data:image[^"']*["'][^>]*>/gi, '').replace(/<[^>]*>/g, '') || comment.message || comment.comment}
            </div>
          )}

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && !isEditing && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {comment.attachments.map((att, idx) => {
                if (!att) return null;
                const isImage = att.mimetype?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || att.filename || "");
                const fileUrl = att.path
                  ? (att.path.startsWith("http") ? att.path : `${import.meta.env.VITE_API_URL || ""}${att.path.startsWith("/") ? "" : "/"}${att.path}`)
                  : null;

                if (isImage && fileUrl) {
                  return (
                    <div
                      key={att._id || idx}
                      onClick={() => onViewFile(att)}
                      className="group/img relative rounded-xl overflow-hidden border border-[var(--tracker-border)] bg-[var(--tracker-surface-2)] cursor-pointer hover:border-[var(--module-ticket)] transition-all shadow-xs"
                      title={att.originalName || "View image"}
                    >
                      <img
                        src={fileUrl}
                        alt={att.originalName || "Attachment"}
                        className="h-20 w-24 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                        <Eye size={13} />
                        <span className="text-[10px] font-medium">View</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={att._id || idx}
                    type="button"
                    onClick={() => onViewFile(att)}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] hover:border-[var(--module-ticket)] text-[11.5px] font-medium text-[var(--tracker-ink)] hover:text-[var(--module-ticket)] transition-all cursor-pointer shadow-xs"
                  >
                    {getFileIcon(att.mimetype)}
                    <span className="max-w-[150px] truncate">{att.originalName || att.filename || "Attachment"}</span>
                    {att.size && <span className="text-[9.5px] text-[var(--tracker-ink-subtle)] font-normal">{formatBytes(att.size)}</span>}
                    <Download size={11} className="text-[var(--tracker-ink-subtle)]" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Hover action row */}
          {!isEditing && (canEdit || canDelete) && (
            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors"
                >
                  <Pencil size={10} /> Edit
                </button>
              )}
              {canDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[hsl(0,65%,55%)] hover:bg-[hsl(0,80%,96%)] transition-colors"
                >
                  <Trash2 size={10} /> Delete
                </button>
              )}
              {showDeleteConfirm && (
                <div className="inline-flex items-center gap-1.5 bg-[var(--tracker-surface)] border border-[hsl(0,60%,82%)] rounded-lg px-2 py-0.5 shadow-sm text-[10px]">
                  <span className="text-[hsl(0,65%,45%)] font-semibold">Delete?</span>
                  <button onClick={handleDelete} disabled={isDeleting} className="font-bold text-[hsl(0,65%,45%)] hover:underline disabled:opacity-50">
                    {isDeleting ? "Deleting…" : "Yes"}
                  </button>
                  <span className="text-[var(--tracker-ink-tertiary)]">·</span>
                  <button onClick={() => setShowDeleteConfirm(false)} className="text-[var(--tracker-ink-muted)] hover:underline">No</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Activity Log Item ──────────────────────────────────────────────────────────
const ActivityItem = ({ log }) => {
  const firstName = log.performedBy?.basicInfo?.firstName || "";
  const lastName = log.performedBy?.basicInfo?.lastName || "";
  const name = log.performedBy?.name || `${firstName} ${lastName}`.trim() || "System";

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-6 h-6 rounded-full bg-[var(--tracker-surface-2)] border border-[var(--tracker-border)] flex items-center justify-center">
          <Activity size={11} className="text-[var(--tracker-ink-subtle)]" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-4 border-b border-[var(--tracker-border-soft)] last:border-0 last:pb-0">
        <p className="text-[12.5px] text-[var(--tracker-ink)] leading-snug">
          <span className="font-semibold">{name}</span>{" "}
          <span className="text-[var(--tracker-ink-muted)]">{log.action}</span>
        </p>
        <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
          {formatRelativeTime(log.createdAt)}
        </p>
      </div>
    </div>
  );
};

// ── Right Panel Section ────────────────────────────────────────────────────────
const PanelSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--tracker-border-soft)] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--tracker-surface-1)] transition-colors group"
      >
        <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider">
          {Icon && <Icon size={12} />}
          {title}
        </div>
        <ChevronDown
          size={13}
          className={`text-[var(--tracker-ink-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
};

// ── Field Row ──────────────────────────────────────────────────────────────────
const FieldRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2 py-1.5 group">
    <span className="text-[10.5px] font-semibold text-[var(--tracker-ink-subtle)] shrink-0 tracking-wide">{label}</span>
    <div className="text-right max-w-[60%]">{children}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useNotification();

  // ── State ──────────────────────────────────────────────────────────────────
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [activity_logs, setactivity_logs] = useState([]);
  const [commentReads, setCommentReads] = useState([]);

  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("public");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("details"); // details | activity | participants
  const [viewerFile, setViewerFile] = useState(null);

  const assignRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const composerRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTicketSilently = useCallback(async () => {
    try {
      const populateFields = {
        clientId: "name",
        type: "name,color,icon",
        createdBy: "basicInfo.firstName,basicInfo.lastName",
        assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        "comments": "ticketId,message,comment,commentedBy,commenterModel,isPublic,createdAt,updatedAt,commentedAt,attachments",
        "comments.commentedBy": "basicInfo.firstName,basicInfo.lastName,name,basicInfo.profileImage",
        "comments.attachments": "filename,originalName,mimetype,size,path",
        attachments: "filename,originalName,mimetype,size,uploadedBy,uploadedByModel,path",
        linkedTaskId: "title,status",
      };
      const res = await axiosInstance.post(`/populate/read/tickets/${id}`, {
        populateFields
      });
      setTicket(res.data.data);

      const readsRes = await axiosInstance.post("/populate/read/ticket_comment_reads", {
        filter: { commentId: { $in: (res.data.data.comments || []).map(c => c._id) } },
      });
      setCommentReads(readsRes.data.data || []);
    } catch (e) {
      console.error("Ticket fetch error:", e);
    }
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await axiosInstance.post("/populate/read/ticket_participants", {
        filter: { ticketId: id },
        populateFields: { userId: "basicInfo.firstName,basicInfo.lastName,name" },
      });
      setParticipants(res.data.data || []);
    } catch (e) { console.error(e); }
  }, [id]);

  const fetchactivity_logs = useCallback(async () => {
    try {
      const res = await axiosInstance.post("/populate/read/ticket_activity_logs", {
        filter: { ticketId: id },
        populateFields: { performedBy: "basicInfo.firstName,basicInfo.lastName,name" },
        sort: { createdAt: -1 },
      });
      setactivity_logs(res.data.data || []);
    } catch (e) { console.error(e); }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTicketSilently(), fetchParticipants(), fetchactivity_logs()]);
      setLoading(false);
    };
    init();

    const closeDropdown = (e) => {
      if (assignRef.current && !assignRef.current.contains(e.target))
        setShowAssignDropdown(false);
    };
    document.addEventListener("mousedown", closeDropdown);

    const fetchEmployees = async () => {
      try {
        const res = await axiosInstance.post("/populate/read/employees", {
          fields: "basicInfo.firstName,basicInfo.lastName",
        });
        setEmployees(res.data.data || []);
      } catch (e) { console.error(e); }
    };
    fetchEmployees();

    return () => document.removeEventListener("mousedown", closeDropdown);
  }, [id, fetchTicketSilently, fetchParticipants, fetchactivity_logs]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !id) return;

    const onCommentAdded = (payload) => {
      if (String(payload.comment?.ticketId) !== String(id)) return;
      setTicket(prev => {
        if (!prev) return prev;
        const comments = prev.comments || [];
        if (comments.some(c => String(c._id) === String(payload.comment._id))) return prev;
        return { ...prev, comments: [...comments, payload.comment] };
      });
    };

    const onStatusChanged = (payload) => {
      if (String(payload.ticketId || id) !== String(id)) return;
      setTicket(prev => prev ? { ...prev, status: payload.newStatus } : prev);
      fetchactivity_logs();
    };

    const onCommentRead = (payload) => {
      if (String(payload.ticketId || id) !== String(id)) return;
      fetchTicketSilently();
    };

    const onTyping = ({ ticketId: tid, userId: uid, isTyping }) => {
      if (String(tid) !== String(id)) return;
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) {
          const p = participants.find(p => String(p.userId?._id || p.userId) === String(uid));
          const name = p?.userId?.basicInfo
            ? `${p.userId.basicInfo.firstName} ${p.userId.basicInfo.lastName}`
            : (p?.userId?.name || "Someone");
          next[uid] = { name, lastActive: Date.now() };
        } else {
          delete next[uid];
        }
        return next;
      });
    };

    socket.on("comment_added", onCommentAdded);
    socket.on("status_changed", onStatusChanged);
    socket.on("comment_read", onCommentRead);
    socket.on("ticket_typing", onTyping);

    return () => {
      socket.off("comment_added", onCommentAdded);
      socket.off("status_changed", onStatusChanged);
      socket.off("comment_read", onCommentRead);
      socket.off("ticket_typing", onTyping);
    };
  }, [socket, id, participants, fetchTicketSilently, fetchactivity_logs]);

  // Typing cleanup timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([uid, info]) => {
          if (now - info.lastActive > 4000) { delete next[uid]; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleUpdate = async (field, value) => {
    try {
      await axiosInstance.put(`/populate/update/tickets/${id}`, { [field]: value });
      setTicket(prev => ({ ...prev, [field]: value }));
      toast.success("Updated");
      fetchactivity_logs();
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    }
  };

  const handleAssign = async (empId) => {
    const current = ticket.assignedTo || [];
    if (current.some(a => (a._id || a) === empId)) return;
    const updated = [...current.map(a => a._id || a), empId];
    await handleUpdate("assignedTo", updated);
    fetchTicketSilently();
    fetchParticipants();
  };

  const handleUnassign = async (empId) => {
    const updated = (ticket.assignedTo || [])
      .map(a => a._id || a)
      .filter(a => a !== empId);
    await handleUpdate("assignedTo", updated);
    fetchTicketSilently();
    fetchParticipants();
  };

  const handleConvertToTask = async () => {
    try {
      await axiosInstance.put(`/populate/update/tickets/${id}`, { pushTaskSync: true });
      fetchTicketSilently();
      fetchactivity_logs();
      toast.success("Converted to task!");
    } catch {
      toast.error("Failed to convert to task");
    }
  };

  const handleCommentInput = (value) => {
    setNewComment(value);
    if (socket && !isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("ticket_typing", { ticketId: id, isTyping: true });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("ticket_typing", { ticketId: id, isTyping: false });
      }
    }, 2000);
  };

  const handleCommentPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const fileName = file.name && file.name !== "image.png"
            ? file.name
            : `comment_screenshot_${Date.now()}_${i + 1}.png`;
          pastedFiles.push(new File([file], fileName, { type: file.type || "image/png" }));
        }
      }
    }
    if (pastedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pastedFiles]);
      toast.success(`${pastedFiles.length} file${pastedFiles.length > 1 ? "s" : ""} attached from clipboard`);
    }
  }, []);

  const submitComment = async () => {
    const isEmpty = !newComment.trim() || newComment === '<p><br></p>' || newComment === '<p></p>';
    if (isEmpty && selectedFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      const attachmentIds = [];
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append("ticketId", id);
        fd.append("attachments", file);
        const res = await axiosInstance.post("/populate/create/ticket_attachments", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.data?._id) attachmentIds.push(res.data.data._id);
      }
      await axiosInstance.post("/populate/create/ticket_comments", {
        ticketId: id,
        message: newComment,
        isPublic: commentType === "public",
        attachments: attachmentIds,
      });
      setNewComment("");
      setSelectedFiles([]);
      if (socket && isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("ticket_typing", { ticketId: id, isTyping: false });
      }
      await fetchTicketSilently();
      await fetchactivity_logs();
      toast.success(commentType === "public" ? "Reply sent" : "Internal note added");
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId, message) => {
    try {
      await axiosInstance.put(`/populate/update/ticket_comments/${commentId}`, { message });
      setTicket(prev => {
        if (!prev) return prev;
        const comments = (prev.comments || []).map(c => {
          if (String(c._id) === String(commentId)) {
            return { ...c, message, edited: true, editedAt: new Date() };
          }
          return c;
        });
        return { ...prev, comments };
      });
      toast.success("Comment updated");
      fetchactivity_logs();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message || "Failed to update comment";
      toast.error(msg);
      throw e;
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axiosInstance.delete(`/populate/delete/ticket_comments/${commentId}`);
      setTicket(prev => {
        if (!prev) return prev;
        const comments = (prev.comments || []).filter(c => String(c._id) !== String(commentId));
        return { ...prev, comments };
      });
      toast.success("Comment deleted");
      fetchactivity_logs();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message || "Failed to delete comment";
      toast.error(msg);
      throw e;
    }
  };

  const isAssigned = (empId) =>
    (ticket?.assignedTo || []).some(a => (a._id || a) === empId);

  // ── Derived ────────────────────────────────────────────────────────────────
  const sortedComments = [...(ticket?.comments || [])].sort(
    (a, b) => new Date(a.createdAt || a.commentedAt) - new Date(b.createdAt || b.commentedAt)
  );

  // ── Loading / Error States ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tracker-canvas)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[var(--module-ticket)] animate-spin" />
          <span className="text-sm text-[var(--tracker-ink-muted)]">Loading ticket…</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[var(--tracker-canvas)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Hash size={40} className="mx-auto text-[var(--tracker-ink-subtle)] opacity-40" />
          <p className="text-[var(--tracker-ink-muted)] text-sm">Ticket not found</p>
          <button onClick={() => navigate("/Tickets")} className="tracker-btn-accent text-xs px-4 py-2">
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const assignedList = ticket.assignedTo || [];

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--tracker-canvas)]" data-module="ticket">

      {/* ── TOP HEADER BAR ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--tracker-surface)] border-b border-[var(--tracker-border)] sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* Left: breadcrumb + title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate("/Tickets")}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors shrink-0"
              >
                <ChevronLeft size={14} />
                Tickets
              </button>
              <span className="text-[var(--tracker-border)] select-none">/</span>
              <span className="text-[11px] font-mono text-[var(--tracker-ink-subtle)] shrink-0">{ticket.ticketId}</span>
              <span className="text-[var(--tracker-border)] select-none hidden sm:block">/</span>
              <h1 className="text-[13.5px] font-bold text-[var(--tracker-ink)] truncate hidden sm:block max-w-[280px] lg:max-w-[420px]">
                {ticket.title}
              </h1>
            </div>

            {/* Right: status + quick actions */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusSelect
                value={ticket.status}
                onChange={(v) => handleUpdate("status", v)}
              />
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${PRIORITY_CLS[ticket.priority] || PRIORITY_CLS.Medium}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ticket.priority] || PRIORITY_DOT.Medium}`} />
                {ticket.priority || "Medium"}
              </span>
              {!ticket.linkedTaskId && (
                <button
                  onClick={handleConvertToTask}
                  className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] hover:bg-[var(--tracker-surface-chip)] hover:text-[var(--tracker-ink)] border border-[var(--tracker-border)] transition-all"
                >
                  <ArrowUpRight size={12} />
                  Convert to Task
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6">

          {/* ╔═══════════════════════════════════════════════════════════════╗
              ║  LEFT COLUMN — TICKET CONTENT + COMMENTS                     ║
              ╚═══════════════════════════════════════════════════════════════╝ */}
          <div className="space-y-5">

            {/* ── Ticket Title + Meta ───────────────────────────────────── */}
            <div
              className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] shadow-sm"
              style={{ boxShadow: "0 1px 4px 0 hsl(var(--module-ticket-hsl,220 90% 56%) / 0.07), 0 0 0 1px hsl(var(--module-ticket-hsl,220 90% 56%) / 0.04)" }}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-[var(--tracker-border-soft)]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[var(--tracker-ink-subtle)] bg-[var(--tracker-surface-2)] px-2.5 py-1 rounded-md tracking-widest border border-[var(--tracker-border)]">
                      {ticket.ticketId}
                    </span>
                    {ticket.type && (
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                        style={{
                          color: ticket.type.color || "var(--module-ticket)",
                          background: `${ticket.type.color || "var(--module-ticket)"}18`,
                          borderColor: `${ticket.type.color || "var(--module-ticket)"}35`,
                        }}
                      >
                        {ticket.type.name || ticket.type}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/Tickets/form?id=${ticket._id}`)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--tracker-ink-muted)] hover:text-[var(--module-ticket)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--tracker-surface-1)] border border-transparent hover:border-[var(--tracker-border)]"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <h2 className="text-[19px] font-bold text-[var(--tracker-ink)] leading-snug tracking-tight">
                  {ticket.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2.5 mt-3">
                  {ticket.createdBy && (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--tracker-ink-muted)] font-medium">
                      <Avatar
                        firstName={ticket.createdBy.basicInfo?.firstName}
                        lastName={ticket.createdBy.basicInfo?.lastName}
                        size={18}
                      />
                      {ticket.createdBy.basicInfo?.firstName} {ticket.createdBy.basicInfo?.lastName}
                    </span>
                  )}
                  <span className="text-[var(--tracker-border-soft)] select-none">·</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--tracker-ink-subtle)] font-medium">
                    <CalendarDays size={11} />
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                  {ticket.clientId && (
                    <>
                      <span className="text-[var(--tracker-border-soft)] select-none">·</span>
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--tracker-ink-subtle)] font-medium">
                        <Tag size={11} />
                        {ticket.clientId.name}
                      </span>
                    </>
                  )}
                  {ticket.url && (
                    <a
                      href={ticket.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] text-[var(--module-ticket)] font-medium hover:underline"
                    >
                      <Link2 size={11} /> Reference URL
                    </a>
                  )}
                </div>
              </div>

              {/* ── Content Sections: always visible, click-to-edit ── */}
              {[
                { key: 'userStory',         icon: <Users size={10} className="text-[var(--module-ticket)]" />,       label: 'User Story',           placeholder: 'Click to add user story…',           rows: 4 },
                { key: 'description',       icon: <Info size={10} className="text-[var(--module-ticket)]" />,        label: 'Engineering Notes',    placeholder: 'Internal notes, root cause, workarounds…', rows: 3 },
                { key: 'impactAnalysis',    icon: <AlertTriangle size={10} className="text-[hsl(38,85%,45%)]" />,    label: 'Impact Analysis',      placeholder: 'Which areas are affected? Business risk?', rows: 3 },
                { key: 'acceptanceCriteria',icon: <CheckCheck size={10} className="text-[hsl(142,65%,38%)]" />,      label: 'Acceptance Criteria',  placeholder: 'List specific, testable conditions to close this ticket…', rows: 3 },
              ].map(({ key, icon, label, placeholder, rows }) => (
                <EditableSection
                  key={key}
                  fieldKey={key}
                  icon={icon}
                  label={label}
                  value={ticket[key]}
                  placeholder={placeholder}
                  rows={rows}
                  onSave={(val) => handleUpdate(key, val)}
                />
              ))}

              {/* Ticket-level Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Paperclip size={10} />
                    Attachments ({ticket.attachments.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ticket.attachments.map((att, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setViewerFile(att)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] hover:border-[var(--module-ticket)] transition-all group w-full text-left cursor-pointer"
                      >
                        {getFileIcon(att.mimetype)}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[12.5px] font-semibold text-[var(--tracker-ink)] truncate group-hover:text-[var(--module-ticket)]">
                            {att.originalName}
                          </p>
                          <p className="text-[10px] text-[var(--tracker-ink-subtle)]">{formatBytes(att.size)}</p>
                        </div>
                        <Download size={13} className="text-[var(--tracker-ink-subtle)] group-hover:text-[var(--module-ticket)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>


            {/* ── COMMENTS SECTION ──────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[var(--tracker-ink)] flex items-center gap-2">
                  <MessageSquare size={14} className="text-[var(--module-ticket)]" />
                  Comments
                  <span className="text-[11px] font-normal text-[var(--tracker-ink-subtle)]">
                    ({sortedComments.length})
                  </span>
                </h3>
                {Object.keys(typingUsers).length > 0 && (
                  <span className="text-[11px] text-[var(--tracker-ink-subtle)] italic flex items-center gap-1.5">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-[var(--tracker-ink-subtle)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-[var(--tracker-ink-subtle)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-[var(--tracker-ink-subtle)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    {Object.values(typingUsers).map(u => u.name).join(", ")} typing…
                  </span>
                )}
              </div>

              {/* ── COMPOSE BOX — top so users see it immediately ─────── */}
              <div
                onPaste={handleCommentPaste}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length > 0) {
                    setSelectedFiles(prev => [...prev, ...files]);
                    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} attached`);
                  }
                }}
                className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                commentType === "internal"
                  ? "border-[hsl(38,75%,62%)] bg-[hsl(38,95%,98%)]"
                  : "border-[var(--tracker-border)] bg-[var(--tracker-surface)] focus-within:border-[var(--module-ticket)]/50 focus-within:shadow-[0_0_0_3px_var(--module-ticket)/8%]"
              }`}>

                {/* Compose type toggle — pill style */}
                <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-2">
                  <div className="flex items-center bg-[var(--tracker-surface-2)] rounded-lg p-0.5 gap-0.5">
                    <button
                      onClick={() => setCommentType("public")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                        commentType === "public"
                          ? "bg-[var(--tracker-surface)] text-[var(--module-ticket)] shadow-sm border border-[var(--tracker-border)]"
                          : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
                      }`}
                    >
                      <Globe size={10} />
                      Public Reply
                    </button>
                    <button
                      onClick={() => setCommentType("internal")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                        commentType === "internal"
                          ? "bg-[hsl(38,90%,92%)] text-[hsl(38,80%,32%)] shadow-sm border border-[hsl(38,60%,78%)]"
                          : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
                      }`}
                    >
                      <Lock size={10} />
                      Internal Note
                    </button>
                  </div>
                  {commentType === "internal" && (
                    <span className="text-[10px] font-semibold text-[hsl(38,70%,38%)] flex items-center gap-1 ml-1">
                      <AlertTriangle size={10} />
                      Team only
                    </span>
                  )}
                </div>

                {/* Text comment composer */}
                <div className="px-3.5 pb-2">
                  <textarea
                    ref={composerRef}
                    rows={3}
                    value={newComment}
                    onChange={e => handleCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                    onBlur={() => {
                      if (socket && isTypingRef.current) {
                        isTypingRef.current = false;
                        socket.emit("ticket_typing", { ticketId: id, isTyping: false });
                      }
                    }}
                    placeholder={
                      commentType === "public"
                        ? "Write a public reply visible to the client…"
                        : "Write an internal note for team members only…"
                    }
                    className="w-full px-1 py-1 text-[13px] bg-transparent border-0 outline-none text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] resize-none"
                  />
                </div>

                {/* Staged file chips */}
                {selectedFiles.length > 0 && (
                  <div className="px-3.5 py-2 border-t border-[var(--tracker-border-soft)] flex flex-wrap gap-1.5">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] text-[11px] font-medium text-[var(--tracker-ink-muted)] max-w-[160px]"
                      >
                        {getFileIcon(file.type)}
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-[var(--tracker-ink-subtle)] hover:text-[hsl(0,75%,55%)] shrink-0 ml-0.5 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer: attach + send */}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t border-[var(--tracker-border-soft)]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file or browse (Ctrl+V to paste screenshot)"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-medium text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer"
                    >
                      <Paperclip size={13} />
                      <span className="hidden sm:inline">Attach</span>
                    </button>
                    <span className="text-[10px] text-[var(--tracker-ink-tertiary)] hidden sm:inline">
                      (or paste Ctrl+V)
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(prev => [...prev, ...files]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    multiple
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-[var(--tracker-ink-tertiary)] hidden sm:block">
                      Ctrl+Enter to send
                    </span>
                    <button
                      onClick={submitComment}
                      disabled={isSubmitting || ((!newComment.trim() || newComment === '<p><br></p>' || newComment === '<p></p>') && selectedFiles.length === 0)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        commentType === "internal"
                          ? "bg-[hsl(38,80%,42%)] text-white hover:bg-[hsl(38,80%,36%)]"
                          : "bg-[var(--module-ticket)] text-white hover:opacity-90"
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      {commentType === "public" ? "Send Reply" : "Add Note"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Comment List — below compose ──────────────────────── */}
              {sortedComments.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[12px] text-[var(--tracker-ink-tertiary)]">No replies yet — start the conversation above.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {sortedComments.map((c, i) => (
                    <CommentCard
                      key={c._id || i}
                      comment={c}
                      commentReads={commentReads}
                      participants={participants}
                      currentUserId={user?.id || user?._id}
                      onViewFile={setViewerFile}
                      onEditComment={handleEditComment}
                      onDeleteComment={handleDeleteComment}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>



          {/* ╔═══════════════════════════════════════════════════════════════╗
              ║  RIGHT SIDEBAR — DETAILS / PARTICIPANTS / ACTIVITY            ║
              ╚═══════════════════════════════════════════════════════════════╝ */}
          <div className="space-y-4">

            {/* Sidebar Tab Bar */}
            <div
              className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] overflow-hidden"
              style={{ boxShadow: "0 1px 3px 0 hsl(var(--module-ticket-hsl,220 90% 56%) / 0.06)" }}
            >
              <div className="flex border-b border-[var(--tracker-border)]">
                {[
                  { key: "details", label: "Details", Icon: Info },
                  { key: "participants", label: "People", Icon: Users },
                  { key: "activity", label: "Activity", Icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-bold transition-all border-b-2 ${activeTab === tab.key
                      ? "border-[var(--module-ticket)] text-[var(--module-ticket)] bg-[var(--module-ticket-light)]"
                      : "border-transparent text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)]"
                    }`}
                  >
                    <tab.Icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: DETAILS ─────────────────────────────────────────── */}
              {activeTab === "details" && (
                <div className="divide-y divide-[var(--tracker-border-soft)]">
                  <div className="px-4 py-3 space-y-0.5">

                    <FieldRow label="Status">
                      <StatusSelect
                        value={ticket.status}
                        onChange={(v) => handleUpdate("status", v)}
                      />
                    </FieldRow>

                    <FieldRow label="Priority">
                      <select
                        value={ticket.priority || "Medium"}
                        onChange={(e) => handleUpdate("priority", e.target.value)}
                        className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${PRIORITY_CLS[ticket.priority] || PRIORITY_CLS.Medium}`}
                      >
                        {["Low", "Medium", "High", "Critical"].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </FieldRow>

                    <FieldRow label="Type">
                      <span className="text-[12.5px] font-semibold text-[var(--tracker-ink)]">
                        {ticket.type?.name || ticket.type || "—"}
                      </span>
                    </FieldRow>

                    <FieldRow label="Client">
                      <span className="text-[12.5px] font-semibold text-[var(--tracker-ink)]">
                        {ticket.clientId?.name || "—"}
                      </span>
                    </FieldRow>

                    <FieldRow label="Due Date">
                      <input
                        type="date"
                        value={ticket.dueDate ? ticket.dueDate.split("T")[0] : ""}
                        onChange={(e) => handleUpdate("dueDate", e.target.value)}
                        className="text-[12px] px-2 py-1 rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] text-[var(--tracker-ink)] outline-none focus:border-[var(--tracker-border-focus)] transition-colors cursor-pointer"
                      />
                    </FieldRow>

                    <FieldRow label="Est. Delivery">
                      {ticket.etaEstimatedDelivery ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[12.5px] font-bold text-emerald-600 dark:text-emerald-400">
                            {new Date(ticket.etaEstimatedDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-[9.5px] font-medium text-[var(--tracker-ink-muted)]">
                            {ticket.linkedTaskId?.sprintId ? "Planned · Sprint" : "Adhoc · Queue-based"}
                          </span>
                          {ticket.etaComputedAt && (
                            <span className="text-[9px] text-[var(--tracker-ink-subtle)]">
                              Calculated {formatRelativeTime(ticket.etaComputedAt)}
                            </span>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                await axiosInstance.post(`/tickets/${id}/recalculate-eta`);
                                toast.success("Recalculation scheduled");
                                setTimeout(fetchTicketSilently, 1000);
                              } catch {
                                toast.error("Recalculation failed");
                              }
                            }}
                            className="text-[10px] font-bold text-[var(--module-ticket)] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={9} /> Recalculate
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[12px] text-[var(--tracker-ink-subtle)]">Not calculated</span>
                          {ticket.assignedTo?.length > 0 && (
                            <button
                              onClick={async () => {
                                try {
                                  await axiosInstance.post(`/tickets/${id}/recalculate-eta`);
                                  toast.success("Recalculation scheduled");
                                  setTimeout(fetchTicketSilently, 1000);
                                } catch {
                                  toast.error("Recalculation failed");
                                }
                              }}
                              className="text-[10px] font-bold text-[var(--module-ticket)] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw size={9} /> Calculate
                            </button>
                          )}
                        </div>
                      )}
                    </FieldRow>

                    <FieldRow label="Created">
                      <span className="text-[12px] text-[var(--tracker-ink-muted)]">
                        {formatRelativeTime(ticket.createdAt)}
                      </span>
                    </FieldRow>

                    <FieldRow label="Created by">
                      <span className="text-[12.5px] font-semibold text-[var(--tracker-ink)]">
                        {ticket.createdBy?.basicInfo?.firstName} {ticket.createdBy?.basicInfo?.lastName || "—"}
                      </span>
                    </FieldRow>
                  </div>

                  {/* Assignees */}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wide">
                        Assignees
                      </span>
                      <div className="relative" ref={assignRef}>
                        <button
                          onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors"
                        >
                          <UserPlus size={11} />
                        </button>
                        {showAssignDropdown && (
                          <div className="absolute right-0 top-full mt-1.5 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-xl shadow-xl py-1.5 z-30 w-52 max-h-60 overflow-y-auto">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wider border-b border-[var(--tracker-border-soft)] mb-1">
                              Assign to
                            </p>
                            {employees.map((emp) => {
                              const assigned = isAssigned(emp._id);
                              return (
                                <div
                                  key={emp._id}
                                  onClick={() => assigned ? handleUnassign(emp._id) : handleAssign(emp._id)}
                                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--tracker-surface-1)] cursor-pointer"
                                >
                                  <Avatar
                                    firstName={emp.basicInfo?.firstName}
                                    lastName={emp.basicInfo?.lastName}
                                    size={24}
                                  />
                                  <span className="text-[12.5px] text-[var(--tracker-ink)] flex-1">
                                    {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                                  </span>
                                  {assigned && <Check size={12} className="text-[var(--module-ticket)] shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {assignedList.length === 0 ? (
                      <p className="text-[12px] text-[var(--tracker-ink-tertiary)] text-center py-2">
                        No assignees yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {assignedList.map((a, idx) => {
                          const fn = a.basicInfo?.firstName || "";
                          const ln = a.basicInfo?.lastName || "";
                          return (
                            <div key={idx} className="flex items-center gap-2.5 group">
                              <Avatar firstName={fn} lastName={ln} size={26} />
                              <span className="text-[12.5px] font-medium text-[var(--tracker-ink)] flex-1 truncate">
                                {fn} {ln}
                              </span>
                              <button
                                onClick={() => handleUnassign(a._id || a)}
                                className="opacity-0 group-hover:opacity-100 text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-all"
                                title="Unassign"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Linked Task */}
                  <div className="px-5 py-4">
                    <p className="text-[11px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Link2 size={11} />
                      Linked Task
                    </p>
                    {ticket.linkedTaskId ? (
                      <a
                        href={`/tasks/${ticket.linkedTaskId._id || ticket.linkedTaskId}`}
                        className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-emerald-800 truncate group-hover:underline">
                            {ticket.linkedTaskId.title || "View Task"}
                          </p>
                          <p className="text-[10.5px] text-emerald-600 mt-0.5">
                            Status: {ticket.linkedTaskId.status || "Open"}
                          </p>
                        </div>
                        <ExternalLink size={12} className="text-emerald-600 shrink-0" />
                      </a>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-[12px] text-[var(--tracker-ink-subtle)] mb-3 leading-snug">
                          No task linked yet. Convert this ticket into a synchronized task.
                        </p>
                        <button
                          onClick={handleConvertToTask}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--module-ticket)] text-white text-[12px] font-semibold hover:opacity-90 transition-all"
                        >
                          <ArrowUpRight size={13} />
                          Convert to Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB: PARTICIPANTS ─────────────────────────────────────── */}
              {activeTab === "participants" && (
                <div className="p-5 space-y-3">
                  {participants.length === 0 ? (
                    <div className="text-center py-6">
                      <Users size={28} className="mx-auto text-[var(--tracker-ink-tertiary)] opacity-40 mb-2" />
                      <p className="text-[12px] text-[var(--tracker-ink-subtle)]">No participants yet</p>
                    </div>
                  ) : (
                    participants.map((p, idx) => {
                      const fn = p.userId?.basicInfo?.firstName || "";
                      const ln = p.userId?.basicInfo?.lastName || "";
                      const name = p.userModel === "agents"
                        ? (p.userId?.name || "Client")
                        : (`${fn} ${ln}`.trim() || "Participant");
                      return (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Avatar
                            firstName={fn}
                            lastName={ln}
                            name={p.userModel === "agents" ? (p.userId?.name || "") : ""}
                            size={32}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-[var(--tracker-ink)] truncate">{name}</p>
                            <p className="text-[11px] text-[var(--tracker-ink-subtle)] capitalize">{p.role}</p>
                          </div>
                          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${p.userModel === "agents"
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)]"
                            }`}>
                            {p.userModel === "agents" ? "Client" : "Agent"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── TAB: ACTIVITY ─────────────────────────────────────────── */}
              {activeTab === "activity" && (
                <div className="p-5">
                  {activity_logs.length === 0 ? (
                    <div className="text-center py-6">
                      <Activity size={28} className="mx-auto text-[var(--tracker-ink-tertiary)] opacity-40 mb-2" />
                      <p className="text-[12px] text-[var(--tracker-ink-subtle)]">No activity recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activity_logs.map((log) => (
                        <ActivityItem key={log._id} log={log} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
          {/* ── END RIGHT SIDEBAR ─────────────────────────────────────────── */}
        </div>
      </div>
      {viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  );
};

export default TicketDetailPage;
