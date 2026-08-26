import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import TableGenerator from "@components/Common/TableGenerator";
import { useNavigate, useSearchParams } from "react-router-dom";
import { entityFormPath } from "../../utils/formRoutes";
import FormDraftBanner from "@components/Forms/FormDraftBanner";
import ProfileImage from "@components/Common/ProfileImage";
import FilterDropdown from "@components/Common/FilterDropdown";
import {
  Plus, TicketCheck, Pencil, ArrowRightCircle,
  CheckCircle2, Search, X, SlidersHorizontal
} from "lucide-react";
import * as Icons from "lucide-react";

// ── Design-system chips ────────────────────────────────────────────────────────

const PRIORITY_CLS = {
  Critical: "bg-[var(--tracker-danger-light)]  text-[var(--tracker-danger)]",
  High: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Medium: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Low: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
};

const STATUS_CLS = {
  "Open": "bg-[var(--tracker-info-light)]    text-[var(--tracker-info)]",
  "In Progress": "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  "Review": "bg-[var(--module-hr-light)]       text-[var(--module-hr)]",
  "Testing": "bg-[var(--brand-teal-light)]      text-[var(--brand-teal)]",
  "Completed": "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
  "Closed": "bg-surface-2 text-ink-muted",
};

const PriorityChip = ({ value }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tracker-sm text-[11px] font-semibold ${PRIORITY_CLS[value] || PRIORITY_CLS.Medium}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    {value || "Medium"}
  </span>
);

const StatusChip = ({ value }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_CLS[value] || "bg-surface-2 text-ink-muted"}`}>
    {value}
  </span>
);

const TypeChip = ({ value }) => {
  const name = value?.name || value || "Bug";
  const color = value?.color || "var(--module-ticket)";
  const icon = value?.icon;

  const bg = color.startsWith("var(")
    ? color.replace(")", "-light)")
    : "rgba(99, 102, 241, 0.08)";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ color: color, backgroundColor: bg }}
    >
      {icon && (() => {
        const LucideIcon = Icons[icon] || Icons.HelpCircle;
        return <LucideIcon size={11} className="flex-shrink-0" style={{ color: color }} />;
      })()}
      {name}
    </span>
  );
};

// ── Stat pill (Context-Carrying 2026 Standard) ─────────────────────────────────

const StatPill = ({ label, value, cls, pulseColor, trend }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all hover:scale-[1.02] shadow-xs ${cls}`}>
    {pulseColor && (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
      </span>
    )}
    <span className="font-bold">{value}</span>
    <span className="opacity-80">{label}</span>
    {trend && <span className="text-[10px] font-bold opacity-90 ml-0.5">{trend}</span>}
  </span>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUSES = ["Open", "In Progress", "Review", "Testing", "Completed", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const TicketsPage = () => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentTab, setCurrentTab] = useState(searchParams.get("tab") || "all");

  const [fStatus, setFStatus] = useState(searchParams.get("status") || null);
  const [fPriority, setFPriority] = useState(searchParams.get("priority") || null);
  const [fType, setFType] = useState(searchParams.get("type") || null);
  const [fAssignee, setFAssignee] = useState(searchParams.get("assignee") || null);
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  // Sync state if URL search parameters change
  useEffect(() => {
    const qStatus = searchParams.get("status");
    const qPriority = searchParams.get("priority");
    const qType = searchParams.get("type");
    const qTab = searchParams.get("tab");
    if (qStatus) setFStatus(qStatus);
    if (qPriority) setFPriority(qPriority);
    if (qType) setFType(qType);
    if (qTab) setCurrentTab(qTab);
  }, [searchParams]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const tRes = await axiosInstance.post("/populate/read/tickets", {
        fields: "title,type,priority,status,dueDate,createdAt,updatedAt,isConvertedToTask,userStory,description,ticketId,assignedTo,accountManager,createdBy,linkedTaskId,unreadCommentsCount",
        populateFields: {
          assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
          accountManager: "basicInfo.firstName,basicInfo.lastName",
          createdBy: "basicInfo.firstName,basicInfo.lastName",
          type: "name,icon,color",
          linkedTaskId: "title,status",
        },
        limit: 500,
      });
      setTickets(tRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePushToTask = async (ticket) => {
    try {
      await axiosInstance.put(`/populate/update/tickets/${ticket._id}`, { pushTaskSync: true });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (ticket) => navigate(entityFormPath("/Tickets", ticket._id));

  // ── Client-side filtering ────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let d = tickets;

    // Filter by tab segment
    if (currentTab === "my") {
      d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === userId));
    } else if (currentTab === "unassigned") {
      d = d.filter(t => !t.assignedTo || t.assignedTo.length === 0);
    } else if (currentTab === "overdue") {
      d = d.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed" && t.status !== "Closed");
    } else if (currentTab === "resolved_today") {
      d = d.filter(t => t.status === "Completed" && new Date(t.updatedAt).toDateString() === new Date().toDateString());
    }

    if (fStatus) d = d.filter(t => t.status === fStatus);
    if (fPriority) d = d.filter(t => t.priority === fPriority);
    if (fType) d = d.filter(t => (t.type?.name || t.type) === fType);
    if (fAssignee) d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === fAssignee));
    if (fDateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(fDateFrom));
    if (fDateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(fDateTo + "T23:59:59"));

    // Sort by updatedAt descending
    return [...d].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [tickets, currentTab, userId, fStatus, fPriority, fType, fAssignee, fDateFrom, fDateTo]);

  const activeFilters = [fStatus, fPriority, fType, fAssignee, fDateFrom, fDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFStatus(null); setFPriority(null);
    setFType(null); setFAssignee(null); setFDateFrom(""); setFDateTo("");
  };

  // ── Derived stat counts for tabs & pills ───────────────────────────────────────

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const openCount = tickets.filter(t => t.status === "Open").length;
  const inProgCount = tickets.filter(t => t.status === "In Progress").length;
  const criticalCount = tickets.filter(t => t.priority === "Critical").length;
  const resolvedCount = tickets.filter(t => t.status === "Completed" && new Date(t.updatedAt) > weekAgo).length;

  const myCount = tickets.filter(t => t.assignedTo?.some(a => String(a._id || a) === userId)).length;
  const unassignedCount = tickets.filter(t => !t.assignedTo || t.assignedTo.length === 0).length;
  const overdueCount = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed" && t.status !== "Closed").length;
  const resolvedTodayCount = tickets.filter(t => t.status === "Completed" && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length;

  const statusOptions = STATUSES.map(s => ({
    value: s, label: s,
    color: { 'Open': 'var(--tracker-info)', 'In Progress': 'var(--tracker-warning)', 'Review': 'var(--module-hr)', 'Testing': 'var(--brand-teal)', 'Completed': 'var(--tracker-success)', 'Closed': 'var(--ink-subtle)' }[s] || 'var(--ink-subtle)',
  }));

  const priorityOptions = PRIORITIES.map(p => ({
    value: p, label: p,
    color: { 'Critical': 'var(--tracker-danger)', 'High': 'var(--tracker-warning)', 'Medium': 'var(--tracker-warning)', 'Low': 'var(--tracker-success)' }[p] || 'var(--ink-subtle)',
  }));

  // ── Custom renders ───────────────────────────────────────────────────────────

  const customRender = {
    priority: t => <PriorityChip value={t.priority} />,
    status: t => <StatusChip value={t.status} />,
    type: t => <TypeChip value={t.type} />,

    unread: t => {
      const count = t.unreadCommentsCount || 0;
      if (count === 0) return <span className="text-ink-subtle text-[11px]">—</span>;
      return (
        <span className="inline-flex items-center justify-center bg-[var(--module-ticket)] text-white text-[10px] font-bold rounded-full w-5 h-5">
          {count}
        </span>
      );
    },

    pendingAction: t => {
      let actionLabel = "No Action";
      let badgeCls = "bg-surface-2 text-ink-muted";

      if (!t.assignedTo || t.assignedTo.length === 0) {
        actionLabel = "Needs Assignment";
        badgeCls = "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]";
      } else if (t.status === "Resolved" || t.status === "Completed") {
        actionLabel = "Archived";
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeCls}`}>
          {actionLabel}
        </span>
      );
    },

    lastResponse: t => {
      const date = t.updatedAt || t.createdAt;
      if (!date) return <span className="text-ink-subtle">—</span>;

      const diffMs = Date.now() - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let relativeStr = "";
      if (diffMins < 1) relativeStr = "Just now";
      else if (diffMins < 60) relativeStr = `${diffMins}m ago`;
      else if (diffHours < 24) relativeStr = `${diffHours}h ago`;
      else relativeStr = `${diffDays}d ago`;

      return (
        <span className="text-[12px] text-ink-muted" title={new Date(date).toLocaleString()}>
          {relativeStr}
        </span>
      );
    },

    title: t => (
      <span
        className="max-w-[260px] truncate block font-medium text-[13px] text-ink"
        title={t.title}
      >
        {t.title || "—"}
      </span>
    ),

    accountManager: t => {
      const p = t.accountManager?.basicInfo || t.assignedTo?.[0]?.basicInfo;
      return <span className="text-[13px] text-ink-muted">{p ? `${p.firstName} ${p.lastName}` : "—"}</span>;
    },

    userStory: t => (
      <span className="max-w-[220px] truncate block text-[13px] text-ink-muted" title={t.userStory}>
        {t.userStory || "—"}
      </span>
    ),

    assignedTo: t => {
      if (!t.assignedTo?.length) return <span className="text-ink-subtle">—</span>;
      return (
        <div className="flex items-center gap-1">
          {t.assignedTo.slice(0, 3).map((a, i) => (
            <ProfileImage
              key={i}
              profileImage={a?.basicInfo?.profileImage}
              firstName={a?.basicInfo?.firstName}
              lastName={a?.basicInfo?.lastName}
              px={24}
              title={`${a?.basicInfo?.firstName || ""} ${a?.basicInfo?.lastName || ""}`.trim()}
            />
          ))}
          {t.assignedTo.length > 3 && (
            <span className="text-[11px] font-semibold text-ink-muted px-1">+{t.assignedTo.length - 3}</span>
          )}
        </div>
      );
    },

    linkedTaskId: t => t.linkedTaskId ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--tracker-success-light)] text-[var(--tracker-success)]">
        <CheckCircle2 size={11} /> Linked
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-2 text-ink-muted">No Task</span>
    ),

    __actions: ticket => {
      const converted = ticket.isConvertedToTask || Boolean(ticket.linkedTaskId);
      return (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => handleEdit(ticket)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-tracker-md bg-[var(--module-ticket-light)] text-[var(--module-ticket)] hover:bg-[var(--module-ticket)] hover:text-white transition-colors"
            title="Edit">
            <Pencil size={12} />
          </button>
          <button
            onClick={() => !converted && handlePushToTask(ticket)}
            disabled={converted}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-tracker-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${converted
                ? "bg-surface-2 text-ink-muted"
                : "bg-[var(--tracker-info-light)] text-[var(--tracker-info)] hover:bg-[var(--tracker-info)] hover:text-white"
              }`}
            title={converted ? "Already converted" : "Push to Task"}>
            <ArrowRightCircle size={12} />
          </button>
        </div>
      );
    },
  };

  const customExport = {
    linkedTaskId: t => t.linkedTaskId ? "Linked" : "No Task",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--module-ticket)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="space-y-3" data-module="ticket">
      <FormDraftBanner model="tickets" formPath={entityFormPath("/Tickets")} label="ticket" />

      {/* ── Page header & Inline stats ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-hairline-soft pb-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div>
            <p className="lmx-page-eyebrow mb-0">SUPPORT TICKETS</p>
            <h1 className="text-[18px] font-semibold text-ink flex items-center gap-2 tracking-tight">
              <TicketCheck size={18} style={{ color: "var(--module-ticket)" }} />
              Ticket Queue
            </h1>
          </div>
          {/* Vertical divider on larger screens */}
          <div className="hidden md:block w-px h-5 bg-hairline-soft self-center mt-2" />

          {/* Stat pills (Context-Carrying Metric Ribbon) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 md:mt-2">
            <StatPill label="Open" value={openCount} cls="bg-[var(--tracker-info-light)] text-[var(--tracker-info)]" />
            <StatPill label="In Progress" value={inProgCount} cls="bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" pulseColor="bg-amber-500" />
            <StatPill label="Critical" value={criticalCount} cls="bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]" pulseColor="bg-red-500" />
            <StatPill label="Resolved" value={resolvedCount} cls="bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" trend="↑ 7d" />
            <span className="text-[11px] text-ink-subtle pl-1 self-center">{tickets.length} total</span>
            {activeFilters > 0 && (
              <span className="text-[11px] text-[var(--module-ticket)] font-semibold pl-2">
                ({displayed.length} filtered)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center shrink-0 lg:mt-3">
          {/* Toggle advanced filters */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold border transition-all duration-150 cursor-pointer ${showFilters || activeFilters > 0
                ? "border-[var(--module-ticket)] bg-[var(--module-ticket-light)] text-[var(--module-ticket)]"
                : "border-hairline bg-surface text-ink-muted hover:text-ink hover:border-ink-subtle"
              }`}
          >
            <SlidersHorizontal size={13} />
            Filters {activeFilters > 0 && <span className="ml-0.5 bg-[var(--module-ticket)] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">{activeFilters}</span>}
          </button>

          <button
            onClick={() => navigate(entityFormPath("/Tickets"))}
            className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 shrink-0">
            <Plus size={13} /> New Ticket
          </button>
        </div>
      </div>

      {/* ── Tabbed Workspace Segments ── */}
      <div className="lmx-tab-bar overflow-x-auto min-w-max">
        <button
          onClick={() => setCurrentTab("all")}
          className={`lmx-tab ${currentTab === "all" ? "lmx-tab-active" : ""}`}
        >
          All Queue <span className="ml-1 opacity-60 font-normal">({tickets.length})</span>
        </button>
        <button
          onClick={() => setCurrentTab("my")}
          className={`lmx-tab ${currentTab === "my" ? "lmx-tab-active" : ""}`}
        >
          My Tickets <span className="ml-1 opacity-60 font-normal">({myCount})</span>
        </button>
        <button
          onClick={() => setCurrentTab("unassigned")}
          className={`lmx-tab ${currentTab === "unassigned" ? "lmx-tab-active" : ""}`}
        >
          Unassigned <span className="ml-1 opacity-60 font-normal">({unassignedCount})</span>
        </button>
        <button
          onClick={() => setCurrentTab("overdue")}
          className={`lmx-tab ${currentTab === "overdue" ? "lmx-tab-active" : ""}`}
        >
          Overdue <span className="ml-1 opacity-60 font-normal">({overdueCount})</span>
        </button>
        <button
          onClick={() => setCurrentTab("resolved_today")}
          className={`lmx-tab ${currentTab === "resolved_today" ? "lmx-tab-active" : ""}`}
        >
          Resolved Today <span className="ml-1 opacity-60 font-normal">({resolvedTodayCount})</span>
        </button>
      </div>

      {/* ── Filter bar ── */}
      {showFilters && (
        <div className="tracker-card-plain p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="All Statuses" value={fStatus} onChange={setFStatus}
              options={statusOptions} type="status"
              accentColor="var(--module-ticket)"
            />
            <FilterDropdown
              label="All Priorities" value={fPriority} onChange={setFPriority}
              options={priorityOptions} type="status"
              accentColor="var(--module-ticket)"
            />
            <FilterDropdown
              label="All Types" value={fType} onChange={setFType}
              type="default"
              model="task_types"
              fetchFields="name,icon,color"
              fetchTransform={item => ({
                value: item.name,
                label: item.name,
                icon: item.icon,
                color: item.color
              })}
              accentColor="var(--module-ticket)"
            />
            <FilterDropdown
              label="All Assignees" value={fAssignee} onChange={setFAssignee}
              type="member"
              model="employees"
              fetchFields="basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage"
              accentColor="var(--module-ticket)"
            />
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-ink-muted font-semibold">From</label>
              <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className="lmx-input py-1.5 text-[12px] w-[130px]" />
              <label className="text-[11px] text-ink-muted font-semibold">To</label>
              <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className="lmx-input py-1.5 text-[12px] w-[130px]" />
            </div>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[11px] font-semibold bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)] hover:bg-[var(--tracker-danger)] hover:text-white transition-all duration-100 ml-auto"
              >
                <X size={11} /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <TableGenerator
          title="All Tickets"
          data={displayed}
          customRender={customRender}
          customExport={customExport}
          customColumns={["unread", "title", "type", "priority", "status", "pendingAction", "assignedTo", "lastResponse"]}
          enableActions
          onEdit={handleEdit}
          onRowClick={(row) => navigate(`/Tickets/${row._id}`)}
        />
      </div>
    </div>
  );
};

export default TicketsPage;
