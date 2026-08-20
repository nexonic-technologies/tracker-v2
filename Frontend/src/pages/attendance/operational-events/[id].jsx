import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import axiosInstance from "../../../api/axiosInstance";
import ProfileImage from "../../../components/Common/ProfileImage.jsx";
import {
  ChevronLeft, Check, X, Clock, AlertCircle, AlertTriangle, CheckCircle2,
  ExternalLink, User, Building2, UserMinus, Loader2, ArrowRight, ShieldCheck,
  Calendar, Layers, Sparkles, Send
} from "lucide-react";
import toast from "react-hot-toast";

export default function OperationalEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { readDetailed, update, loading: apiLoading } = useGenericAPI();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Queue tasks and reassignment state
  const [queueTasks, setQueueTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await readDetailed("operational_events", {
        id,
        populateFields: {
          employeeId: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.empId,professionalInfo.department,professionalInfo.designation,contactInfo.email",
          resolvedBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.designation",
          taskId: "title,priorityLevel,status,estimatedHours",
          ticketId: "title,ticketId,priority,status"
        }
      });
      if (res?.data) {
        let eventData = res.data;
        const empId = eventData.employeeId?._id || eventData.employeeId;
        if (empId) {
          loadQueueTasks(empId);
          if ((!eventData.employeeId?.basicInfo || typeof eventData.employeeId === 'string') && empId) {
            try {
              const empRes = await readDetailed("employees", {
                id: empId,
                populateFields: {
                  "professionalInfo.department": "name",
                  "professionalInfo.designation": "title"
                }
              });
              if (empRes?.data) {
                eventData = { ...eventData, employeeId: empRes.data };
              }
            } catch (e) {
              console.warn("Could not fetch employee details for operational event:", e);
            }
          }
        }
        setData(eventData);
      } else {
        setError("Operational SLA incident record not found.");
      }
    } catch (err) {
      setError("Failed to load operational event details.");
    } finally {
      setLoading(false);
    }
  }, [id, readDetailed]);

  const loadQueueTasks = async (employeeId) => {
    setLoadingTasks(true);
    try {
      const res = await axiosInstance.get(`/employees/${employeeId}/gantt-queue`);
      setQueueTasks(res.data?.data?.entries || []);
    } catch {
      // Non-critical queue loading
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const selectTask = (task) => {
    setSelectedTask(task);
    setLoadingSuggestions(true);
    setOverrideDate("");
    axiosInstance.get(`/tasks/${task.taskId}/reassign-suggestions`)
      .then(res => {
        setSuggestions(res.data?.data || []);
      })
      .catch(() => {
        toast.error("Failed to load reassignment suggestions");
      })
      .finally(() => setLoadingSuggestions(false));
  };

  const handleReassign = async (targetEmployeeId) => {
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/tasks/${selectedTask.taskId}`, {
        assignedTo: [targetEmployeeId]
      });
      toast.success("Task reassigned successfully");
      setQueueTasks(prev => prev.filter(t => t.taskId !== selectedTask.taskId));
      setSelectedTask(null);
      if (selectedTask.linkedTicketId) {
        await axiosInstance.post(`/tickets/${selectedTask.linkedTicketId}/recalculate-eta`);
      }
    } catch {
      toast.error("Reassignment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverrideETA = async () => {
    if (!overrideDate || !selectedTask) return;
    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/tickets/${selectedTask.linkedTicketId}`, {
        etaEstimatedDelivery: new Date(overrideDate),
        delayReason: 'CAPACITY_DELAY',
        rootCause: 'DEPENDENCY_BLOCKED'
      });
      toast.success("Ticket ETA updated successfully");
      setSelectedTask(null);
    } catch {
      toast.error("Failed to update ETA");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveEvent = async () => {
    if (!data) return;
    setActionBusy(true);
    try {
      await update("operational_events", data._id, {
        resolvedAt: new Date(),
        resolvedBy: user?.id || user?._id,
        remarks: comment || "SLA capacity alert reviewed and signed off by management."
      }, "Operational SLA incident resolved!");
      setComment("");
      await fetchRecord();
    } catch (err) {
      // Handled by generic API
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50dvh] bg-canvas" data-module="attendance">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-7 w-7 border-2 border-[var(--module-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-ink-muted">Loading incident telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lmx-content py-6 max-w-xl mx-auto" data-module="attendance">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors mb-4 px-3 py-1.5 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <div className="p-5 bg-surface border border-hairline rounded-tracker-card flex items-center gap-3 shadow-xs">
          <AlertCircle className="text-tracker-danger shrink-0" size={24} />
          <div>
            <h2 className="text-sm font-bold text-ink">Incident Record Not Found</h2>
            <p className="text-xs text-ink-muted mt-0.5">{error || "The operational event record could not be loaded."}</p>
          </div>
        </div>
      </div>
    );
  }

  const isResolved = Boolean(data.resolvedAt);
  const empObj = typeof data.employeeId === 'object' ? data.employeeId : null;
  const firstName = empObj?.basicInfo?.firstName || empObj?.firstName || "";
  const lastName = empObj?.basicInfo?.lastName || empObj?.lastName || "";
  const empFullName = `${firstName} ${lastName}`.trim() || empObj?.name || "Assigned Personnel";
  const empIdStr = empObj?.professionalInfo?.empId || empObj?.empId || "EMP-—";
  const empDept = empObj?.professionalInfo?.department?.name || empObj?.professionalInfo?.department || empObj?.department || "Engineering";
  const empDesignation = empObj?.professionalInfo?.designation?.title || empObj?.professionalInfo?.designation || empObj?.designation || "Team Member";

  const resolverObj = data.resolvedBy;
  const resolverName = resolverObj?.basicInfo
    ? `${resolverObj.basicInfo.firstName || ""} ${resolverObj.basicInfo.lastName || ""}`.trim()
    : "Manager";

  const rootCauseLabel =
    data.rootCause === "EMPLOYEE_ABSENCE"
      ? "Unplanned Absence"
      : data.rootCause === "PLANNED_LEAVE"
      ? "Scheduled Leave"
      : data.rootCause === "DEPENDENCY_BLOCKED"
      ? "Dependency Block"
      : data.rootCause || "Operational Capacity";

  const delayReasonLabel =
    data.delayReason === "CAPACITY_DELAY"
      ? "Capacity Bottleneck"
      : data.delayReason === "SLA_BREACH"
      ? "SLA Delivery Breach"
      : data.delayReason || "Schedule Shift";

  const affectedCount = data.metadata?.affectedTasks ?? queueTasks.length;
  const latestEtaStr = data.metadata?.latestETA
    ? new Date(data.metadata.latestETA).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="lmx-content py-4 max-w-6xl mx-auto space-y-4" data-module="attendance">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors px-2.5 py-1.5 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-xs font-mono text-ink-subtle hidden sm:inline">
            Incident: <strong className="text-ink font-semibold">{data._id}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
            data.severity === "CRITICAL"
              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
              : data.severity === "WARNING"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
          }`}>
            {data.severity || "WARNING"}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
            isResolved
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse"
          }`}>
            {isResolved ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
            {isResolved ? "Resolved" : "Active SLA Alert"}
          </span>
        </div>
      </div>

      {/* 2. Main Executive Diagnostic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left Column: Personnel & Incident Telemetry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Diagnostic Card */}
          <div className="tracker-card p-4 sm:p-5 bg-surface space-y-4 shadow-xs">
            {/* Title & Category Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline-soft pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={13} /> {rootCauseLabel} · Delivery Impact
                </span>
                <h1 className="text-lg font-bold text-ink mt-0.5">
                  {data.type === "SLA_DELAY" ? "SLA Delivery Delay Incident" : "Operational Capacity Event"}
                </h1>
              </div>
              <span className="text-[11px] text-ink-subtle">
                Detected: {new Date(data.occurredAt || data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Compact Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Personnel Bio Card */}
              <div className="p-3 rounded-tracker-md bg-[var(--tracker-surface-1)] border border-hairline flex items-center gap-3">
                <ProfileImage
                  profileImage={empObj?.basicInfo?.profileImage}
                  firstName={firstName}
                  lastName={lastName}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle block truncate">
                    Absent Personnel
                  </span>
                  <p className="text-xs font-bold text-ink truncate mt-0.5">{empFullName}</p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {empIdStr} · {empDesignation} ({empDept})
                  </p>
                </div>
              </div>

              {/* Root Cause & Factor */}
              <div className="p-3 rounded-tracker-md bg-[var(--tracker-surface-1)] border border-hairline space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle block">
                  Root Cause Diagnosis
                </span>
                <p className="text-xs font-bold text-ink">{delayReasonLabel}</p>
                <p className="text-[11px] text-ink-muted">
                  Primary Trigger: <strong className="text-ink">{rootCauseLabel}</strong>
                </p>
              </div>

              {/* Delivery Timeline Impact Banner */}
              <div className="sm:col-span-2 p-3 rounded-tracker-md bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className="text-amber-600 dark:text-amber-400 shrink-0" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">
                      {affectedCount} Task{affectedCount === 1 ? "" : "s"} In Queue Impacted
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      Furthest projected milestone completion: <strong className="text-amber-600 dark:text-amber-400">{latestEtaStr}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const empId = data.employeeId?._id || (typeof data.employeeId === 'string' ? data.employeeId : null);
                    const targetUrl = empId ? `/tasks?view=queue&employeeId=${empId}` : `/tasks?view=queue`;
                    navigate(targetUrl);
                  }}
                  className="tracker-btn-ghost px-2 py-1 text-[11px] font-bold text-ink hover:text-[var(--module-accent)] shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  Gantt <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Affected Developer Tasks Matrix */}
            <div className="border-t border-hairline-soft pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Impacted Queue Tasks ({queueTasks.length})
                </h3>
                {selectedTask && (
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {loadingTasks ? (
                <div className="py-4 flex justify-center items-center">
                  <Loader2 className="animate-spin text-[var(--module-accent)]" size={18} />
                </div>
              ) : queueTasks.length === 0 ? (
                <div className="p-3 text-center bg-[var(--tracker-surface-1)] rounded-tracker-md border border-hairline text-xs text-ink-muted">
                  No pending queue tasks currently allocated to this personnel today.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {queueTasks.map((t) => {
                    const isSelected = selectedTask?.taskId === t.taskId;
                    return (
                      <div
                        key={t.taskId}
                        onClick={() => selectTask(t)}
                        className={`p-2.5 rounded-tracker-md border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-[var(--tracker-surface-2)] border-[var(--module-accent)] shadow-xs"
                            : "bg-[var(--tracker-surface-1)] border-hairline hover:bg-[var(--tracker-surface-2)]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className={`text-xs font-bold truncate ${isSelected ? "text-[var(--module-accent)]" : "text-ink"}`}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-ink-subtle mt-0.5">
                            Estimate: {t.estimatedHours || 2}h · Delivery ETA: {new Date(t.projectedEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-tracker-sm border shrink-0 ${
                          isSelected
                            ? "bg-[var(--module-accent)] text-white border-transparent"
                            : "bg-surface border-hairline text-ink-muted"
                        }`}>
                          {isSelected ? "Selected" : "Mitigate"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Mitigation / Sign-off Control Center */}
        <div className="space-y-4">
          {/* Mitigation Actions Panel (When Task Selected) */}
          {selectedTask && (
            <div className="tracker-card p-4 bg-surface space-y-3 border-2 border-[var(--module-accent)]/40 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--module-accent)]" /> Mitigate Task
                </span>
                <span className="text-[10px] font-mono text-ink-subtle truncate max-w-[120px]">
                  {selectedTask.title}
                </span>
              </div>

              {/* Reassignment Recommendations */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-ink-subtle block">
                  Candidate Reassignments:
                </span>
                {loadingSuggestions ? (
                  <div className="py-3 flex justify-center">
                    <Loader2 className="animate-spin text-ink-subtle" size={16} />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-[11px] text-ink-subtle py-1">No other developers available in team.</p>
                ) : (
                  <div className="space-y-1 max-h-[140px] overflow-y-auto">
                    {suggestions.map((c) => (
                      <button
                        key={c.employeeId}
                        disabled={submitting}
                        onClick={() => handleReassign(c.employeeId)}
                        className="w-full p-1.5 text-left rounded border border-hairline bg-surface hover:bg-[var(--tracker-surface-1)] flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-ink truncate">{c.name}</span>
                        <span className="text-[10px] font-bold text-emerald-600">Reassign</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reschedule Target Date */}
              <div className="border-t border-hairline-soft pt-2 space-y-1.5">
                <label className="text-[11px] font-bold text-ink-subtle block">Override Delivery Target Date:</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="p-1 text-xs bg-canvas border border-hairline rounded flex-1 text-ink"
                  />
                  <button
                    disabled={submitting || !overrideDate}
                    onClick={handleOverrideETA}
                    className="px-2.5 py-1 bg-[var(--module-accent)] text-white rounded text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Incident Sign-off / Resolution Receipt */}
          <div className="tracker-card p-4 sm:p-5 bg-surface space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-hairline-soft pb-2">
              Incident Governance & Sign-off
            </h2>

            {isResolved ? (
              <div className="p-3.5 rounded-tracker-md bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-center">
                <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink">Incident Formally Resolved</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Signed off by <strong className="text-ink">{resolverName}</strong>
                  </p>
                  <p className="text-[10px] text-ink-subtle mt-0.5">
                    {new Date(data.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {data.remarks && (
                  <p className="text-[11px] text-ink bg-surface/80 p-2 rounded border border-hairline text-left leading-relaxed mt-2">
                    <strong className="text-ink-subtle block text-[10px] uppercase">Notes:</strong>
                    {data.remarks}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-ink-muted leading-relaxed">
                  Sign off on this incident once workload reassignment or ETA adjustments have been applied.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-ink-subtle uppercase tracking-wider mb-1">
                    Mitigation Remarks
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2 text-xs text-ink bg-canvas border border-hairline rounded-tracker-md focus:ring-1 focus:ring-[var(--module-accent)] focus:border-[var(--module-accent)] outline-none"
                    rows="2"
                    placeholder="Enter mitigation notes or approval comments..."
                  />
                </div>

                <button
                  onClick={handleResolveEvent}
                  disabled={actionBusy}
                  className="tracker-btn-accent w-full py-2.5 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  <Check size={15} /> Sign-off & Mark Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
