import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import TableGenerator from "@components/Common/TableGenerator";
import UniversalFilterBar from "@components/Common/UniversalFilterBar";
import { useNavigate, useSearchParams } from "react-router-dom";
import { entityFormPath } from "../../utils/formRoutes";
import FormDraftBanner from "@components/Forms/FormDraftBanner";
import ProfileImage from "@components/Common/ProfileImage";
import { getUserDisplayName, getUserAvatar } from "../../utils/userUtils";
import {
  Plus, TicketCheck, Pencil, ArrowRightCircle,
  CheckCircle2, Search, X, SlidersHorizontal
} from "lucide-react";
import * as Icons from "lucide-react";

// ── Design-system chips ────────────────────────────────────────────────────────

const PRIORITY_CLS = {
  Critical: "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]",
  High: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Medium: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Low: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
};

const STATUS_CLS = {
  "Open": "bg-[var(--tracker-info-light)] text-[var(--tracker-info)]",
  "In Progress": "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  "Review": "bg-[var(--module-hr-light)] text-[var(--module-hr)]",
  "Testing": "bg-[var(--brand-teal-light)] text-[var(--brand-teal)]",
  "Completed": "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
  "Closed": "bg-surface-2 text-ink-muted",
};

const PriorityChip = ({ value }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold ${PRIORITY_CLS[value] || PRIORITY_CLS.Medium}`}>
    <span className="w-1.2 h-1.2 rounded-full bg-current opacity-70" />
    {value || "Medium"}
  </span>
);

const StatusChip = ({ value }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_CLS[value] || "bg-surface-2 text-ink-muted"}`}>
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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
      style={{ color: color, backgroundColor: bg }}
    >
      {icon && (() => {
        const LucideIcon = Icons[icon] || Icons.HelpCircle;
        return <LucideIcon size={10} className="flex-shrink-0" style={{ color: color }} />;
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(searchParams.get("tab") || "all");

  const [filterValues, setFilterValues] = useState({
    status: searchParams.get("status") || null,
    priority: searchParams.get("priority") || null,
    type: searchParams.get("type") || null,
    assignee: searchParams.get("assignee") || null,
    createdBy: searchParams.get("createdBy") || null,
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  // Sync state if URL search parameters change
  useEffect(() => {
    const qStatus = searchParams.get("status");
    const qPriority = searchParams.get("priority");
    const qType = searchParams.get("type");
    const qAssignee = searchParams.get("assignee");
    const qCreatedBy = searchParams.get("createdBy");
    const qTab = searchParams.get("tab");

    setFilterValues((prev) => ({
      ...prev,
      status: qStatus || prev.status,
      priority: qPriority || prev.priority,
      type: qType || prev.type,
      assignee: qAssignee || prev.assignee,
      createdBy: qCreatedBy || prev.createdBy,
    }));
    if (qTab) setCurrentTab(qTab);
  }, [searchParams]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const tRes = await axiosInstance.post("/populate/read/tickets", {
        fields: "title,type,priority,status,dueDate,createdAt,updatedAt,isConvertedToTask,userStory,description,ticketId,assignedTo,accountManager,createdBy,createdByModel,linkedTaskId,unreadCommentsCount",
        populateFields: {
          assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,firstName,lastName,profileImage",
          accountManager: "basicInfo.firstName,basicInfo.lastName,firstName,lastName",
          createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,name,firstName,lastName,profileImage,email",
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

    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      d = d.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.ticketId || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }

    if (filterValues.status) d = d.filter(t => t.status === filterValues.status);
    if (filterValues.priority) d = d.filter(t => t.priority === filterValues.priority);
    if (filterValues.type) d = d.filter(t => (t.type?.name || t.type) === filterValues.type);
    if (filterValues.assignee) d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === filterValues.assignee));
    if (filterValues.createdBy) d = d.filter(t => {
      const cId = t.createdBy?._id || t.createdBy;
      return String(cId) === String(filterValues.createdBy);
    });
    if (filterValues.dateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(filterValues.dateFrom));
    if (filterValues.dateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(filterValues.dateTo + "T23:59:59"));

    // Sort by updatedAt descending
    return [...d].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [tickets, currentTab, userId, filterValues]);

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

  const statusOptions = useMemo(() => STATUSES.map(s => ({
    value: s, label: s,
    color: { 'Open': 'var(--tracker-info)', 'In Progress': 'var(--tracker-warning)', 'Review': 'var(--module-hr)', 'Testing': 'var(--brand-teal)', 'Completed': 'var(--tracker-success)', 'Closed': 'var(--ink-subtle)' }[s] || 'var(--ink-subtle)',
  })), []);

  const priorityOptions = useMemo(() => PRIORITIES.map(p => ({
    value: p, label: p,
    color: { 'Critical': 'var(--tracker-danger)', 'High': 'var(--tracker-warning)', 'Medium': 'var(--tracker-warning)', 'Low': 'var(--tracker-success)' }[p] || 'var(--ink-subtle)',
  })), []);

  const filtersConfig = useMemo(() => [
    {
      key: "status",
      label: "All Statuses",
      type: "status",
      options: statusOptions,
    },
    {
      key: "priority",
      label: "All Priorities",
      type: "status",
      options: priorityOptions,
    },
    {
      key: "type",
      label: "All Types",
      type: "default",
      model: "task_types",
      fetchFields: "name,icon,color",
      fetchTransform: item => ({
        value: item.name,
        label: item.name,
        icon: item.icon,
        color: item.color
      }),
    },
    {
      key: "assignee",
      label: "All Assignees",
      type: "member",
      model: "employees",
      fetchFields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
    },
    {
      key: "createdBy",
      label: "Created By",
      type: "member",
      model: "employees",
      fetchFields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
    },
  ], [statusOptions, priorityOptions]);

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

    assignedTo: t => {
      const assignees = t.assignedTo || [];
      if (assignees.length === 0) return <span className="text-ink-subtle text-[11px]">Unassigned</span>;
      return (
        <div className="flex items-center gap-1">
          {assignees.slice(0, 3).map((emp, i) => {
            const name = getUserDisplayName(emp, 'User');
            const img = getUserAvatar(emp);
            return <ProfileImage key={i} src={img} name={name} size="2xs" px={18} title={name} />;
          })}
          {assignees.length > 3 && (
            <span className="text-[10px] font-bold text-ink-muted">+{assignees.length - 3}</span>
          )}
        </div>
      );
    },

    createdBy: t => {
      const name = getUserDisplayName(t.createdBy, '—');
      const img = getUserAvatar(t.createdBy);
      return (
        <div className="flex items-center gap-1.5" title={name}>
          <ProfileImage src={img} name={name} size="2xs" px={18} />
          <span className="text-[11.5px] text-ink truncate max-w-[95px]">{name}</span>
        </div>
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold ${badgeCls}`}>
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
  };

  const customExport = {
    unread: t => t.unreadCommentsCount || 0,
    type: t => t.type?.name || t.type || "",
    assignedTo: t => (t.assignedTo || []).map(a => getUserDisplayName(a, '')).filter(Boolean).join(", "),
    createdBy: t => getUserDisplayName(t.createdBy, ""),
    lastResponse: t => t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "",
  };

  return (
    <div className="space-y-3 w-full" data-module="ticket">
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
            {displayed.length !== tickets.length && (
              <span className="text-[11px] text-[var(--module-ticket)] font-semibold pl-2">
                ({displayed.length} filtered)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          <button
            onClick={() => navigate(entityFormPath("/Tickets"))}
            className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 shrink-0 cursor-pointer"
          >
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

      {/* ── Configurable Universal Filter Bar with Presets ── */}
      <UniversalFilterBar
        filtersConfig={filtersConfig}
        values={filterValues}
        onChange={setFilterValues}
        storageKey="tickets"
        accentColor="var(--module-ticket)"
        searchPlaceholder="Search tickets by title, ID or description..."
      />

      {/* ── 100% Full-Width Table with Sticky Header ── */}
      <div className="w-full">
        <TableGenerator
          title="All Tickets"
          data={displayed}
          customRender={customRender}
          customExport={customExport}
          customColumns={["unread", "title", "type", "priority", "status", "pendingAction", "assignedTo", "createdBy", "lastResponse"]}
          enableActions
          onEdit={handleEdit}
          onRowClick={(row) => navigate(`/Tickets/${row._id}`)}
        />
      </div>
    </div>
  );
};

export default TicketsPage;
