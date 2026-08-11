import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import KanbanBoard from "@components/Common/KambanBoard";
import GanttView from "@components/Tasks/GanttView";
import EmployeeGanttView from "@components/Tasks/EmployeeGanttView";
import SprintPlanningPanel from "@components/Tasks/SprintPlanningPanel";
import TaskSkeleton from "@components/Common/TaskSkeleton";
import FormDraftBanner from "@components/Forms/FormDraftBanner";
import FilterDropdown from "@components/Common/FilterDropdown";
import { FolderKanban, Plus, Search, X, ChevronDown, SlidersHorizontal, LayoutGrid, CalendarDays, Download, Users, GanttChartSquare, Layers } from "lucide-react";

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

  const [allTasks, setAllTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [task_types, settask_types] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("status");
  const [viewMode, setViewMode] = useState("board"); // 'board' | 'gantt' | 'employee-queue' | 'sprint'
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id || null);

  // Filter state
  const [searchVal, setSearchVal] = useState("");
  const [fStatus, setFStatus] = useState(null);
  const [fPriority, setFPriority] = useState(null);
  const [fAssignee, setFAssignee] = useState(null);
  const [fClient, setFClient] = useState(null);
  const [fCategory, setFCategory] = useState(null);
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

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

  const handleCardMove = async (task, _from, toCol) => {
    try {
      const field = groupBy === "status" ? "status" : "priorityLevel";
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: toCol });
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: toCol } : t));
    } catch (e) { console.error(e); }
  };

  const handleCardUpdate = async (task, field, value) => {
    try {
      // Optimistic update
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: value } : t));
      // API call
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: value });
    } catch (e) {
      console.error(e);
      // Revert if error
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: task[field] } : t));
    }
  };

  const handleExport = async () => {
    try {
      const res = await axiosInstance.get("/export/tasks", {
        params: { status: fStatus, priority: fPriority, client: fClient },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "tasks_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleTaskClick = (task) => {
    navigate(`/tasks/${task._id}`);
  };

  // ── Client-side filtering (passed to KanbanBoard as `data`) ─────────────────

  const filteredTasks = useMemo(() => {
    let d = allTasks;
    if (searchVal) {
      const q = searchVal.toLowerCase();
      d = d.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.userStory || "").toLowerCase().includes(q) ||
        (t.linkedTicketId?.title || "").toLowerCase().includes(q)
      );
    }
    if (fStatus) d = d.filter(t => t.status === fStatus);
    if (fPriority) d = d.filter(t => t.priorityLevel === fPriority);
    if (fAssignee) d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === fAssignee));
    if (fClient) d = d.filter(t => {
      const cid = typeof t.clientId === "object" ? t.clientId?._id : t.clientId;
      return String(cid) === String(fClient);
    });
    if (fCategory) d = d.filter(t => {
      const catName = t.projectTypeId?.name || (typeof t.projectTypeId === "string" ? t.projectTypeId : "");
      return catName === fCategory;
    });
    if (fDateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(fDateFrom));
    if (fDateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(fDateTo + "T23:59:59"));
    return d;
  }, [allTasks, searchVal, fStatus, fPriority, fAssignee, fClient, fCategory, fDateFrom, fDateTo]);

  const activeFilters = [fStatus, fPriority, fAssignee, fClient, fCategory, fDateFrom, fDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFStatus(null); setFPriority(null);
    setFAssignee(null); setFClient(null); setFCategory(null); setFDateFrom(""); setFDateTo("");
  };

  const statusOptions = STATUSES.map(s => ({
    value: s, label: s,
    color: {
      'Backlogs': 'var(--ink-subtle)',
      'To Do': 'var(--tracker-warning)',
      'In Progress': 'var(--module-project)',
      'In Review': 'var(--module-hr)',
      'Approved': 'var(--tracker-success)',
      'Completed': 'var(--tracker-success)'
    }[s] || 'var(--ink-subtle)',
  }));

  const priorityOptions = PRIORITIES.map(p => ({
    value: p, label: p,
    color: {
      'Low': 'var(--tracker-success)',
      'Medium': 'var(--tracker-warning)',
      'High': 'var(--tracker-danger)',
      'Weekly Priority': 'var(--module-hr)'
    }[p] || 'var(--ink-subtle)',
  }));

  // ── Stat pills for page header (computed from allTasks) ───────────────────

  const statPills = useMemo(() => {
    const cols = groupBy === "status" ? STATUS_COLS : PRIORITY_COLS;
    return cols.map(col => {
      const count = allTasks.filter(t => (groupBy === "status" ? t.status : t.priorityLevel) === col.id).length;
      const colorCls = groupBy === "status"
        ? {
          "Backlogs": "bg-surface-2 text-ink-muted",
          "To Do": "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
          "In Progress": "bg-[var(--module-project-light)] text-[var(--module-project)]",
          "In Review": "bg-[var(--module-hr-light)] text-[var(--module-hr)]",
          "Approved": "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
          "Completed": "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
        }[col.id]
        : {
          "Low": "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
          "Medium": "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
          "High": "bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]",
          "Weekly Priority": "bg-[var(--module-hr-light)] text-[var(--module-hr)]",
        }[col.id];
      return { label: col.title, count, colorCls };
    }).filter(p => p.count > 0);
  }, [allTasks, groupBy]);

  if (loading) return <TaskSkeleton />;

  return (
    <div className="flex flex-col h-full bg-canvas" data-module="project">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline-soft pb-2 mb-3">

        {/* Left: Title & Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center text-[#0ea5e9] shadow-sm">
            <FolderKanban size={18} />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#1e293b] tracking-tight leading-tight whitespace-nowrap">
              All Tasks
            </h1>
            <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
              <span className="text-[12px] font-medium text-[#64748b]">
                {allTasks.length} total tasks
              </span>
              {activeFilters > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#cbd5e1]"></span>
                  <span className="text-[12px] font-bold text-[#0ea5e9]">
                    {filteredTasks.length} filtered
                  </span>
                </>
              )}
            </div>
            <FormDraftBanner model="tasks" formPath="/tasks/form" label="task" />
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-8 py-1.5 w-[200px] text-[12.5px] font-medium text-[#334155] placeholder-[#94a3b8] bg-white border border-[#e2e8f0] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent transition-all"
            />
            {searchVal && (
              <button onClick={() => setSearchVal("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-[#94a3b8] hover:text-[#64748b]" />
              </button>
            )}
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold border transition-all duration-150 cursor-pointer shadow-sm ${showFilters || activeFilters > 0
              ? "border-[#0ea5e9] bg-[#f0f9ff] text-[#0ea5e9]"
              : "border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#334155] hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
              }`}
          >
            <SlidersHorizontal size={14} />
            Filters {activeFilters > 0 && <span className="ml-1 bg-[#0ea5e9] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeFilters}</span>}
          </button>

          {/* Group-by toggle (Segmented Control) */}
          <div className="flex items-center p-0.5 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg">
            {[{ id: "status", label: "Status" }, { id: "priorityLevel", label: "Priority" }].map(g => (
              <button key={g.id} onClick={() => setGroupBy(g.id)}
                className={`text-[11.5px] font-bold px-3 py-1 rounded-md transition-all ${groupBy === g.id ? "bg-white text-[#1e293b] shadow-sm" : "text-[#64748b] hover:text-[#334155]"}`}>
                {g.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="lmx-tab-bar">
            <button onClick={() => setViewMode("board")}
              className={`lmx-tab ${viewMode === "board" ? "lmx-tab-active" : ""}`}>
              <LayoutGrid size={13} /> Board
            </button>
            <button onClick={() => setViewMode("gantt")}
              className={`lmx-tab ${viewMode === "gantt" ? "lmx-tab-active" : ""}`}>
              <CalendarDays size={13} /> Timeline
            </button>
            <button onClick={() => setViewMode("employee-queue")}
              className={`lmx-tab ${viewMode === "employee-queue" ? "lmx-tab-active" : ""}`}>
              <GanttChartSquare size={13} /> Queue
            </button>
            <button onClick={() => setViewMode("sprint")}
              className={`lmx-tab ${viewMode === "sprint" ? "lmx-tab-active" : ""}`}>
              <Layers size={13} /> Sprint
            </button>
          </div>

          {/* Export Button */}
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#334155] hover:border-[#cbd5e1] hover:bg-[#f8fafc] transition-all duration-150 cursor-pointer shadow-sm">
            <Download size={14} /> Export
          </button>

          {/* New Task Button */}
          <button onClick={() => navigate("/tasks/form")}
            className="flex items-center gap-1.5 text-[12.5px] font-bold px-4 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-sm transition-colors">
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      {showFilters && (
        <div className="tracker-card-plain p-3 mb-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="All Statuses" value={fStatus} onChange={setFStatus}
              options={statusOptions} type="status"
              accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Priorities" value={fPriority} onChange={setFPriority}
              options={priorityOptions} type="status"
              accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Assignees" value={fAssignee} onChange={setFAssignee}
              type="member"
              model="employees"
              fetchFields="basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage"
              accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Clients" value={fClient} onChange={setFClient}
              type="default"
              model="clients"
              fetchFields="name"
              fetchTransform={item => ({
                value: item._id,
                label: item.name
              })}
              accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Categories" value={fCategory} onChange={setFCategory}
              type="default"
              model="project_types"
              fetchFields="name"
              fetchTransform={item => ({
                value: item.name,
                label: item.name
              })}
              accentColor="var(--module-project)"
            />
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-ink-muted font-semibold">From</label>
              <input
                type="date" value={fDateFrom}
                onChange={e => setFDateFrom(e.target.value)}
                className="lmx-input py-1.5 text-[12px] w-[130px]"
              />
              <label className="text-[11px] text-ink-muted font-semibold">To</label>
              <input
                type="date" value={fDateTo}
                onChange={e => setFDateTo(e.target.value)}
                className="lmx-input py-1.5 text-[12px] w-[130px]"
              />
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

      {/* ── Board / Timeline / Queue / Sprint ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "board" && (
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
        )}
        {viewMode === "gantt" && (
          <GanttView
            data={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === "employee-queue" && (
          <EmployeeGanttView
            employees={employees}
            currentUserId={user?.id}
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeChange={setSelectedEmployeeId}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === "sprint" && (
          <SprintPlanningPanel />
        )}
      </div>


    </div>
  );
};

export default TasksPage;
