import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import KanbanBoard from "@components/Common/KambanBoard";
import GanttView from "@components/Tasks/GanttView";
import TaskSkeleton from "@components/Common/TaskSkeleton";
import StatCard from "@components/Common/StatCard";
import { ArrowLeft, Building2, LayoutGrid, Clock, CheckCircle2, Plus, CalendarDays, Download } from "lucide-react";

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

const buildCategoryColumns = (tasks) => {
  const cats = [...new Set(tasks.map((t) => t.projectTypeId?.name).filter(Boolean))];
  if (!cats.length) cats.push("General");
  return cats.map((c) => ({ id: c, title: c }));
};

const ClientKanbanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [task_types, settask_types] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("projectTypeId.name");
  const [viewMode, setViewMode] = useState("board");
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cR, tR, eR, tyR] = await Promise.all([
        axiosInstance.post(`/populate/read/clients/${id}`),
        axiosInstance.post("/populate/read/tasks", {
          filter: { clientId: id },
          populateFields: {
            clientId: "name",
            projectTypeId: "name",
            taskTypeId: "name",
            createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
            assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
          },
        }),
        axiosInstance.post("/populate/read/employees"),
        axiosInstance.post("/populate/read/task_types"),
      ]);
      setClient(cR.data.data);
      setTasks(tR.data.data || []);
      setEmployees(eR.data.data || []);
      settask_types(tyR.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCardMove = async (task, _from, toCol) => {
    try {
      if (groupBy === "projectTypeId.name") {
        const matched = task_types.find((t) => t.name === toCol);
        if (matched) await axiosInstance.put(`/populate/update/tasks/${task._id}`, { projectTypeId: matched._id });
      } else {
        const field = groupBy === "status" ? "status" : "priorityLevel";
        await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: toCol });
      }
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleCardUpdate = async (task, field, value) => {
    try {
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: value } : t));
      await axiosInstance.put(`/populate/update/tasks/${task._id}`, { [field]: value });
    } catch (e) {
      console.error(e);
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, [field]: task[field] } : t));
    }
  };

  const handleExport = async () => {
    try {
      const res = await axiosInstance.get("/export/tasks", {
        params: { client: id },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `client_${id}_tasks_export.csv`);
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

  const columnsMap = {
    "projectTypeId.name": buildCategoryColumns(tasks),
    "status": STATUS_COLS,
    "priorityLevel": PRIORITY_COLS,
  };

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  if (loading) return <TaskSkeleton />;

  return (
    <div className="flex flex-col h-full bg-canvas" data-module="project">
      <div className="px-6 pt-6 pb-4 space-y-5">

        {/* back */}
        <button onClick={() => navigate("/tasks/clients-tasks")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--module-accent)] hover:opacity-75 transition-opacity">
          <ArrowLeft size={14} /> All Clients
        </button>

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="lmx-page-eyebrow mb-1">PROJECTS</p>
            <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
              <Building2 size={22} className="text-[var(--module-project)]" />
              {client?.name || "Client Board"}
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              {total} task{total !== 1 ? "s" : ""} · {columnsMap["projectTypeId.name"].length} categor{columnsMap["projectTypeId.name"].length !== 1 ? "ies" : "y"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Group-by */}
            <div className="flex items-center gap-1 p-1 rounded-tracker-lg bg-surface-2">
              {[
                { id: "projectTypeId.name", label: "Category" },
                { id: "status", label: "Status" },
                { id: "priorityLevel", label: "Priority" },
              ].map((g) => (
                <button key={g.id} onClick={() => setGroupBy(g.id)}
                  className={`px-3 py-1.5 rounded-tracker-md text-[13px] font-medium transition-all ${groupBy === g.id ? "bg-[var(--module-accent)] text-white shadow-sm" : "text-ink-muted hover:text-ink"
                    }`}>
                  {g.label}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-tracker-lg bg-surface-2 ml-2">
              <button onClick={() => setViewMode("board")}
                className={`px-3 py-1.5 rounded-tracker-md text-[13px] font-medium transition-all ${viewMode === "board" ? "bg-[var(--module-accent)] text-white shadow-sm" : "text-ink-muted hover:text-ink"}`}>
                <LayoutGrid size={14} className="mr-1 inline-block" /> Board
              </button>
              <button onClick={() => setViewMode("gantt")}
                className={`px-3 py-1.5 rounded-tracker-md text-[13px] font-medium transition-all ${viewMode === "gantt" ? "bg-[var(--module-accent)] text-white shadow-sm" : "text-ink-muted hover:text-ink"}`}>
                <CalendarDays size={14} className="mr-1 inline-block" /> Timeline
              </button>
            </div>

            {/* Export Button */}
            <button onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[13px] font-medium border border-hairline bg-surface text-ink-muted hover:text-ink hover:border-ink-subtle transition-all duration-150 cursor-pointer ml-2">
              <Download size={14} /> Export
            </button>

            <button onClick={() => navigate("/tasks/form", { state: { selectedClient: client } })}
              className="tracker-btn-accent flex items-center gap-2">
              <Plus size={15} /> New Task
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard title="Total" value={total} icon={LayoutGrid} color="blue" />
          <StatCard title="In Progress" value={inProgress} icon={Clock} color="yellow" />
          <StatCard title="Completed" value={completed} icon={CheckCircle2} color="green" />
        </div>
      </div>

      {/* ── Board / Timeline ── */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {viewMode === "board" ? (
          <KanbanBoard
            data={tasks}
            groupBy={groupBy}
            columns={columnsMap[groupBy]}
            currentUserId={user?.id}
            onCardClick={handleTaskClick}
            onCardMove={handleCardMove}
            onCardUpdate={handleCardUpdate}
            employees={employees}
            task_types={task_types}
            showFollowerFilter
            onNewTask={() => navigate("/tasks/form", { state: { selectedClient: client } })}
          />
        ) : (
          <GanttView
            data={tasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>


    </div>
  );
};

export default ClientKanbanPage;
