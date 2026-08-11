import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import {
  Layers, GripVertical, CalendarRange, CheckCircle2,
  Clock, ChevronDown, RefreshCw, Plus, X,
} from "lucide-react";

const PRIORITY_STYLES = {
  "Weekly Priority": { bg: "var(--module-hr-light)",       text: "var(--module-hr)" },
  "High":            { bg: "var(--tracker-danger-light)",  text: "var(--tracker-danger)" },
  "Medium":          { bg: "var(--tracker-warning-light)", text: "var(--tracker-warning)" },
  "Low":             { bg: "var(--tracker-success-light)", text: "var(--tracker-success)" },
};

const TaskCard = ({ task, isDragOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id });
  const pStyle = PRIORITY_STYLES[task.priorityLevel] || PRIORITY_STYLES["Low"];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging && !isDragOverlay ? 0.35 : 1,
    cursor:    isDragOverlay ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="tracker-card-plain flex items-start gap-2.5 p-3 mb-2 hover:shadow-[var(--tracker-shadow-raised)] transition-all duration-150 select-none"
    >
      <GripVertical size={14} className="text-ink-tertiary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-ink leading-snug truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priorityLevel && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
              style={{ background: pStyle.bg, color: pStyle.text }}
            >
              {task.priorityLevel}
            </span>
          )}
          {task.estimatedHours && (
            <span className="flex items-center gap-1 text-[10px] text-ink-muted">
              <Clock size={9} /> {task.estimatedHours}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SprintDropZone = ({ sprint, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: sprint._id });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 rounded-tracker-xl border-2 transition-all duration-200 min-h-[240px] p-3"
      style={{
        borderColor: isOver ? "var(--module-project)"        : "var(--tracker-border)",
        background:  isOver ? "var(--module-project-light)"  : "var(--tracker-surface-1)",
        borderStyle: isOver ? "solid" : "dashed",
      }}
    >
      {tasks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-full gap-2 py-8 text-center"
          style={{ color: isOver ? "var(--module-project)" : "var(--tracker-ink-tertiary)" }}
        >
          <Layers size={24} />
          <p className="text-xs font-semibold">{isOver ? "Release to assign" : "Drag tasks here"}</p>
        </div>
      ) : (
        tasks.map(task => <TaskCard key={task._id} task={task} />)
      )}
    </div>
  );
};

const CreateSprintModal = ({ onClose, onCreated, userId }) => {
  const today     = new Date().toISOString().split("T")[0];
  const twoWeeks  = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];

  const [form, setForm]   = useState({ name: "", startDate: today, endDate: twoWeeks });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const durationDays =
    form.startDate && form.endDate && new Date(form.endDate) > new Date(form.startDate)
      ? Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86_400_000)
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())               { setError("Sprint name is required.");            return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required.");  return; }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await axiosInstance.post("/populate/create/sprints", {
        name:      form.name.trim(),
        startDate: form.startDate,
        endDate:   form.endDate,
        status:    "Upcoming",
        createdBy: userId,
      });
      onCreated(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create sprint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <Layers size={15} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Create Sprint</h2>
              <p className="text-[10px] text-slate-400">Plan a new iteration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Sprint Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sprint 1 — July 2026"
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              />
            </div>
          </div>

          {durationDays && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl text-[11px] text-blue-600 font-medium">
              <CalendarRange size={12} />
              {durationDays}-day sprint
              <span className="text-blue-400 font-normal ml-auto">
                {new Date(form.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {" → "}
                {new Date(form.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <><RefreshCw size={11} className="animate-spin" /> Creating…</>
              ) : (
                <><Plus size={11} /> Create Sprint</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SprintPlanningPanel = () => {
  const { user } = useAuth();

  const [sprints,        setSprints]        = useState([]);
  const [backlogTasks,   setBacklogTasks]   = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [activeDrag,     setActiveDrag]     = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const fetchSprints = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/sprints", {
        filters: { status: "Upcoming" },
        sort:    { startDate: 1 },
        fields:  "name startDate endDate tasks status",
      });
      const list = res.data?.data || [];
      setSprints(list);
      if (list.length && !selectedSprint) setSelectedSprint(list[0]);
    } catch { /* swallow */ }
  };

  const fetchBacklogs = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/populate/read/tasks", {
        filters: { status: "Backlogs" },
        fields:  "title priorityLevel estimatedHours assignedTo sprintId",
        sort:    { createdAt: -1 },
      });
      setBacklogTasks((res.data?.data || []).filter(t => !t.sprintId));
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprints();
    fetchBacklogs();
  }, []);

  const handleDragStart = ({ active }) => {
    setActiveDrag(backlogTasks.find(t => t._id === active.id) || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveDrag(null);
    if (!over || !selectedSprint || over.id !== selectedSprint._id) return;

    const taskId = active.id;
    setSaving(true);
    try {
      await axiosInstance.put(`/populate/update/sprints/${selectedSprint._id}`, {
        $addToSet: { tasks: taskId },
      });
      setSelectedSprint(prev => ({
        ...prev,
        tasks: [...(prev.tasks || []), taskId],
      }));
    } catch (err) {
      console.error("[SprintPanel] assign task failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSprintCreated = async (newSprint) => {
    setShowCreateModal(false);
    const res = await axiosInstance.post("/populate/read/sprints", {
      filters: { status: "Upcoming" },
      sort:    { startDate: 1 },
      fields:  "name startDate endDate tasks status",
    }).catch(() => null);
    const list = res?.data?.data || [];
    setSprints(list);
    const found = list.find(s => s._id === newSprint?._id) || newSprint;
    if (found) setSelectedSprint(found);
  };

  const sprintTaskIds     = new Set((selectedSprint?.tasks || []).map(String));
  const availableBacklogs = backlogTasks.filter(t => !sprintTaskIds.has(t._id));
  const inSprintTasks     = backlogTasks.filter(t => sprintTaskIds.has(t._id));

  return (
    <div className="flex flex-col h-full overflow-hidden p-1" data-module="project">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-hairline-soft flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="lmx-icon-tile"><Layers size={16} /></div>
          <div>
            <p className="lmx-page-eyebrow">Sprint Planning</p>
            <h2 className="text-[15px] font-bold text-ink leading-tight">Drag tasks into a sprint</h2>
          </div>
        </div>

        <div className="relative sm:ml-auto">
          <select
            id="sprint-planning-select"
            value={selectedSprint?._id || ""}
            onChange={e => setSelectedSprint(sprints.find(s => s._id === e.target.value) || null)}
            className="lmx-input pr-8 appearance-none text-sm font-semibold min-w-[220px]"
          >
            {sprints.length === 0 && <option value="">No upcoming sprints</option>}
            {sprints.map(s => (
              <option key={s._id} value={s._id}>
                {s.name} ({new Date(s.startDate).toLocaleDateString([], { month: "short", day: "numeric" })} – {new Date(s.endDate).toLocaleDateString([], { month: "short", day: "numeric" })})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
        </div>

        {selectedSprint && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-hairline bg-surface text-xs font-medium text-ink-muted flex-shrink-0">
            <CalendarRange size={11} />
            {new Date(selectedSprint.startDate).toLocaleDateString([], { month: "short", day: "numeric" })}
            {" — "}
            {new Date(selectedSprint.endDate).toLocaleDateString([], { month: "short", day: "numeric" })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all cursor-pointer flex-shrink-0"
        >
          <Plus size={13} /> New Sprint
        </button>

        <button
          type="button"
          onClick={() => { fetchSprints(); fetchBacklogs(); }}
          className="tracker-btn-ghost p-2"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden mt-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full overflow-hidden">
            <div className="flex flex-col w-1/2 min-w-0">
              <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
                <h3 className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">
                  Backlog · {availableBacklogs.length}
                </h3>
                {loading && <RefreshCw size={11} className="animate-spin text-ink-tertiary" />}
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                {!loading && availableBacklogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-xs text-ink-tertiary">
                    <CheckCircle2 size={24} />
                    <p>All backlog tasks are assigned</p>
                  </div>
                )}
                {availableBacklogs.map(task => <TaskCard key={task._id} task={task} />)}
              </div>
            </div>

            <div className="flex flex-col w-1/2 min-w-0">
              <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
                <h3 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--module-project)" }}>
                  {selectedSprint?.name || "Select sprint"} · {inSprintTasks.length}
                </h3>
                {saving && <span className="text-[10px] text-ink-muted animate-pulse">Saving…</span>}
              </div>

              {selectedSprint ? (
                <SprintDropZone sprint={selectedSprint} tasks={inSprintTasks} />
              ) : (
                <div
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 rounded-tracker-xl border-2 border-dashed border-hairline flex flex-col items-center justify-center gap-2 text-xs text-ink-tertiary cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <Plus size={22} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  <p className="font-semibold">No sprint selected</p>
                  <p className="text-[10px] opacity-70">Click to create your first sprint</p>
                </div>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeDrag && (
              <div className="w-72 rotate-1 scale-105">
                <TaskCard task={activeDrag} isDragOverlay />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {showCreateModal && (
        <CreateSprintModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleSprintCreated}
          userId={user?.id}
        />
      )}
    </div>
  );
};

export default SprintPlanningPanel;
