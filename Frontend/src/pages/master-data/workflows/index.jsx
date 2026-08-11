import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { entityFormPath } from "../../../utils/formRoutes";
import { workflowsConfig } from "./config";

// ── Model display labels ──────────────────────────────────────
const MODEL_LABELS = {
  leaves: { label: "Leaves", color: "bg-blue-100 text-blue-700" },
  regularizations: { label: "Regularizations", color: "bg-violet-100 text-violet-700" },
  wfh_requests: { label: "WFH Requests", color: "bg-teal-100 text-teal-700" },
  comp_off_requests: { label: "CompOff Requests", color: "bg-amber-100 text-amber-700" },
  assets_allocations: { label: "Asset Allocations", color: "bg-emerald-100 text-emerald-700" },
  assets_incidents: { label: "Asset Incidents", color: "bg-red-100 text-red-700" },
  tasks: { label: "Tasks", color: "bg-indigo-100 text-indigo-700" },
  tickets: { label: "Tickets", color: "bg-rose-100 text-rose-700" },
  onboardings: { label: "Onboardings", color: "bg-sky-100 text-sky-700" },
  candidates: { label: "Candidates", color: "bg-cyan-100 text-cyan-700" },
  leads: { label: "Leads", color: "bg-emerald-100 text-emerald-700" },
  deals: { label: "Deals", color: "bg-green-100 text-green-700" }
};

const TRIGGER_LABELS = {
  Approval: { label: "Approval", color: "bg-blue-50 text-blue-600 border border-blue-200" },
  Escalation: { label: "Escalation", color: "bg-rose-50 text-rose-600 border border-rose-200" },
  Onboarding: { label: "Onboarding", color: "bg-sky-50 text-sky-600 border border-sky-200" }
};

const ACTOR_ICONS = {
  "Reporting Manager": "👤",
  "Department Manager": "🏢",
  "HR": "🛡️",
  "Specific Role": "🎭",
  "Specific User": "👋",
  "Candidate": "🎓"
};

const LEVEL_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];

const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
const fmtRelative = (d) => {
  if (!d) return null;
  const diff = Math.round((new Date(d) - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff > 0) return `In ${diff} day${diff === 1 ? "" : "s"}`;
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago`;
};

// ── Inline step pills ──────────────────────────────────────────
const StepPills = ({ steps = [] }) => {
  if (!steps.length) return <span className="text-xs text-ink-muted">No steps</span>;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
          style={{ background: `${LEVEL_COLORS[i % LEVEL_COLORS.length]}18`, color: LEVEL_COLORS[i % LEVEL_COLORS.length], border: `1px solid ${LEVEL_COLORS[i % LEVEL_COLORS.length]}35` }}>
          <span className="font-bold">S{step.stepOrder}</span>
          <span className="opacity-70">·</span>
          <span>{ACTOR_ICONS[step.actorType] || "→"} {step.actorType}</span>
          <span className="opacity-60 ml-0.5">({step.timeoutHours}h)</span>
        </div>
      ))}
    </div>
  );
};

// ── Department chip ─────────────────────────────────────────────
const DepartmentChip = ({ departmentId }) => {
  if (!departmentId) return <span className="text-xs text-ink-muted">All Departments</span>;
  return (
    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
      {departmentId?.name || departmentId?.title || "Dept"}
    </span>
  );
};

// ── Detail slide-over ────────────────────────────────────────────
const DetailSheet = ({ workflow, onClose, onEdit, onDelete }) => {
  if (!workflow) return null;
  const modelMeta = MODEL_LABELS[workflow.modelName] || { label: workflow.modelName, color: "bg-gray-100 text-gray-600" };
  const triggerMeta = TRIGGER_LABELS[workflow.triggerType] || { label: workflow.triggerType, color: "bg-gray-100 text-gray-650" };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative h-full w-full max-w-lg flex flex-col shadow-2xl"
        style={{ background: "var(--tracker-surface,#fff)", borderLeft: "1px solid var(--tracker-border,#e5e7eb)", animation: "slideInRight .22s ease-out" }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between gap-4"
          style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>Workflow Details</p>
            <h2 className="text-lg font-bold mt-1" style={{ color: "var(--tracker-ink)" }}>{workflow.name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${modelMeta.color}`}>{modelMeta.label}</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${triggerMeta.color}`}>{triggerMeta.label}</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${workflow.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {workflow.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Department conditions */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Execution Scope</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--tracker-surface-1,#f9fafb)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-ink-muted">Department Scope:</span>
                <DepartmentChip departmentId={workflow.conditions?.departmentId || workflow.departmentId} />
              </div>
              {workflow.conditions?.priorityLevel && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-ink-muted">Priority Rule:</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-bold border border-rose-100">
                    {workflow.conditions.priorityLevel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Steps timeline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Sequence of Steps</p>
            {(!workflow.steps || workflow.steps.length === 0) ? (
              <p className="text-xs text-ink-muted">No steps configured.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-8 bottom-2 w-0.5" style={{ background: "var(--tracker-border,#e5e7eb)" }} />

                <div className="space-y-4">
                  {workflow.steps.map((step, i) => {
                    const color = LEVEL_COLORS[i % LEVEL_COLORS.length];
                    return (
                      <div key={i} className="flex items-start gap-4 relative">
                        {/* Step order */}
                        <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 z-10"
                          style={{ background: color }}>
                          S{step.stepOrder}
                        </span>
                        <div className="flex-1 rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f9fafb)", border: `1px solid ${color}35` }}>
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{ACTOR_ICONS[step.actorType] || "→"}</span>
                              <span className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>{step.actorType}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
                              ⏱ {step.timeoutHours}h timeout
                            </span>
                          </div>
                          {step.actions && step.actions.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-2">
                              {step.actions.map(act => (
                                <span key={act} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-650">
                                  {act}
                                </span>
                              ))}
                            </div>
                          )}
                          {step.updateStatusTo && (
                            <p className="text-xs text-ink-muted mt-2">
                              🔄 Update status to: <strong className="text-ink">{step.updateStatusTo}</strong>
                            </p>
                          )}
                          {step.requiredDocumentType && (
                            <p className="text-xs text-ink-muted mt-1">
                              📄 Requires Document: <strong className="text-ink">{step.requiredDocumentType}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Metadata — who created it, when, last updated */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Record Info</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--tracker-border,#e5e7eb)" }}>

              {/* Created by */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ background: "var(--tracker-surface-1,#f1f5f9)" }}>
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tracker-ink-muted)" }}>Created By</p>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--tracker-ink)" }}>
                    {workflow.createdBy?.basicInfo
                      ? `${workflow.createdBy.basicInfo.firstName || ""} ${workflow.createdBy.basicInfo.lastName || ""}`.trim()
                      : (workflow.createdBy?.name ||
                        workflow.createdBy?.fullName ||
                        workflow.createdBy?.email ||
                        "System")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tracker-ink-muted)" }}>Created On</p>
                  <p className="text-xs font-medium" style={{ color: "var(--tracker-ink)" }}>{fmtFull(workflow.createdAt)}</p>
                  <p className="text-[10px]" style={{ color: "var(--tracker-ink-muted)" }}>{fmtRelative(workflow.createdAt)}</p>
                </div>
              </div>

              {/* Last updated */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ background: "var(--tracker-surface-1,#f1f5f9)" }}>
                  ✏️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tracker-ink-muted)" }}>Last Updated</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--tracker-ink)" }}>
                    {workflow.updatedAt ? fmtFull(workflow.updatedAt) : "—"}
                  </p>
                </div>
                <p className="text-[10px] shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
                  {fmtRelative(workflow.updatedAt)}
                </p>
              </div>

            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <button type="button" onClick={() => { onDelete(workflow); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button type="button" onClick={() => onEdit(workflow)}
            className="tracker-btn-accent flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
};

// ── Workflow card ──────────────────────────────────────────────────────────
const WorkflowCard = ({ workflow, onClick }) => {
  const modelMeta = MODEL_LABELS[workflow.modelName] || { label: workflow.modelName, color: "bg-gray-100 text-gray-600" };
  const triggerMeta = TRIGGER_LABELS[workflow.triggerType] || { label: workflow.triggerType, color: "bg-gray-100 text-gray-600" };
  const stepCount = workflow.steps?.length ?? 0;
  const dept = workflow.conditions?.departmentId || workflow.departmentId;

  return (
    <div
      onClick={() => onClick(workflow)}
      className="group relative flex flex-col rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
      style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,var(--module-accent,#6366f1),#a78bfa)" }} />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${triggerMeta.color}`}>
            {triggerMeta.label}
          </span>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${modelMeta.color}`}>
            {modelMeta.label}
          </span>
          <span className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${workflow.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
            }`}>
            {workflow.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold leading-snug" style={{ color: "var(--tracker-ink)" }}>
          {workflow.name}
        </h3>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2.5 mt-1">
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "var(--tracker-surface-1,#f8fafc)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--module-accent,#6366f1)" }}>{stepCount}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--tracker-ink-muted)" }}>Steps</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "var(--tracker-surface-1,#f8fafc)" }}>
            <p className="text-sm font-bold truncate" style={{ color: "var(--tracker-ink)" }}>
              {dept?.name || dept?.title || "All"}
            </p>
            <p className="text-[10px] font-medium" style={{ color: "var(--tracker-ink-muted)" }}>Dept Scope</p>
          </div>
        </div>

        {/* Step pills preview */}
        <div className="pt-3" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <StepPills steps={workflow.steps} />
        </div>
      </div>
    </div>
  );
};

// ── Skeleton card ───────────────────────────────────────────────────────────
const SkeletonWorkflowCard = () => (
  <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
    <div className="h-1 bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-2/3" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    </div>
  </div>
);

// ── Main page ───────────────────────────────────────────────────────────────
const WorkflowsIndex = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const basePath = workflowsConfig.basePath;

  const fetchWorkflows = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/workflows", {
        limit: 500,
        populate: [
          { path: "conditions.departmentId", select: "name" },
          { path: "steps.specificUserId", select: "basicInfo" },
          { path: "steps.specificRoleId", select: "name" },
          { path: "createdBy", select: "basicInfo" }
        ]
      });
      setWorkflows(res.data?.data || []);
    } catch (err) { console.error("fetchWorkflows:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleDelete = async (workflow) => {
    if (!window.confirm(`Delete this workflow? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/workflows/${workflow._id}`);
      fetchWorkflows();
    } catch (err) { console.error("handleDelete:", err); }
  };

  const TRIGGER_FILTERS = ["All", ...Object.keys(TRIGGER_LABELS)];

  const filtered = workflows
    .filter(w => typeFilter === "All" || w.triggerType === typeFilter)
    .filter(w => !query.trim() || [
      w.name, w.modelName, MODEL_LABELS[w.modelName]?.label, w.triggerType
    ].some(v => v && v.toLowerCase().includes(query.toLowerCase())));

  const stats = [
    { label: "Total", value: workflows.length, color: "" },
    { label: "Active", value: workflows.filter(w => w.isActive).length, color: "text-emerald-600" },
    { label: "Inactive", value: workflows.filter(w => !w.isActive).length, color: "text-red-500" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--tracker-canvas-muted,#f5f6fa)" }}>

      {/* Header */}
      <div className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>Master Data</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>Workflows</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>Configure approvals, escalations, and onboarding pipelines</p>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`} style={!s.color ? { color: "var(--tracker-ink)" } : {}}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>{s.label}</p>
            </div>
          ))}
          <button type="button" onClick={() => navigate(entityFormPath(basePath))}
            className="tracker-btn-accent px-5 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Workflow
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}>
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--tracker-ink-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search workflows…" className="lmx-input pl-9 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TRIGGER_FILTERS.map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${typeFilter === f
                ? "bg-[var(--module-accent,#6366f1)] text-white border-[var(--module-accent,#6366f1)]"
                : "border-[var(--tracker-border,#e5e7eb)] hover:border-[var(--module-accent,#6366f1)]"
                }`}
              style={typeFilter !== f ? { color: "var(--tracker-ink-muted)" } : {}}>
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs ml-auto shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
          {filtered.length} of {workflows.length}
        </p>
      </div>

      {/* Card grid */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonWorkflowCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>⚙️</div>
            <p className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>
              {query || typeFilter !== "All" ? `No results for "${query || typeFilter}"` : "No workflows yet"}
            </p>
            <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>
              {!query && typeFilter === "All" && "Add your first unified workflow."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(wf => (
              <WorkflowCard key={wf._id} workflow={wf} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          workflow={selected}
          onClose={() => setSelected(null)}
          onEdit={(wf) => { setSelected(null); navigate(entityFormPath(basePath, wf._id)); }}
          onDelete={(wf) => { handleDelete(wf); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default WorkflowsIndex;
