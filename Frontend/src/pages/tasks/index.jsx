import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";
import KanbanBoard from "@components/Common/KambanBoard";
import GanttView from "@components/Tasks/GanttView";
import EmployeeGanttView from "@components/Tasks/EmployeeGanttView";
import SprintPlanningPanel from "@components/Tasks/SprintPlanningPanel";
import TaskSkeleton from "@components/Common/TaskSkeleton";
import FormDraftBanner from "@components/Forms/FormDraftBanner";
import UniversalFilterBar from "@components/Common/UniversalFilterBar";
import TableGenerator from "@components/Common/TableGenerator";
import ProfileImage from "@components/Common/ProfileImage";
import { getUserDisplayName, getUserAvatar } from "../../utils/userUtils";
import {
  FolderKanban, Plus, Search, X, ChevronDown, SlidersHorizontal,
  LayoutGrid, CalendarDays, Download, Users, GanttChartSquare, Layers,
  Archive, RotateCcw, CheckCircle2, AlertCircle, Building2, User, Table
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_COLS = [
  { id: "Backlogs", title: "Backlogs" },
  { id: "To Do", title: "To Do" },
  { id: "In Progress", title: "In Progress" },
  { id: "In Review", title: "In Review" },
  { id: "Approved", title: "Approved" },
  { id: "Completed", title: "Completed" },
];
const PRIORITY_COLS = [
  { id: "Low", title: "Low" },
  { id: "Medium", title: "Medium" },
  { id: "High", title: "High" },
  { id: "Weekly Priority", title: "Weekly Priority" },
];

const PRIORITIES = ["Low", "Medium", "High", "Weekly Priority"];
const STATUSES = ["Backlogs", "To Do", "In Progress", "In Review", "Approved", "Completed"];

const TasksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialViewMode = () => {
    const v = searchParams.get("view");
    if (v === "queue" || v === "employee-queue") return "employee-queue";
    if (v === "gantt" || v === "timeline") return "gantt";
    if (v === "sprint") return "sprint";
    if (v === "table" || v === "list") return "table";
    if (v === "board") return "board";
    return "board";
  };

  const [allTasks, setAllTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [task_types, settask_types] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("status");
  const [viewMode, setViewMode] = useState(getInitialViewMode); // 'board' | 'table' | 'gantt' | 'employee-queue' | 'sprint' | 'archive'
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => searchParams.get("employeeId") || user?.id || null);

  const [filterValues, setFilterValues] = useState({
    status: searchParams.get("status") || null,
    priority: searchParams.get("priority") || null,
    assignee: searchParams.get("assignee") || null,
    createdBy: searchParams.get("createdBy") || null,
    client: searchParams.get("client") || null,
    category: searchParams.get("category") || null,
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  // Sync URL search parameters on changes
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    const viewParam = mode === "employee-queue" ? "queue" : mode;
    newParams.set("view", viewParam);
    if (selectedEmployeeId) newParams.set("employeeId", selectedEmployeeId);
    setSearchParams(newParams, { replace: true });
  };

  const handleEmployeeSelect = (empId) => {
    setSelectedEmployeeId(empId);
    const newParams = new URLSearchParams(searchParams);
    if (empId) newParams.set("employeeId", empId);
    else newParams.delete("employeeId");
    setSearchParams(newParams, { replace: true });
  };

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "queue" || v === "employee-queue") setViewMode("employee-queue");
    else if (v === "gantt" || v === "timeline") setViewMode("gantt");
    else if (v === "sprint") setViewMode("sprint");
    else if (v === "table" || v === "list") setViewMode("table");
    else if (v === "board") setViewMode("board");

    const emp = searchParams.get("employeeId");
    if (emp) setSelectedEmployeeId(emp);
  }, [searchParams]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [tR, eR, tyR, cR] = await Promise.all([
        axiosInstance.post("/populate/read/tasks", {
          populateFields: {
            clientId: "name",
            projectTypeId: "name",
            taskTypeId: "name",
            createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
            assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
            linkedTicketId: "title",
          },
          limit: 1000,
        }),
        axiosInstance.post("/populate/read/employees", {
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        }),
        axiosInstance.post("/populate/read/task_types"),
        axiosInstance.post("/populate/read/clients", { fields: "name" }),
      ]);
      setAllTasks(tR.data.data || []);
      setEmployees(eR.data.data || []);
      settask_types(tyR.data.data || []);
      setClients(cR.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleTaskClick = (task) => {
    navigate(`/tasks/${task._id}`);
  };

  const handleCardMove = async (task, _from, toCol) => {
    try {
      const field = groupBy === "status" ? "status" : "priorityLevel";
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: toCol });
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: toCol } : t));
    } catch (e) { console.error(e); }
  };

  const handleCardUpdate = async (task, field, value) => {
    try {
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: value } : t));
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: value });
    } catch (e) {
      console.error(e);
      fetchAll();
    }
  };

  const handleRestoreTask = async (task) => {
    try {
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { metaStatus: 'active' });
      toast.success("Task restored to active board");
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, metaStatus: 'active' } : t));
    } catch (e) {
      console.error(e);
      toast.error("Failed to restore task");
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Title", "Status", "Priority", "Assignees", "Client", "Category", "Due Date", "Created At"],
      ...filteredTasks.map(t => [
        `"${t.title || ""}"`,
        t.status || "",
        t.priorityLevel || "",
        `"${(t.assignedTo || []).map(a => a.basicInfo ? `${a.basicInfo.firstName} ${a.basicInfo.lastName}` : (a.firstName || "")).join(", ")}"`,
        `"${t.clientId?.name || ""}"`,
        `"${t.projectTypeId?.name || ""}"`,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const archivedTasks = useMemo(() => {
    return allTasks.filter(t => t.metaStatus === 'archived');
  }, [allTasks]);

  const activeTasks = useMemo(() => {
    return allTasks.filter(t => t.metaStatus !== 'archived');
  }, [allTasks]);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let d = viewMode === "archive" ? archivedTasks : activeTasks;
    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      d = d.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.userStory || "").toLowerCase().includes(q) ||
        (t.linkedTicketId?.title || "").toLowerCase().includes(q)
      );
    }
    if (filterValues.status) d = d.filter(t => t.status === filterValues.status);
    if (filterValues.priority) d = d.filter(t => t.priorityLevel === filterValues.priority);
    if (filterValues.assignee) d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === filterValues.assignee));
    if (filterValues.createdBy) d = d.filter(t => {
      const cid = typeof t.createdBy === "object" ? t.createdBy?._id : t.createdBy;
      return String(cid) === String(filterValues.createdBy);
    });
    if (filterValues.client) d = d.filter(t => {
      const cid = typeof t.clientId === "object" ? t.clientId?._id : t.clientId;
      return String(cid) === String(filterValues.client);
    });
    if (filterValues.category) d = d.filter(t => {
      const catName = t.projectTypeId?.name || (typeof t.projectTypeId === "string" ? t.projectTypeId : "");
      return catName === filterValues.category;
    });
    if (filterValues.dateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(filterValues.dateFrom));
    if (filterValues.dateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(filterValues.dateTo + "T23:59:59"));
    return d;
  }, [viewMode, archivedTasks, activeTasks, filterValues]);

  const statusOptions = useMemo(() => STATUSES.map(s => ({
    value: s, label: s,
    color: {
      'Backlogs': 'var(--ink-subtle)',
      'To Do': 'var(--tracker-warning)',
      'In Progress': 'var(--module-project)',
      'In Review': 'var(--module-hr)',
      'Approved': 'var(--tracker-success)',
      'Completed': 'var(--tracker-success)'
    }[s] || 'var(--ink-subtle)',
  })), []);

  const priorityOptions = useMemo(() => PRIORITIES.map(p => ({
    value: p, label: p,
    color: {
      'Low': 'var(--tracker-success)',
      'Medium': 'var(--tracker-warning)',
      'High': 'var(--tracker-danger)',
      'Weekly Priority': 'var(--module-hr)'
    }[p] || 'var(--ink-subtle)',
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
    {
      key: "client",
      label: "All Clients",
      type: "default",
      model: "clients",
      fetchFields: "name",
      fetchTransform: item => ({
        value: item._id,
        label: item.name
      }),
    },
    {
      key: "category",
      label: "All Categories",
      type: "default",
      model: "project_types",
      fetchFields: "name",
      fetchTransform: item => ({
        value: item.name,
        label: item.name
      }),
    },
  ], [statusOptions, priorityOptions]);

  // ── Custom renders for Task Table View ─────────────────────────────────────
  const taskTableCustomRender = {
    title: t => (
      <div className="flex flex-col">
        <span className="font-semibold text-ink text-xs hover:text-accent transition-colors">{t.title}</span>
        {t.userStory && <span className="text-[11px] text-ink-subtle truncate max-w-xs">{t.userStory}</span>}
      </div>
    ),
    status: t => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-2 text-ink">
        {t.status}
      </span>
    ),
    priorityLevel: t => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-tracker-sm text-[11px] font-semibold bg-surface-1 text-ink-muted border border-hairline">
        {t.priorityLevel || "Medium"}
      </span>
    ),
    projectTypeId: t => (
      <span className="text-xs text-ink-muted">{t.projectTypeId?.name || "-"}</span>
    ),
    clientId: t => (
      <span className="text-xs text-ink-muted">{t.clientId?.name || "-"}</span>
    ),
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
  };

  const taskTableCustomExport = {
    title: t => t.title || "",
    status: t => t.status || "",
    priorityLevel: t => t.priorityLevel || "",
    assignedTo: t => (t.assignedTo || []).map(a => a.basicInfo ? `${a.basicInfo.firstName} ${a.basicInfo.lastName}` : (a.firstName || "")).join(", "),
    createdBy: t => t.createdBy?.basicInfo ? `${t.createdBy.basicInfo.firstName} ${t.createdBy.basicInfo.lastName}` : "",
    clientId: t => t.clientId?.name || "",
    projectTypeId: t => t.projectTypeId?.name || "",
  };

  if (loading) return <TaskSkeleton />;

  return (
    <div className="flex flex-col h-full bg-canvas w-full space-y-3" data-module="project">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-soft pb-2">

        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-surface-1 border border-hairline flex items-center justify-center text-[var(--module-project)] shadow-xs">
            <FolderKanban size={17} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-ink tracking-tight leading-tight whitespace-nowrap">
              Task Workspace
            </h1>
            <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
              <span className="text-[11.5px] font-medium text-ink-muted">
                {allTasks.length} total tasks
              </span>
              {filteredTasks.length !== allTasks.length && (
                <>
                  <span className="w-1 h-1 rounded-full bg-hairline-strong" />
                  <span className="text-[11.5px] font-bold text-[var(--module-project)]">
                    {filteredTasks.length} filtered
                  </span>
                </>
              )}
            </div>
            <FormDraftBanner model="tasks" formPath="/tasks/form" label="task" />
          </div>
        </div>

        {/* Right: View Toggles & Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">

          {/* Group-by toggle (Segmented Control for board) */}
          {viewMode === "board" && (
            <div className="flex items-center p-0.5 bg-surface-1 border border-hairline rounded-tracker-md">
              {[{ id: "status", label: "Status" }, { id: "priorityLevel", label: "Priority" }].map(g => (
                <button key={g.id} onClick={() => setGroupBy(g.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-tracker-sm transition-all cursor-pointer ${groupBy === g.id ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* View mode toggle */}
          <div className="lmx-tab-bar">
            <button onClick={() => handleViewModeChange("board")}
              className={`lmx-tab ${viewMode === "board" ? "lmx-tab-active" : ""}`}>
              <LayoutGrid size={13} /> Board
            </button>
            <button onClick={() => handleViewModeChange("table")}
              className={`lmx-tab ${viewMode === "table" ? "lmx-tab-active" : ""}`}>
              <Table size={13} /> Table
            </button>
            <button onClick={() => handleViewModeChange("gantt")}
              className={`lmx-tab ${viewMode === "gantt" ? "lmx-tab-active" : ""}`}>
              <CalendarDays size={13} /> Timeline
            </button>
            <button onClick={() => handleViewModeChange("employee-queue")}
              className={`lmx-tab ${viewMode === "employee-queue" ? "lmx-tab-active" : ""}`}>
              <GanttChartSquare size={13} /> Queue
            </button>
            <button onClick={() => handleViewModeChange("sprint")}
              className={`lmx-tab ${viewMode === "sprint" ? "lmx-tab-active" : ""}`}>
              <Layers size={13} /> Sprint
            </button>
            <button onClick={() => handleViewModeChange("archive")}
              className={`lmx-tab ${viewMode === "archive" ? "lmx-tab-active" : ""}`}>
              <Archive size={13} /> Archive
              {archivedTasks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted">
                  {archivedTasks.length}
                </span>
              )}
            </button>
          </div>

          {/* New Task Button */}
          <button onClick={() => navigate("/tasks/form")}
            className="tracker-btn-accent flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 cursor-pointer">
            <Plus size={13} /> New Task
          </button>
        </div>
      </div>

      {/* ── Configurable Universal Filter Bar with Presets ── */}
      <UniversalFilterBar
        filtersConfig={filtersConfig}
        values={filterValues}
        onChange={setFilterValues}
        storageKey="tasks"
        accentColor="var(--module-project)"
        searchPlaceholder="Search tasks by title, story or ticket..."
        rightActions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tracker-md text-[12px] font-semibold border border-hairline bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 transition-all cursor-pointer shadow-xs"
          >
            <Download size={13} /> Export
          </button>
        }
      />

      {/* ── Main View Workspace ── */}
      <div className="flex-1 w-full min-h-0">
        {viewMode === "board" && (
          <div className="h-full">
            <KanbanBoard
              data={filteredTasks}
              groupBy={groupBy}
              columns={groupBy === "status" ? STATUS_COLS : PRIORITY_COLS}
              currentUserId={user?.id}
              onCardClick={handleTaskClick}
              onCardMove={handleCardMove}
              onCardUpdate={handleCardUpdate}
              employees={employees}
              task_types={task_types}
              clients={clients}
              showClientFilter={false}
              showFollowerFilter={false}
              hideHeader={true}
              onNewTask={() => navigate("/tasks/form")}
            />
          </div>
        )}

        {viewMode === "table" && (
          <div className="w-full">
            <TableGenerator
              title="All Tasks"
              data={filteredTasks}
              customRender={taskTableCustomRender}
              customExport={taskTableCustomExport}
              customColumns={["title", "status", "priorityLevel", "projectTypeId", "clientId", "assignedTo", "createdBy", "dueDate", "createdAt"]}
              enableActions
              onEdit={(task) => navigate(`/tasks/form?id=${task._id}`)}
              onRowClick={(task) => navigate(`/tasks/${task._id}`)}
            />
          </div>
        )}

        {viewMode === "gantt" && (
          <GanttView
            data={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        )}

        {viewMode === "employee-queue" && (
          <EmployeeGanttView
            tasks={filteredTasks}
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={handleEmployeeSelect}
            onTaskClick={handleTaskClick}
          />
        )}

        {viewMode === "sprint" && (
          <SprintPlanningPanel
            tasks={filteredTasks}
            employees={employees}
            onTaskClick={handleTaskClick}
            onRefresh={fetchAll}
          />
        )}

        {viewMode === "archive" && (
          <div className="bg-surface border border-hairline rounded-tracker-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft mb-3">
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-ink-muted" />
                <h3 className="text-sm font-bold text-ink">Archived Tasks</h3>
              </div>
              <span className="text-xs text-ink-muted">{archivedTasks.length} archived</span>
            </div>

            {archivedTasks.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-xs">No archived tasks found.</div>
            ) : (
              <div className="divide-y divide-hairline-soft">
                {archivedTasks.map(t => (
                  <div key={t._id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-ink">{t.title}</div>
                      <div className="text-[11px] text-ink-subtle">Archived • {t.status} • {t.priorityLevel}</div>
                    </div>
                    <button
                      onClick={() => handleRestoreTask(t)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-tracker-md bg-surface-1 hover:bg-surface-2 text-ink border border-hairline transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
