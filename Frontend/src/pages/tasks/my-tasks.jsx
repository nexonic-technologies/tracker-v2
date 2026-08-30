import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import KanbanBoard from "@components/Common/KambanBoard";
import GanttView from "@components/Tasks/GanttView";
import TaskSkeleton from "@components/Common/TaskSkeleton";
import UniversalFilterBar from "@components/Common/UniversalFilterBar";
import TableGenerator from "@components/Common/TableGenerator";
import ProfileImage from "@components/Common/ProfileImage";
import { getUserDisplayName, getUserAvatar } from "../../utils/userUtils";
import {
  User, Plus, Search, X, ChevronDown, SlidersHorizontal,
  LayoutGrid, CalendarDays, Download, Table
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("status");
  const [viewMode, setViewMode] = useState("board"); // 'board' | 'table' | 'gantt'
  const [employees, setEmployees] = useState([]);
  const [task_types, settask_types] = useState([]);

  const [filterValues, setFilterValues] = useState({
    status: null,
    priority: null,
    category: null,
    createdBy: null,
    dateFrom: "",
    dateTo: "",
    search: "",
  });

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

  const handleExport = () => {
    const csvContent = [
      ["Title", "Status", "Priority", "Client", "Category", "Created By", "Due Date", "Created At"],
      ...filteredTasks.map(t => [
        `"${t.title || ""}"`,
        t.status || "",
        t.priorityLevel || "",
        `"${t.clientId?.name || ""}"`,
        `"${t.projectTypeId?.name || ""}"`,
        `"${t.createdBy?.basicInfo ? `${t.createdBy.basicInfo.firstName} ${t.createdBy.basicInfo.lastName}` : ""}"`,
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my_tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredTasks = useMemo(() => {
    let d = allTasks;
    if (filterValues.search) {
      const q = filterValues.search.toLowerCase();
      d = d.filter(t => (t.title || "").toLowerCase().includes(q) || (t.userStory || "").toLowerCase().includes(q));
    }
    if (filterValues.status) d = d.filter(t => t.status === filterValues.status);
    if (filterValues.priority) d = d.filter(t => t.priorityLevel === filterValues.priority);
    if (filterValues.category) {
      d = d.filter(t => {
        const catName = t.projectTypeId?.name || (typeof t.projectTypeId === "string" ? t.projectTypeId : "");
        return catName === filterValues.category;
      });
    }
    if (filterValues.createdBy) {
      d = d.filter(t => {
        const cid = typeof t.createdBy === "object" ? t.createdBy?._id : t.createdBy;
        return String(cid) === String(filterValues.createdBy);
      });
    }
    if (filterValues.dateFrom) d = d.filter(t => t.createdAt && new Date(t.createdAt) >= new Date(filterValues.dateFrom));
    if (filterValues.dateTo) d = d.filter(t => t.createdAt && new Date(t.createdAt) <= new Date(filterValues.dateTo + "T23:59:59"));
    return d;
  }, [allTasks, filterValues]);

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
      key: "createdBy",
      label: "Created By",
      type: "member",
      model: "employees",
      fetchFields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
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

  const customTableRender = {
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
    projectTypeId: t => <span className="text-xs text-ink-muted">{t.projectTypeId?.name || "-"}</span>,
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

  if (loading) return <TaskSkeleton />;

  return (
    <div className="space-y-3 w-full" data-module="project">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-soft pb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-1 border border-hairline flex items-center justify-center text-[var(--module-project)] shadow-xs">
            <User size={17} />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-ink tracking-tight">My Tasks</h1>
            <p className="text-[11.5px] text-ink-muted">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} assigned to you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === "board" && (
            <div className="flex items-center p-0.5 bg-surface-1 border border-hairline rounded-tracker-md">
              {[{ id: "status", label: "Status" }, { id: "priorityLevel", label: "Priority" }].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupBy(g.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-tracker-sm transition-all cursor-pointer ${groupBy === g.id ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <div className="lmx-tab-bar">
            <button onClick={() => setViewMode("board")} className={`lmx-tab ${viewMode === "board" ? "lmx-tab-active" : ""}`}>
              <LayoutGrid size={13} /> Board
            </button>
            <button onClick={() => setViewMode("table")} className={`lmx-tab ${viewMode === "table" ? "lmx-tab-active" : ""}`}>
              <Table size={13} /> Table
            </button>
            <button onClick={() => setViewMode("gantt")} className={`lmx-tab ${viewMode === "gantt" ? "lmx-tab-active" : ""}`}>
              <CalendarDays size={13} /> Timeline
            </button>
          </div>

          <button onClick={() => navigate("/tasks/form")} className="tracker-btn-accent flex items-center gap-1.5 text-[12px] px-3 py-1.5 cursor-pointer">
            <Plus size={13} /> New Task
          </button>
        </div>
      </div>

      {/* ── Universal Filter Bar with Presets ── */}
      <UniversalFilterBar
        filtersConfig={filtersConfig}
        values={filterValues}
        onChange={setFilterValues}
        storageKey="my_tasks"
        accentColor="var(--module-project)"
        searchPlaceholder="Search my tasks..."
        rightActions={
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tracker-md text-[12px] font-semibold border border-hairline bg-surface text-ink-muted hover:text-ink hover:bg-surface-2 transition-all cursor-pointer shadow-xs"
          >
            <Download size={13} /> Export
          </button>
        }
      />

      {/* ── Board / Table / Timeline ── */}
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
              title="My Tasks Table"
              data={filteredTasks}
              customRender={customTableRender}
              customColumns={["title", "status", "priorityLevel", "projectTypeId", "createdBy", "dueDate", "createdAt"]}
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
      </div>
    </div>
  );
};

export default MyTasks;
