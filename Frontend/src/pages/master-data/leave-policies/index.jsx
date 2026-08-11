import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import { entityFormPath } from "../../../utils/formRoutes";
import { leave_policiesConfig } from "./config";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_META = {
  Active: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Draft: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  Scheduled: { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  Expired: { color: "bg-red-100 text-red-600 border-red-200", dot: "bg-red-400" },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

// Returns a human-readable relative string for a future or past date
const fmtRelative = (d) => {
  if (!d) return null;
  const diff = Math.round((new Date(d) - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff > 0) return `In ${diff} day${diff === 1 ? "" : "s"}`;
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago`;
};

// ── Leave quota bar ─────────────────────────────────────────────────────────
const QuotaBar = ({ label, perMonth, perYear, carryForward }) => (
  <div className="py-2.5 border-b last:border-0" style={{ borderColor: "var(--tracker-border,#e5e7eb)" }}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-semibold" style={{ color: "var(--tracker-ink)" }}>{label}</span>
      {carryForward && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
          Carry Forward
        </span>
      )}
    </div>
    <div className="flex items-center gap-3">
      {/* Per Month */}
      <div className="flex-1">
        <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--tracker-ink-muted)" }}>
          <span>Per Month</span><span className="font-bold">{perMonth}d</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tracker-surface-1,#f1f5f9)" }}>
          <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min((perMonth / 5) * 100, 100)}%` }} />
        </div>
      </div>
      {/* Per Year */}
      <div className="flex-1">
        <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--tracker-ink-muted)" }}>
          <span>Per Year</span><span className="font-bold">{perYear}d</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tracker-surface-1,#f1f5f9)" }}>
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min((perYear / 30) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  </div>
);

// ── Applicability chips ─────────────────────────────────────────────────────
const ChipRow = ({ items = [], emptyLabel = "All", colorClass = "bg-slate-100 text-slate-600" }) => {
  const labels = items.map(i => i?.name || i?.title || i?.label || "—");
  if (!labels.length) return <span className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100">{emptyLabel}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.slice(0, 3).map((l, i) => (
        <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>{l}</span>
      ))}
      {labels.length > 3 && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          +{labels.length - 3}
        </span>
      )}
    </div>
  );
};

// ── Policy card ─────────────────────────────────────────────────────────────
const PolicyCard = ({ policy, onClick }) => {
  const sm = STATUS_META[policy.status] || STATUS_META.Draft;
  const leaveCount = policy.leaves?.length ?? 0;
  const totalDays = policy.leaves?.reduce((s, l) => s + (l.maxDaysPerYear || 0), 0) ?? 0;

  return (
    <div
      onClick={() => onClick(policy)}
      className="group relative flex flex-col rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
      style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}
    >
      {/* Top accent strip */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,var(--module-accent,#6366f1),#a78bfa)" }} />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold leading-snug truncate" style={{ color: "var(--tracker-ink)" }}>
              {policy.name}
            </h3>
            {policy.description && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--tracker-ink-muted)" }}>
                {policy.description}
              </p>
            )}
          </div>
          <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
            {policy.status || "Draft"}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "var(--tracker-surface-1,#f8fafc)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--module-accent,#6366f1)" }}>{leaveCount}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>Leave Types</p>
          </div>
          <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "var(--tracker-surface-1,#f8fafc)" }}>
            <p className="text-xl font-bold" style={{ color: "#10b981" }}>{totalDays}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>Total Days/Year</p>
          </div>
        </div>

        {/* Applicability */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--tracker-ink-muted)" }}>Applicable To</p>
          <div className="space-y-1.5">
            {policy.applicableRoles?.length > 0 && (
              <ChipRow items={policy.applicableRoles} colorClass="bg-violet-50 text-violet-600 border-violet-100" />
            )}
            {policy.applicableDepartments?.length > 0 && (
              <ChipRow items={policy.applicableDepartments} colorClass="bg-blue-50 text-blue-600 border-blue-100" />
            )}
            {!policy.applicableRoles?.length && !policy.applicableDepartments?.length && (
              <ChipRow items={[]} emptyLabel="All Employees" />
            )}
          </div>
        </div>

        {/* Validity */}
        <div className="flex items-center justify-between text-[10px] pt-3 mt-auto"
          style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)", color: "var(--tracker-ink-muted)" }}>
          <span>From <strong className="text-ink">{fmt(policy.effectiveFrom)}</strong></span>
          <span>{policy.effectiveTo ? <>To <strong className="text-ink">{fmt(policy.effectiveTo)}</strong></> : "No expiry"}</span>
        </div>
      </div>
    </div>
  );
};

// ── Detail slide-over ───────────────────────────────────────────────────────
const DetailSheet = ({ policy, onClose, onEdit, onDelete }) => {
  if (!policy) return null;
  const sm = STATUS_META[policy.status] || STATUS_META.Draft;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative h-full w-full max-w-xl flex flex-col shadow-2xl"
        style={{ background: "var(--tracker-surface,#fff)", borderLeft: "1px solid var(--tracker-border,#e5e7eb)", animation: "slideInRight .22s ease-out" }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4"
          style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>
              Leave Policy
            </p>
            <h2 className="text-xl font-bold mt-1 leading-tight" style={{ color: "var(--tracker-ink)" }}>{policy.name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                {policy.status}
              </span>
              {policy.version && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  v{policy.version}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0 text-lg"
            style={{ color: "var(--tracker-ink-muted)" }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Description */}
          {policy.description && (
            <div className="rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f8fafc)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
              <p className="text-sm" style={{ color: "var(--tracker-ink-muted)" }}>{policy.description}</p>
            </div>
          )}

          {/* Validity */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Validity Period</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f8fafc)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tracker-ink-muted)" }}>Effective From</p>
                <p className="text-sm font-bold" style={{ color: "var(--tracker-ink)" }}>{fmt(policy.effectiveFrom)}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--tracker-surface-1,#f8fafc)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--tracker-ink-muted)" }}>Effective To</p>
                <p className="text-sm font-bold" style={{ color: "var(--tracker-ink)" }}>{fmt(policy.effectiveTo) || "No Expiry"}</p>
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>Applicability</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--tracker-surface-1,#f8fafc)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--tracker-ink-muted)" }}>Roles</p>
                <ChipRow items={policy.applicableRoles || []} emptyLabel="All Roles" colorClass="bg-violet-50 text-violet-600 border-violet-100" />
              </div>
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--tracker-ink-muted)" }}>Departments</p>
                <ChipRow items={policy.applicableDepartments || []} emptyLabel="All Departments" colorClass="bg-blue-50 text-blue-600 border-blue-100" />
              </div>
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "var(--tracker-ink-muted)" }}>Designations</p>
                <ChipRow items={policy.applicableDesignations || []} emptyLabel="All Designations" colorClass="bg-teal-50 text-teal-600 border-teal-100" />
              </div>
            </div>
          </div>

          {/* Leave Quotas */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--tracker-ink-muted)" }}>
              Leave Quotas ({policy.leaves?.length ?? 0} types)
            </p>
            <div className="rounded-xl px-4" style={{ background: "var(--tracker-surface-1,#f8fafc)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
              {!policy.leaves?.length ? (
                <p className="py-4 text-xs text-center" style={{ color: "var(--tracker-ink-muted)" }}>No leave types configured</p>
              ) : (
                policy.leaves.map((l, i) => (
                  <QuotaBar
                    key={i}
                    label={l.leaveType?.name || l.leaveType?.title || `Leave ${i + 1}`}
                    perMonth={l.maxDaysPerMonth ?? 0}
                    perYear={l.maxDaysPerYear ?? 0}
                    carryForward={!!l.carryForward}
                  />
                ))
              )}
            </div>
          </div>

          {/* Scheduled activation banner */}
          {policy.status === "Scheduled" && policy.effectiveFrom && (() => {
            const daysUntil = Math.round((new Date(policy.effectiveFrom) - Date.now()) / (1000 * 60 * 60 * 24));
            const isPast = daysUntil < 0;
            return (
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: isPast ? "#fef2f2" : "#eff6ff", border: isPast ? "1px solid #fecaca" : "1px solid #bfdbfe" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: isPast ? "#fee2e2" : "#dbeafe" }}>
                  {isPast ? "⏰" : "📅"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: isPast ? "#b91c1c" : "#1d4ed8" }}>
                    {isPast ? "Activation overdue" : "Scheduled to activate"}
                  </p>
                  <p className="text-sm font-bold" style={{ color: isPast ? "#dc2626" : "#1e40af" }}>
                    {fmt(policy.effectiveFrom)}
                    <span className="ml-2 text-xs font-medium opacity-80">
                      ({fmtRelative(policy.effectiveFrom)})
                    </span>
                  </p>
                  {policy.effectiveTo && (
                    <p className="text-xs mt-1" style={{ color: isPast ? "#ef4444" : "#3b82f6" }}>
                      Expires: {fmt(policy.effectiveTo)}
                    </p>
                  )}
                  {!isPast && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] mb-1" style={{ color: isPast ? "#b91c1c" : "#1d4ed8", opacity: 0.7 }}>
                        <span>Now</span>
                        <span>Activates in {daysUntil}d</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#bfdbfe" }}>
                        <div className="h-full rounded-full" style={{
                          background: "#3b82f6",
                          width: `${Math.max(4, 100 - Math.min((daysUntil / 30) * 100, 96))}%`
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
                    {policy.createdBy?.basicInfo
                      ? `${policy.createdBy.basicInfo.firstName || ""} ${policy.createdBy.basicInfo.lastName || ""}`.trim()
                      : (policy.createdBy?.name ||
                        policy.createdBy?.fullName ||
                        policy.createdBy?.email ||
                        "System")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tracker-ink-muted)" }}>Created On</p>
                  <p className="text-xs font-medium" style={{ color: "var(--tracker-ink)" }}>{fmtFull(policy.createdAt)}</p>
                  <p className="text-[10px]" style={{ color: "var(--tracker-ink-muted)" }}>{fmtRelative(policy.createdAt)}</p>
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
                    {policy.updatedAt ? fmtFull(policy.updatedAt) : "—"}
                  </p>
                </div>
                <p className="text-[10px] shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
                  {fmtRelative(policy.updatedAt)}
                </p>
              </div>

            </div>
          </div>

        </div>{/* end body scroll */}

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <button type="button" onClick={() => { onDelete(policy); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button type="button" onClick={() => onEdit(policy)} className="tracker-btn-accent flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Policy
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
};

// ── Skeleton card ───────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>
    <div className="h-1 bg-slate-200" />
    <div className="p-5 space-y-4">
      <div className="h-4 bg-slate-100 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-slate-100 rounded-xl" />
        <div className="h-14 bg-slate-100 rounded-xl" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
      </div>
    </div>
  </div>
);

// ── Main page ───────────────────────────────────────────────────────────────
const leave_policiesIndex = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const basePath = leave_policiesConfig.basePath;

  const fetchPolicies = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/leavepolicy", {
        limit: 200,
        populate: [
          { path: "applicableRoles", select: "name" },
          { path: "applicableDepartments", select: "name" },
          { path: "applicableDesignations", select: "title" },
          { path: "leaves.leaveType", select: "name" },
          { path: "createdBy", select: "basicInfo" }
        ]
      });
      setPolicies(res.data?.data || []);
    } catch (err) {
      console.error("fetchPolicies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleDelete = async (policy) => {
    if (!window.confirm(`Delete "${policy.name}"? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/leavepolicy/${policy._id}`);
      toast.success("Policy deleted");
      fetchPolicies();
    } catch { toast.error("Delete failed"); }
  };

  const STATUS_FILTERS = ["All", "Active", "Draft", "Scheduled", "Expired"];
  const filtered = policies
    .filter(p => statusFilter === "All" || p.status === statusFilter)
    .filter(p => !query.trim() || [p.name, p.description, p.status].some(v => v?.toLowerCase().includes(query.toLowerCase())));

  const stats = [
    { label: "Total", value: policies.length, color: "text-ink" },
    { label: "Active", value: policies.filter(p => p.status === "Active").length, color: "text-emerald-600" },
    { label: "Draft", value: policies.filter(p => p.status === "Draft").length, color: "text-amber-500" },
    { label: "Expired", value: policies.filter(p => p.status === "Expired").length, color: "text-red-500" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--tracker-canvas-muted,#f5f6fa)" }}>

      {/* Header */}
      <div className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#6366f1)" }}>Master Data</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>Leave Policies</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>
            Define leave quotas, carry-forward rules, and applicability per role or department
          </p>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>{s.label}</p>
            </div>
          ))}
          <button type="button" onClick={() => navigate(entityFormPath(basePath))}
            className="tracker-btn-accent px-5 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Policy
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}>
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--tracker-ink-muted)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search policies…" className="lmx-input pl-9 py-2 text-sm" />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${statusFilter === f
                  ? "bg-[var(--module-accent,#6366f1)] text-white border-[var(--module-accent,#6366f1)]"
                  : "border-[var(--tracker-border,#e5e7eb)] hover:border-[var(--module-accent,#6366f1)]"
                }`}
              style={statusFilter !== f ? { color: "var(--tracker-ink-muted)" } : {}}>
              {f}
            </button>
          ))}
        </div>

        <p className="text-xs ml-auto shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
          {filtered.length} of {policies.length}
        </p>
      </div>

      {/* Card grid */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}>📋</div>
            <p className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>
              {query || statusFilter !== "All" ? "No matching policies" : "No leave policies yet"}
            </p>
            <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>
              {!query && statusFilter === "All" && "Create your first leave policy to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <PolicyCard key={p._id} policy={p} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailSheet
          policy={selected}
          onClose={() => setSelected(null)}
          onEdit={(p) => { setSelected(null); navigate(entityFormPath(basePath, p._id)); }}
          onDelete={(p) => { handleDelete(p); setSelected(null); }}
        />
      )}
    </div>
  );
};

export default leave_policiesIndex;
