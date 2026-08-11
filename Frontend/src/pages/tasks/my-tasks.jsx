import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import KanbanBoard from "@components/Common/KambanBoard";
import GanttView from "@components/Tasks/GanttView";
import TaskSkeleton from "@components/Common/TaskSkeleton";
import FilterDropdown from "@components/Common/FilterDropdown";
import { User, Plus, Search, X, ChevronDown, SlidersHorizontal, LayoutGrid, CalendarDays, Download } from "lucide-react";

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

const MyTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("status");
  const [viewMode, setViewMode] = useState("board");
  const [employees, setEmployees] = useState([]);
  const [task_types, settask_types] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState(null);
  const [fPriority, setFPriority] = useState(null);
  const [fCategory, setFCategory] = useState(null);
  const [fAssignee, setFAssignee] = useState(null);
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  useEffect(() => { fetchMyTasks(); fetchMeta(); }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/tasks", {
        filter: { assignedTo: user.id, metaStatus: { $ne: 'archived' } },
        populateFields: {
          clientId: "name",
          projectTypeId: "name",
          taskTypeId: "name",
          createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
          assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        },
        limit: 500,
      });
      setAllTasks(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMeta = async () => {
    try {
      const [eRes, tRes] = await Promise.all([
        axiosInstance.post("/populate/read/employees", {
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        }),
        axiosInstance.post("/populate/read/task_types"),
      ]);
      setEmployees(eRes.data.data || []);
      settask_types(tRes.data.data || []);
    } catch (e) { console.error(e); }
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
      setAllTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: task[field] } : t));
    }
  };

  const handleExport = async () => {
    try {
      const res = await axiosInstance.get("/export/tasks", {
        params: { status: fStatus, priority: fPriority },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "my_tasks_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const categoryOptions = useMemo(() =>
    [...new Set(allTasks.map(t => t.projectTypeId?.name).filter(Boolean))].map(n => ({ value: n, label: n })),
    [allTasks]
  );

  const filteredTasks = useMemo(() => {
    let d = allTasks;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.userStory || "").toLowerCase().includes(q)
      );
    }
    if (fStatus) d = d.filter(t => t.status === fStatus);
    if (fPriority) d = d.filter(t => t.priorityLevel === fPriority);
    if (fCategory) d = d.filter(t => t.projectTypeId?.name === fCategory);
    if (fAssignee) d = d.filter(t => t.assignedTo?.some(a => String(a._id || a) === fAssignee));
    if (fDateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(fDateFrom));
    if (fDateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(fDateTo + "T23:59:59"));
    return d;
  }, [allTasks, search, fStatus, fPriority, fCategory, fAssignee, fDateFrom, fDateTo]);

  const activeFilters = [fStatus, fPriority, fCategory, fAssignee, fDateFrom, fDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setFStatus(null); setFPriority(null); setFCategory(null);
    setFAssignee(null); setFDateFrom(""); setFDateTo("");
  };

  const assigneeOptions = employees.map(e => ({
    value: e._id,
    label: `${e.basicInfo?.firstName || ""} ${e.basicInfo?.lastName || ""}`.trim(),
    profileImage: e.basicInfo?.profileImage,
    firstName: e.basicInfo?.firstName,
    lastName: e.basicInfo?.lastName,
  }));

  if (loading) return <TaskSkeleton />;

  return (
    <div className="flex flex-col h-full bg-canvas" data-module="project">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between pb-3 flex-wrap gap-2">
        <div>
          <p className="lmx-page-eyebrow mb-1">PROJECTS</p>
          <h1 className="text-[22px] font-semibold text-ink flex items-center gap-2 tracking-tight">
            <User size={18} style={{ color: "var(--module-project)" }} />
            My Tasks
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Group-by toggle — lmx-tab-bar pattern */}
          <div className="lmx-tab-bar !p-0.5 !gap-0.5">
            {[{ id: "status", label: "Status" }, { id: "priorityLevel", label: "Priority" }].map(g => (
              <button key={g.id} onClick={() => setGroupBy(g.id)}
                className={`lmx-tab text-[11px] px-3 py-1.5 ${groupBy === g.id ? "lmx-tab-active" : ""}`}>
                {g.label}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="lmx-tab-bar !p-0.5 !gap-0.5">
            <button onClick={() => setViewMode("board")}
              className={`lmx-tab text-[11px] px-3 py-1.5 ${viewMode === "board" ? "lmx-tab-active" : ""}`}>
              <LayoutGrid size={13} className="mr-1 inline-block" /> Board
            </button>
            <button onClick={() => setViewMode("gantt")}
              className={`lmx-tab text-[11px] px-3 py-1.5 ${viewMode === "gantt" ? "lmx-tab-active" : ""}`}>
              <CalendarDays size={13} className="mr-1 inline-block" /> Timeline
            </button>
          </div>

          {/* Export Button */}
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold border border-hairline bg-surface text-ink-muted hover:text-ink hover:border-ink-subtle transition-all duration-150 cursor-pointer">
            <Download size={13} /> Export
          </button>

          <button onClick={() => navigate("/tasks/form")}
            className="tracker-btn-accent flex items-center gap-1.5 text-[12px] px-3 py-1.5">
            <Plus size={13} /> New Task
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="tracker-card-plain p-3 mb-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search my tasks…"
              className="lmx-input pl-8 pr-8 py-1.5 text-[12px]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-ink-subtle" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold border transition-colors ${showFilters || activeFilters > 0
              ? "border-[var(--module-project)] bg-[var(--module-project-light)] text-[var(--module-project)]"
              : "border-hairline bg-surface text-ink-muted hover:text-ink"
              }`}
          >
            <SlidersHorizontal size={13} />
            Filters {activeFilters > 0 && (
              <span className="ml-0.5 bg-[var(--module-project)] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Quick Filters (Category & Priority) placed inline in main bar */}
          <FilterDropdown
            label="Category" value={fCategory} onChange={setFCategory}
            options={categoryOptions} accentColor="var(--module-project)"
          />
          <FilterDropdown
            label="Priority" value={fPriority} onChange={setFPriority}
            options={PRIORITIES.map(p => ({ value: p, label: p }))}
            type="status" accentColor="var(--module-project)"
          />

          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-tracker-md bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]">
              <X size={10} /> Clear all
            </button>
          )}

          {(search || activeFilters > 0) && (
            <span className="ml-auto text-[12px] text-ink-muted font-medium">
              {filteredTasks.length} / {allTasks.length} shown
            </span>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-hairline-soft">
            <FilterDropdown
              label="All Statuses" value={fStatus} onChange={setFStatus}
              options={STATUSES.map(s => ({ value: s, label: s }))}
              type="status" accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Priorities" value={fPriority} onChange={setFPriority}
              options={PRIORITIES.map(p => ({ value: p, label: p }))}
              type="status" accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Categories" value={fCategory} onChange={setFCategory}
              options={categoryOptions} accentColor="var(--module-project)"
            />
            <FilterDropdown
              label="All Assignees" value={fAssignee} onChange={setFAssignee}
              options={assigneeOptions} type="member" accentColor="var(--module-project)"
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
          </div>
        )}
      </div>

      {/* ── Board / Timeline ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "board" ? (
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
            showClientFilter={false}
            showFollowerFilter={false}
            hideHeader={true}
            onNewTask={() => navigate("/tasks/form")}
          />
        ) : (
          <GanttView
            data={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>


    </div>
  );
};

export default MyTasks;
