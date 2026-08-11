import { useState, useEffect, useCallback } from "react";
import axiosInstance from "@api/axiosInstance";
import { Users, RefreshCw, Clock, Zap, AlertTriangle, CheckCircle2, ChevronDown, GripVertical } from "lucide-react";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@components/ErrorBoundary";

const UtilizationBadge = ({ percent }) => {
  if (percent == null) return null;
  const isHealthy = percent < 80;
  const isBusy = percent >= 80 && percent <= 120;
  const isOverload = percent > 120;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all"
      style={{
        background: isHealthy ? "var(--tracker-success-light)"
          : isBusy ? "var(--tracker-warning-light)"
            : "var(--tracker-danger-light)",
        color: isHealthy ? "var(--tracker-success)"
          : isBusy ? "var(--tracker-warning)"
            : "var(--tracker-danger)",
        borderColor: isHealthy ? "color-mix(in srgb, var(--tracker-success) 30%, transparent)"
          : isBusy ? "color-mix(in srgb, var(--tracker-warning) 30%, transparent)"
            : "color-mix(in srgb, var(--tracker-danger) 30%, transparent)",
      }}
    >
      {isHealthy ? <CheckCircle2 size={11} /> : isOverload ? <AlertTriangle size={11} /> : <Zap size={11} />}
      {percent}% {isHealthy ? "Healthy" : isBusy ? "Busy" : "Overloaded"}
    </span>
  );
};

const PRIORITY_COLORS = {
  "Weekly Priority": "var(--module-hr)",
  "High": "var(--tracker-danger)",
  "Medium": "var(--tracker-warning)",
  "Low": "var(--tracker-success)",
};

const GanttBar = ({ entry, totalSpanMs, startEpoch }) => {
  if (!entry.projectedStart || !entry.projectedEnd) return null;

  const start = new Date(entry.projectedStart).getTime();
  const end = new Date(entry.projectedEnd).getTime();
  const left = Math.max(0, ((start - startEpoch) / totalSpanMs) * 100);
  const width = Math.max(1, ((end - start) / totalSpanMs) * 100);
  const color = entry.isActive
    ? "var(--module-project)"
    : PRIORITY_COLORS[entry.priorityLevel] || "var(--tracker-ink-subtle)";

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded-full h-5 flex items-center px-2 min-w-[6px] transition-all duration-300 group"
      style={{
        left: `${left}%`,
        width: `${Math.min(width, 100 - left)}%`,
        background: entry.isActive
          ? "var(--module-project)"
          : "color-mix(in srgb, " + color + " 30%, transparent)",
        border: `1.5px solid ${color}`,
      }}
    >
      {width > 6 && (
        <span
          className="text-[9px] font-bold truncate select-none"
          style={{ color: entry.isActive ? "#fff" : color }}
        >
          {entry.title}
        </span>
      )}
      <div className="pointer-events-none absolute left-0 top-7 z-50 hidden group-hover:flex flex-col gap-0.5 min-w-[180px] rounded-tracker-md border border-hairline bg-surface shadow-[var(--tracker-shadow-overlay)] p-2.5 text-xs">
        <span className="font-semibold text-ink">{entry.title}</span>
        <span className="text-ink-muted">{entry.estimatedHours}h estimated</span>
        <span className="text-ink-subtle">
          {new Date(entry.projectedStart).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          {" → "}
          {new Date(entry.projectedEnd).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

const TaskRowDraggable = ({ entry, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.taskId,
    disabled: entry.isActive
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex-1 flex items-center min-w-0">
      {!entry.isActive && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab hover:bg-surface-2 rounded text-ink-subtle shrink-0 mr-1 flex items-center justify-center"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </button>
      )}
      {children}
    </div>
  );
};

const TaskRowDroppable = ({ entry, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: entry.taskId
  });

  return (
    <div
      ref={setNodeRef}
      className="transition-all duration-150 rounded-tracker-md"
      style={{
        borderTop: isOver ? '2.5px solid var(--module-project)' : '2.5px solid transparent',
        borderBottom: isOver ? '2.5px solid var(--module-project)' : '2.5px solid transparent',
      }}
    >
      {children}
    </div>
  );
};

const DayAxis = ({ startEpoch, totalSpanMs, dayCount }) => {
  const days = Array.from({ length: dayCount + 1 }, (_, i) => {
    const d = new Date(startEpoch + i * 86400000);
    return { label: d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }), pct: (i / dayCount) * 100 };
  });

  return (
    <div className="relative h-7 border-b border-hairline-soft mb-1 overflow-hidden">
      {days.map((d, i) => (
        <div
          key={i}
          className="absolute top-0 h-full flex items-center"
          style={{ left: `${d.pct}%` }}
        >
          <span className="text-[9px] font-semibold text-ink-subtle whitespace-nowrap pl-1">{d.label}</span>
          <div className="absolute left-0 top-0 h-full w-px bg-hairline-soft" />
        </div>
      ))}
    </div>
  );
};

const EmployeeGanttView = ({ employees = [], currentUserId, selectedEmployeeId, onEmployeeChange, onTaskClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queueDoc, setQueueDoc] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchQueue = useCallback(async (empId) => {
    if (!empId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/employees/${empId}/gantt-queue`);
      const payload = res.data?.data || null;
      setData(payload);
      if (payload?.queueDocId) {
        setQueueDoc({
          _id: payload.queueDocId,
          employeeId: empId,
          queue: payload.rawQueue || []
        });
      } else {
        setQueueDoc(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(selectedEmployeeId); }, [selectedEmployeeId, fetchQueue]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !queueDoc || !data) return;

    const activeIndex = queueDoc.queue.findIndex(e => e.taskId.toString() === active.id.toString());
    const overIndex = queueDoc.queue.findIndex(e => e.taskId.toString() === over.id.toString());

    if (activeIndex === -1 || overIndex === -1) return;

    const activeItem = queueDoc.queue[activeIndex];
    const overItem = queueDoc.queue[overIndex];

    const isTaskActive = (taskId) => {
      const entry = data.entries.find(e => e.taskId.toString() === taskId.toString());
      return entry?.isActive === true;
    };

    if (isTaskActive(activeItem.taskId) || isTaskActive(overItem.taskId)) {
      toast.error("Active tasks cannot be reordered");
      return;
    }

    const reorderedQueue = [...queueDoc.queue];
    const [removed] = reorderedQueue.splice(activeIndex, 1);
    reorderedQueue.splice(overIndex, 0, removed);

    const updatedQueue = reorderedQueue.map((item, index) => ({
      ...item,
      order: index
    }));

    setQueueDoc(prev => ({
      ...prev,
      queue: updatedQueue
    }));

    const updatedEntries = [...data.entries];
    const idOrderMap = new Map(updatedQueue.map((item, idx) => [item.taskId.toString(), idx]));
    updatedEntries.sort((a, b) => {
      const aIdx = idOrderMap.get(a.taskId.toString()) ?? 999;
      const bIdx = idOrderMap.get(b.taskId.toString()) ?? 999;
      return aIdx - bIdx;
    });
    updatedEntries.forEach((entry, idx) => {
      entry.order = idx;
    });
    setData(prev => prev ? { ...prev, entries: updatedEntries } : null);

    try {
      await axiosInstance.put(`/populate/update/employee_task_queues/${queueDoc._id}`, {
        queue: updatedQueue
      });
      toast.success("Queue order updated successfully!");
      fetchQueue(selectedEmployeeId);
    } catch (err) {
      console.error("Failed to update queue order:", err);
      toast.error("Failed to update queue order");
      fetchQueue(selectedEmployeeId);
    }
  };

  const ganttBounds = (() => {
    if (!data?.entries?.length) return null;
    const starts = data.entries.map(e => new Date(e.projectedStart).getTime()).filter(Boolean);
    const ends = data.entries.map(e => new Date(e.projectedEnd).getTime()).filter(Boolean);
    if (!starts.length) return null;
    const minEpoch = Math.min(...starts);
    const maxEpoch = Math.max(...ends);
    const spanMs = maxEpoch - minEpoch || 86400000;
    const dayCount = Math.ceil(spanMs / 86400000);
    return { startEpoch: minEpoch, totalSpanMs: spanMs, dayCount };
  })();

  const empOptions = employees.map(e => ({
    id: e._id,
    name: [e.basicInfo?.firstName, e.basicInfo?.lastName].filter(Boolean).join(" ") || "Employee",
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden" data-module="project">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-1 py-3 border-b border-hairline-soft flex-shrink-0">
        <div className="relative">
          <select
            id="employee-gantt-select"
            value={selectedEmployeeId || ""}
            onChange={e => onEmployeeChange?.(e.target.value)}
            className="lmx-input pr-8 appearance-none text-sm font-semibold min-w-[200px] cursor-pointer"
          >
            <option value="">Select Employee</option>
            {empOptions.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
        </div>

        {data && <UtilizationBadge percent={data.utilizationPercent} />}

        {data && (
          <div className="flex items-center gap-3 ml-auto text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {data.totalQueueHours}h total
            </span>
            <span>·</span>
            <span>{data.projectionDays} working days</span>
            <span>·</span>
            <span>{data.entries.length} tasks</span>
          </div>
        )}

        <button
          onClick={() => fetchQueue(selectedEmployeeId)}
          disabled={loading}
          className="tracker-btn-ghost p-2 ml-2 flex-shrink-0"
          title="Refresh queue"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-40 h-8 bg-surface-1 rounded-tracker-md flex-shrink-0" />
                <div className="flex-1 h-8 bg-surface-1 rounded-full" style={{ width: `${40 + i * 15}%` }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-ink-muted">
            <AlertTriangle size={28} className="text-[var(--tracker-warning)]" />
            <p>{error}</p>
            <button onClick={() => fetchQueue(selectedEmployeeId)} className="tracker-btn-secondary text-xs px-3 py-1.5">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && data.entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-sm text-ink-muted">
            <Users size={32} className="text-ink-tertiary" />
            <p className="font-medium">No tasks in queue</p>
            <p className="text-xs">Assign tasks to this employee to see their workload timeline.</p>
          </div>
        )}

        {!loading && !error && data && data.entries.length > 0 && ganttBounds && (
          <div className="p-4 min-w-[700px]">
            <div className="flex">
              <div className="w-44 flex-shrink-0" />
              <div className="flex-1 relative">
                <DayAxis {...ganttBounds} />
              </div>
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex flex-col gap-1.5 mt-1">
                {data.entries.map((entry, idx) => (
                  <TaskRowDroppable key={entry.taskId} entry={entry}>
                    <div
                      className="flex items-center gap-0 group/row hover:bg-surface-1 rounded-tracker-md transition-colors"
                      onClick={() => onTaskClick?.({ ...entry, _id: entry._id || entry.taskId })}
                    >
                      <TaskRowDraggable entry={entry}>
                        <div className="w-44 flex-shrink-0 flex items-center gap-2 px-2 py-2 cursor-pointer">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{
                              background: entry.isActive ? "var(--module-project)" : "var(--tracker-surface-chip)",
                              color: entry.isActive ? "#fff" : "var(--tracker-ink-muted)",
                            }}
                          >
                            {entry.isActive ? "▶" : idx + 1}
                          </span>

                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: PRIORITY_COLORS[entry.priorityLevel] || "var(--tracker-border)" }}
                          />

                          <span className="text-[11.5px] font-semibold text-ink truncate leading-tight">
                            {entry.title}
                          </span>
                        </div>
                      </TaskRowDraggable>

                      <div className="flex-1 relative h-9">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-hairline-soft -translate-y-1/2" />
                        <GanttBar entry={entry} {...ganttBounds} />
                      </div>

                      <div className="w-20 flex-shrink-0 text-right pr-2">
                        <span className="text-[10px] font-medium text-ink-muted">
                          {entry.projectedEnd
                            ? new Date(entry.projectedEnd).toLocaleDateString([], { month: "short", day: "numeric" })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </TaskRowDroppable>
                ))}
              </div>
            </DndContext>

            <p className="mt-4 text-[10px] text-ink-tertiary text-right pr-2">
              Projected {new Date(data.computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" · Anchor: today 09:00 (stable)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const EmployeeGanttViewWithErrorBoundary = (props) => {
  return (
    <ErrorBoundary>
      <EmployeeGanttView {...props} />
    </ErrorBoundary>
  );
};

export default EmployeeGanttViewWithErrorBoundary;
