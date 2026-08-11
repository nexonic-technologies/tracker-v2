import { useState, useMemo } from "react";
import { Plus, Search, X, ChevronDown, LayoutGrid } from "lucide-react";
import ProfileImage from "./ProfileImage";
import InlineEdit from "./InLineEdit";
import TaskContextMenu from "./TaskContextMenu";

/**
 * Column colour tokens — references CSS vars only, no hardcoded hex.
 * Each entry maps to semantic or module-specific CSS variables.
 */
const STATUS_TOKENS = {
  "Backlogs": { bar: "bg-[var(--tracker-ink-subtle)]", bg: "bg-[var(--tracker-surface-1)]", count: "bg-[var(--tracker-surface-2)] text-ink-muted" },
  "To Do": { bar: "bg-[var(--tracker-warning)]", bg: "bg-[var(--tracker-warning-light)]", count: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" },
  "In Progress": { bar: "bg-[var(--module-project)]", bg: "bg-[var(--module-project-light)]", count: "bg-[var(--module-project-light)] text-[var(--module-project)]" },
  "In Review": { bar: "bg-[var(--module-hr)]", bg: "bg-[var(--module-hr-light)]", count: "bg-[var(--module-hr-light)] text-[var(--module-hr)]" },
  "Approved": { bar: "bg-[var(--tracker-success)]", bg: "bg-[var(--tracker-success-light)]", count: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" },
  "Completed": { bar: "bg-[var(--tracker-success)]", bg: "bg-[var(--tracker-success-light)]", count: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" },
};

const PRIORITY_TOKENS = {
  "Low": { bar: "bg-[var(--tracker-success)]", bg: "bg-[var(--tracker-success-light)]", count: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" },
  "Medium": { bar: "bg-[var(--tracker-warning)]", bg: "bg-[var(--tracker-warning-light)]", count: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" },
  "High": { bar: "bg-[var(--tracker-danger)]", bg: "bg-[var(--tracker-danger-light)]", count: "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]" },
  "Weekly Priority": { bar: "bg-[var(--module-hr)]", bg: "bg-[var(--module-hr-light)]", count: "bg-[var(--module-hr-light)] text-[var(--module-hr)]" },
};

const FALLBACK_TOKEN = { bar: "bg-accent", bg: "bg-[var(--module-accent-light)]", count: "bg-[var(--module-accent-light)] text-[var(--module-accent)]" };

const getToken = (colId, groupBy) => {
  if (groupBy === "status") return STATUS_TOKENS[colId] || FALLBACK_TOKEN;
  if (groupBy === "priorityLevel") return PRIORITY_TOKENS[colId] || FALLBACK_TOKEN;
  return FALLBACK_TOKEN;
};

/* ── Avatar ── */
const Avatar = ({ person, size = 22 }) => {
  const title = `${person?.basicInfo?.firstName || ""} ${person?.basicInfo?.lastName || ""}`.trim();
  if (!person) return null;
  return (
    <ProfileImage
      profileImage={person.basicInfo?.profileImage}
      firstName={person.basicInfo?.firstName}
      lastName={person.basicInfo?.lastName}
      px={size}
      title={title}
    />
  );
};

/* ── Filter select ── */
const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="relative">
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="appearance-none lmx-input py-1 pl-2.5 pr-6 text-[11px] font-medium cursor-pointer"
      style={value ? { borderColor: "var(--module-accent)", color: "var(--module-accent)", background: "var(--module-accent-light)" } : {}}
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle" />
  </div>
);

/* ── Priority cell colours (card footer) ── */
const PRIORITY_CELL = {
  Critical: { bg: "rgba(185,28,28,0.10)", text: "var(--tracker-danger)", dot: "🔴" },
  High: { bg: "rgba(194,65,12,0.10)", text: "var(--tracker-warning)", dot: "🟠" },
  Medium: { bg: "rgba(161,98,7,0.10)", text: "var(--tracker-warning)", dot: "🟡" },
  Low: { bg: "rgba(22,101,52,0.10)", text: "var(--tracker-success)", dot: "🟢" },
  "Weekly Priority": { bg: "rgba(109,40,217,0.10)", text: "var(--module-hr)", dot: "🟣" },
};

/* ── Task Card ── */
const TaskCard = ({ task, groupBy, draggingId, onDragStart, onCardClick, onCardUpdate, onContextMenu }) => {
  const assignees = task.assignedTo || [];
  const date = task.endDate || task.dueDate;
  const isOverdue = date && new Date(date) < new Date() && task.status !== "Completed";
  const priority = task.priorityLevel;
  const typeName = task.taskTypeId?.name || task.type?.name || "";
  const typeAbbr = typeName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const category = task.projectTypeId?.name || "";
  const isNew = task.createdAt && (Date.now() - new Date(task.createdAt).getTime()) < 48 * 3600 * 1000;

  // Exact matching for priority colors
  const pCell = {
    Critical: { bg: "#fef2f2", text: "#dc2626", dot: "🔴" },
    High: { bg: "#fff7ed", text: "#ea580c", dot: "🟠" },
    Medium: { bg: "#fefce8", text: "#ca8a04", dot: "🟡" },
    Low: { bg: "#f0fdf4", text: "#16a34a", dot: "🟢" },
    "Weekly Priority": { bg: "#faf5ff", text: "#9333ea", dot: "🟣" }
  }[priority] || { bg: "#f8fafc", text: "#64748b", dot: "⚪" };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onCardClick?.(task)}
      onContextMenu={(e) => onContextMenu?.(e, task)}
      className="bg-white rounded-md border border-[#e2e8f0] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 select-none flex flex-col overflow-hidden mx-1.5 mt-2 mb-1"
      style={{ opacity: draggingId === task._id ? 0.4 : 1 }}
    >
      <div className="p-3.5 pb-3 flex-1 space-y-2.5">
        {/* Header: Title + Avatar */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-[13.5px] font-semibold leading-snug text-[#1e293b] flex-1 min-w-0">
            {isNew && (
              <span className="inline-block px-1.5 py-0.5 mr-1.5 rounded bg-[#fefce8] text-[#ca8a04] border border-[#fef08a] text-[9px] font-bold uppercase tracking-wider">
                New
              </span>
            )}
            <InlineEdit
              value={task.title || "Untitled Task"}
              canEdit={!!onCardUpdate}
              onSave={(val) => onCardUpdate?.(task, "title", val)}
            />
          </div>
          <div className="flex-shrink-0 mt-0.5">
            {assignees[0] ? <Avatar person={assignees[0]} size={26} /> : <div className="w-6 h-6 rounded-full bg-[#f1f5f9] border border-[#cbd5e1] border-dashed"></div>}
          </div>
        </div>

        {/* User Story / Description */}
        {(task.userStory || task.description) && (
          <p className="text-[11.5px] leading-relaxed line-clamp-2 text-[#64748b]">
            {task.userStory || task.description}
          </p>
        )}

        {/* Subtle Divider */}
        <div className="w-8 border-t border-[#e2e8f0] pt-2"></div>

        {/* Pills Row (Priority, Type, Category) */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between w-full">
          {/* Priority Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold tracking-wide"
            style={{ background: pCell.bg, color: pCell.text }}>
            <span className="text-[9px]">{pCell.dot}</span>
            {priority || "Priority"}
          </div>

          {/* Type Pill */}
          {typeAbbr && (
            <div className="flex items-center px-3 py-1 rounded text-[11px] font-bold tracking-wide bg-[#f5f3ff] text-[#7c3aed]" title={typeName}>
              {typeAbbr}
            </div>
          )}

          {/* Category / Client Pill */}
          {(category || task.clientId?.name) && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold tracking-wide bg-[#ecfdf5] text-[#059669] truncate max-w-[120px]">
              <span className="text-[10px]">☑</span>
              <span className="truncate">{category || task.clientId?.name}</span>
            </div>
          )}
        </div>

        {/* Footer / Due Date Indicator */}
        <div className="flex items-center justify-between pt-1">
          <div></div>
          {date && !isOverdue && (
            <span className="text-[10px] font-medium text-ink-subtle">
              {new Date(date).toLocaleDateString("en-GB")}
            </span>
          )}
        </div>
      </div>

      {/* Overdue Banner at the bottom */}
      {isOverdue && (
        <div className="bg-[#fef2f2] border-t border-[#fecaca] py-1.5 px-3 text-center">
          <span className="text-[10.5px] font-bold text-[#ef4444] tracking-widest uppercase">
            Overdue
          </span>
        </div>
      )}
    </div>
  );
};

/* ── Inline stat pill (sits in filter bar) ── */
const StatPill = ({ label, count, tokenClass }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${tokenClass}`}>
    <span className="font-bold">{count}</span>
    <span className="opacity-75">{label}</span>
  </span>
);

/* ══════════════════════════════════════════════════ */

const KanbanBoard = ({
  data = [],
  groupBy = "status",
  columns = [],
  onCardMove,
  onCardClick,
  onCardUpdate,
  currentUserId,
  employees = [],
  task_types = [],
  clients = [],
  onNewTask,
  showClientFilter = false,
  showFollowerFilter = false,
  hideHeader = false,
}) => {
  const [search, setSearch] = useState("");
  const [draggingCard, setDraggingCard] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [filters, setFilters] = useState({ category: null, priority: null, client: null, follower: null });
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, task: null, show: false });

  const getVal = (obj, path) => {
    const val = path.split(".").reduce((a, k) => (a != null ? a[k] : undefined), obj);
    // if the leaf is a populated object with a `name`, return the name
    if (val && typeof val === "object" && val.name) return val.name;
    return val;
  };

  const categoryOptions = useMemo(() =>
    [...new Set(data.map((t) => t.projectTypeId?.name).filter(Boolean))].map((n) => ({ value: n, label: n })),
    [data]);

  const priorityOptions = ["Low", "Medium", "High", "Weekly Priority"].map((p) => ({ value: p, label: p }));
  const clientOptions = clients.map((c) => ({ value: c._id, label: c.name || "Unnamed" }));
  const followerOptions = employees.map((e) => ({
    value: e._id,
    label: `${e.basicInfo?.firstName || ""} ${e.basicInfo?.lastName || ""}`.trim(),
  }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  /* ── Stat pills: count per column from the FULL (unfiltered) data ── */
  const statPills = useMemo(() => {
    return columns.map((col) => {
      const count = data.filter((t) => getVal(t, groupBy) === col.id).length;
      const token = getToken(col.id, groupBy);
      return { label: col.title, count, tokenClass: token.count };
    }).filter((p) => p.count > 0);
  }, [data, columns, groupBy]);

  const displayData = useMemo(() => {
    let d = data;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter((t) => (t.title || "").toLowerCase().includes(q) || (t.userStory || "").toLowerCase().includes(q));
    }
    if (filters.category) d = d.filter((t) => t.projectTypeId?.name === filters.category);
    if (filters.priority) d = d.filter((t) => t.priorityLevel === filters.priority);
    if (filters.client) d = d.filter((t) => {
      const cid = typeof t.clientId === "object" ? t.clientId?._id : t.clientId;
      return String(cid) === String(filters.client);
    });
    if (filters.follower) d = d.filter((t) =>
      t.followers?.some((f) => String(f) === String(filters.follower)) ||
      t.assignedTo?.some((a) => String(a._id || a) === String(filters.follower))
    );
    return d;
  }, [data, search, filters]);

  const getColTasks = (colId) => displayData.filter((t) => getVal(t, groupBy) === colId);

  const handleDragStart = (e, task) => { setDraggingCard(task); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (toCol) => {
    if (draggingCard && draggingCard[groupBy] !== toCol) onCardMove?.(draggingCard, draggingCard[groupBy], toCol);
    setDraggingCard(null); setOverCol(null);
  };
  const clearFilters = () => setFilters({ category: null, priority: null, client: null, follower: null });

  const handleContextMenu = (e, task) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, task, show: true });
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Stat strip + filter bar ── */}
      {!hideHeader && (
        <div className="flex flex-col gap-1.5 pb-3">
          {/* Stat pills row */}
          <div className="flex items-center gap-1 flex-wrap">
            {statPills.map((p) => (
              <StatPill key={p.label} label={p.label} count={p.count} tokenClass={p.tokenClass} />
            ))}
            <span className="ml-auto text-[11px] font-medium text-ink-subtle">
              {data.length} total
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-[220px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="lmx-input pl-7 pr-7 py-1 text-[11px]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={11} className="text-ink-subtle" />
                </button>
              )}
            </div>

            <FilterSelect label="Category" value={filters.category} onChange={(v) => setFilters((p) => ({ ...p, category: v }))} options={categoryOptions} />
            <FilterSelect label="Priority" value={filters.priority} onChange={(v) => setFilters((p) => ({ ...p, priority: v }))} options={priorityOptions} />
            {showClientFilter && <FilterSelect label="Client" value={filters.client} onChange={(v) => setFilters((p) => ({ ...p, client: v }))} options={clientOptions} />}
            {showFollowerFilter && <FilterSelect label="Follower" value={filters.follower} onChange={(v) => setFilters((p) => ({ ...p, follower: v }))} options={followerOptions} />}

            {activeFilterCount > 0 && (
              <button onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-tracker-md bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]">
                <X size={10} /> Clear
              </button>
            )}

            {(search || activeFilterCount > 0) && (
              <span className="ml-auto text-[12px] font-medium text-ink-subtle">
                {displayData.length} shown
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Columns ── */}
      <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-3 h-full w-full">
          {columns.map((col) => {
            const colTasks = getColTasks(col.id);
            const token = getToken(col.id, groupBy);
            const isOver = overCol === col.id;

            return (
              <div
                key={col.id}
                className={`flex flex-col flex-1 transition-colors duration-150 overflow-hidden ${isOver ? token.bg : "bg-transparent"}`}
                style={{ minWidth: 320, maxWidth: 360 }}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDrop={() => handleDrop(col.id)}
                onDragLeave={() => setOverCol(null)}
              >
                {/* Column header — exact match to screenshot */}
                <div className="px-4 py-3.5 text-white flex-shrink-0 flex items-center justify-between rounded-t-lg" style={{
                  backgroundColor: ({
                    "Backlogs": "#8b94a8",
                    "To Do": "#f59e0b",
                    "In Progress": "#0ea5e9",
                    "In Review": "#8b5cf6",
                    "Approved": "#10b981",
                    "Completed": "#f59e0b",
                    "Low": "#10b981",
                    "Medium": "#f59e0b",
                    "High": "#ef4444",
                    "Weekly Priority": "#8b5cf6",
                  })[col.id] || "var(--module-accent)"
                }}>
                  <span className="text-[14.5px] font-bold tracking-wide">{col.title}</span>
                  <span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }}>
                    {colTasks.length} items
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto pb-4 scrollbar-hide bg-[#f8fafc] rounded-b-lg border border-t-0 border-[#e2e8f0]" style={{ minHeight: 200, maxHeight: "calc(100vh - 220px)" }}>
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      groupBy={groupBy}
                      draggingId={draggingCard?._id}
                      onDragStart={handleDragStart}
                      onCardClick={onCardClick}
                      onCardUpdate={onCardUpdate}
                      onContextMenu={handleContextMenu}
                    />
                  ))}

                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center py-4 gap-1.5 text-ink-subtle">
                      <LayoutGrid size={12} />
                      <span className="text-[11px]">Empty</span>
                    </div>
                  )}

                  {onNewTask && (
                    <button
                      onClick={onNewTask}
                      className="w-full flex items-center gap-1 px-2 py-1 rounded-tracker-md text-[11px] font-medium text-ink-subtle hover:bg-[var(--module-accent-light)] hover:text-[var(--module-accent)] transition-colors"
                    >
                      <Plus size={11} /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {contextMenu.show && (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
          onEdit={(task) => onCardClick?.(task)}
          onStatusChange={(task, status) => onCardUpdate?.(task, "status", status)}
          onPriorityChange={(task, priority) => onCardUpdate?.(task, "priorityLevel", priority)}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
