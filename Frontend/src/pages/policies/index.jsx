import { useState, useEffect } from "react";
import { useAuth } from "../../context/authProvider";
import { useUserRole } from "../../hooks/useUserRole";
import useGenericAPI from "../../components/useGenericAPI";
import {
  FileText, CheckCircle, ShieldAlert, Calendar,
  ExternalLink, ArrowRight, Settings, ChevronRight,
  BookOpen, Tag, Clock, Users, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "All Policies",
  "Leave Policy",
  "Code of Conduct",
  "Attendance",
  "Compensation",
  "Benefits",
  "Performance",
  "General"
];

// Category color mapping for visual identity per category
const CATEGORY_COLORS = {
  "Leave Policy":     { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40" },
  "Code of Conduct":  { dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40" },
  "Attendance":       { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40" },
  "Compensation":     { dot: "bg-emerald-500",badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40" },
  "Benefits":         { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/40" },
  "Performance":      { dot: "bg-rose-500",   badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40" },
  "General":          { dot: "bg-slate-400",  badge: "bg-slate-50 text-slate-600 dark:bg-slate-800/30 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/40" },
};

function getCategoryStyle(cat) {
  return CATEGORY_COLORS[cat] || { dot: "bg-slate-400", badge: "bg-slate-50 text-slate-600 border-slate-200/60" };
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { read, update, loading } = useGenericAPI();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All Policies");
  const [acknowledging, setAcknowledging] = useState(false);

  // Admin roles allowed to configure/manage policies
  const isAdmin = ["hr admin", "admin", "developer"].includes(userRole?.toLowerCase());

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await read("hrpolicies", {
        filter: { status: "Active", metaStatus: "active" }
      });
      const data = res?.data || [];
      setPolicies(data);
      if (data.length > 0) {
        setSelectedPolicy(data[0]);
      }
    } catch (err) {
      console.error("Failed to load policies", err);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedPolicy || !user?.id) return;
    setAcknowledging(true);
    try {
      const alreadyAcked = selectedPolicy.acknowledgments?.some(
        ack => (ack.employeeId?._id || ack.employeeId) === user.id
      );
      if (alreadyAcked) return;

      const newAck = { employeeId: user.id, acknowledgedAt: new Date() };
      const updatedAcks = [...(selectedPolicy.acknowledgments || []), newAck];

      await update("hrpolicies", selectedPolicy._id, {
        acknowledgments: updatedAcks
      }, "Policy successfully acknowledged!");

      const updatedPolicy = { ...selectedPolicy, acknowledgments: updatedAcks };
      setSelectedPolicy(updatedPolicy);
      setPolicies(prev => prev.map(p => p._id === selectedPolicy._id ? updatedPolicy : p));
    } catch (err) {
      console.error("Failed to acknowledge policy", err);
    } finally {
      setAcknowledging(false);
    }
  };

  const filteredPolicies = selectedCategory === "All Policies"
    ? policies
    : policies.filter(p => p.category === selectedCategory);

  const getAckDetails = (policy) => {
    if (!policy || !user?.id) return { acknowledged: false };
    const record = policy.acknowledgments?.find(
      ack => (ack.employeeId?._id || ack.employeeId) === user.id
    );
    return record
      ? { acknowledged: true, date: new Date(record.acknowledgedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
      : { acknowledged: false };
  };

  const currentAck = getAckDetails(selectedPolicy);

  // Count pending acknowledgments for admin summary
  const pendingAckCount = policies.filter(p =>
    p.requiresAcknowledgment && !getAckDetails(p).acknowledged
  ).length;

  return (
    <div className="lmx-content py-6" data-module="hr">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="lmx-page-eyebrow">Company Resources</span>
          <h1 className="text-2xl font-bold text-ink tracking-tight mt-1">HR & Corporate Policies</h1>
          <p className="text-sm text-ink-muted mt-1">Review official guidelines and acknowledge mandatory policy updates.</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingAckCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-tracker-md">
              <AlertTriangle size={12} />
              {pendingAckCount} pending acknowledgment{pendingAckCount > 1 ? "s" : ""}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate("/master-data/hr-policies")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-1 border border-hairline hover:border-ink-subtle text-ink font-semibold rounded-tracker-md text-sm transition-all cursor-pointer shadow-sm"
            >
              <Settings size={16} /> Manage Policies
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── Left Panel: Category Filter + Policy List ─────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Category Filter */}
          <div className="tracker-card-plain bg-surface overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">Browse By Category</h3>
            </div>
            <div className="pb-2">
              {CATEGORIES.map(cat => {
                const count = cat === "All Policies"
                  ? policies.length
                  : policies.filter(p => p.category === cat).length;
                const isActive = selectedCategory === cat;
                const style = getCategoryStyle(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const filtered = cat === "All Policies" ? policies : policies.filter(p => p.category === cat);
                      if (filtered.length > 0) setSelectedPolicy(filtered[0]);
                      else setSelectedPolicy(null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all text-left cursor-pointer group ${
                      isActive
                        ? "bg-[var(--module-accent)]/8 text-ink font-semibold"
                        : "text-ink-muted hover:bg-canvas-muted hover:text-ink font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {cat !== "All Policies" && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot} ${isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`} />
                      )}
                      {cat === "All Policies" && (
                        <BookOpen size={13} className={`flex-shrink-0 ${isActive ? "text-[var(--module-accent)]" : "text-ink-muted"}`} />
                      )}
                      <span className="text-[13px]">{cat}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive
                          ? "bg-[var(--module-accent)] text-white"
                          : "bg-canvas text-ink-subtle"
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Policy List */}
          <div className="tracker-card-plain bg-surface overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-hairline-soft">
              <h3 className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">
                {selectedCategory} <span className="font-normal text-ink-muted">({filteredPolicies.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="space-y-0 py-2">
                {[1,2,3].map(i => (
                  <div key={i} className="px-4 py-3 border-b border-hairline-soft last:border-0">
                    <div className="h-3.5 bg-canvas animate-pulse rounded w-3/4 mb-2" />
                    <div className="h-2.5 bg-canvas animate-pulse rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredPolicies.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-8 italic px-4">No documents in this category.</p>
            ) : (
              <div className="divide-y divide-hairline-soft">
                {filteredPolicies.map(p => {
                  const isSelected = selectedPolicy?._id === p._id;
                  const ack = getAckDetails(p);
                  const catStyle = getCategoryStyle(p.category);

                  return (
                    <button
                      key={p._id}
                      onClick={() => setSelectedPolicy(p)}
                      className={`w-full text-left px-4 py-3.5 transition-all flex items-start justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? "bg-[var(--module-accent)]/8"
                          : "hover:bg-canvas-muted"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Left accent bar */}
                        <span className={`mt-1 w-0.5 h-full min-h-[36px] self-stretch rounded-full flex-shrink-0 ${
                          isSelected ? "bg-[var(--module-accent)]" : catStyle.dot + " opacity-0 group-hover:opacity-40"
                        }`} />

                        <div className="min-w-0">
                          <p className={`text-[13px] leading-snug truncate ${isSelected ? "font-semibold text-ink" : "font-medium text-ink-muted group-hover:text-ink"}`}>
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-ink-subtle">v{p.version}</span>
                            {p.requiresAcknowledgment && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                                ack.acknowledged
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40"
                                  : "bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/40"
                              }`}>
                                {ack.acknowledged ? "✓ Acked" : "! Required"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className={`flex-shrink-0 mt-0.5 transition-colors ${isSelected ? "text-[var(--module-accent)]" : "text-ink-muted opacity-0 group-hover:opacity-60"}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Document Reader ──────────────────────────────────── */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="tracker-card p-6 bg-surface space-y-6">
              <div className="h-6 bg-canvas animate-pulse rounded w-1/3" />
              <div className="h-24 bg-canvas animate-pulse rounded w-full" />
            </div>
          ) : !selectedPolicy ? (
            <div className="tracker-card-plain p-16 bg-surface flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-canvas rounded-full flex items-center justify-center text-ink-muted mb-4">
                <FileText size={32} />
              </div>
              <h2 className="text-lg font-bold text-ink">No Policy Selected</h2>
              <p className="text-sm text-ink-muted mt-1 max-w-sm">Select a category or policy document from the list to view its contents.</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Document Header ─────────────────────────────────────────── */}
              <div className="tracker-card bg-surface overflow-hidden">
                {/* Coloured accent top bar */}
                <div className={`h-0.5 w-full ${getCategoryStyle(selectedPolicy.category).dot}`} />

                <div className="p-6">
                  {/* Top metadata row */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-tracker-md border ${getCategoryStyle(selectedPolicy.category).badge}`}>
                      <Tag size={10} />
                      {selectedPolicy.category}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted px-2 py-1 bg-canvas rounded-tracker-md border border-hairline">
                      <BookOpen size={10} />
                      Version {selectedPolicy.version}
                    </span>
                    {selectedPolicy.effectiveDate && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted px-2 py-1 bg-canvas rounded-tracker-md border border-hairline">
                        <Calendar size={10} />
                        Effective {new Date(selectedPolicy.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {selectedPolicy.requiresAcknowledgment && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 px-2 py-1 bg-amber-50 dark:bg-amber-950/20 rounded-tracker-md border border-amber-200/60 dark:border-amber-800/40">
                        <ShieldAlert size={10} />
                        Acknowledgment Required
                      </span>
                    )}
                  </div>

                  {/* Policy title */}
                  <h2 className="text-xl font-bold text-ink tracking-tight">{selectedPolicy.title}</h2>

                  {/* Sub-metadata strip */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-hairline-soft">
                    {selectedPolicy.applicableDepartments?.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Users size={12} />
                        {selectedPolicy.applicableDepartments.join(", ")}
                      </span>
                    )}
                    {selectedPolicy.createdAt && (
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Clock size={12} />
                        Added {new Date(selectedPolicy.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {selectedPolicy.acknowledgments?.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <CheckCircle size={12} className="text-tracker-success" />
                        {selectedPolicy.acknowledgments.length} acknowledged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Document Content ─────────────────────────────────────────── */}
              <div className="tracker-card bg-surface">
                <div className="px-6 py-4 border-b border-hairline-soft flex items-center gap-2">
                  <FileText size={14} className="text-ink-muted" />
                  <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider">Policy Content</h3>
                </div>
                <div className="p-6">
                  {selectedPolicy.content ? (
                    <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap select-text">
                      {selectedPolicy.content.split('\n').map((line, idx) => {
                        // Detect heading-like lines (all caps or ends with colon)
                        const isHeading = line.trim().length > 0 && (
                          /^[A-Z\s\d&:–-]{6,}$/.test(line.trim()) ||
                          line.trim().endsWith(':')
                        );
                        if (!line.trim()) return <div key={idx} className="h-3" />;
                        if (isHeading) return (
                          <p key={idx} className="text-xs font-bold text-ink-subtle uppercase tracking-wider mt-5 mb-2 first:mt-0">
                            {line}
                          </p>
                        );
                        return (
                          <p key={idx} className="text-sm text-ink leading-relaxed mb-1.5">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted italic text-center py-8">No content available for this policy.</p>
                  )}
                </div>

                {/* Attachments */}
                {selectedPolicy.attachments?.length > 0 && (
                  <div className="px-6 pb-6 pt-0 border-t border-hairline-soft mt-2">
                    <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider mb-3 mt-4">Attachments</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPolicy.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-canvas hover:bg-canvas-muted border border-hairline hover:border-ink-subtle rounded-tracker-md text-xs font-semibold text-ink transition-all shadow-xs"
                        >
                          <FileText size={13} className="text-indigo-500" />
                          <span>{file.filename || "Attachment"}</span>
                          <ExternalLink size={11} className="text-ink-muted" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Acknowledgment Widget ────────────────────────────────────── */}
              {selectedPolicy.requiresAcknowledgment && (
                <div className={`tracker-card bg-surface overflow-hidden ${
                  currentAck.acknowledged
                    ? "border-l-4 border-l-emerald-500"
                    : "border-l-4 border-l-amber-500"
                }`}>
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {currentAck.acknowledged ? (
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">Policy Acknowledged</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            You read and acknowledged this policy on <span className="font-semibold text-ink">{currentAck.date}</span>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink">Acknowledgment Required</p>
                            <p className="text-xs text-ink-muted mt-0.5 max-w-lg">
                              By clicking below, you confirm that you have fully read, understood, and agree to abide by this policy.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleAcknowledge}
                          disabled={acknowledging}
                          className="tracker-btn-accent min-h-[40px] px-5 flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-sm hover:brightness-105 transition-all disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
                        >
                          {acknowledging ? "Saving..." : "Acknowledge Policy"}
                          <ArrowRight size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Admin: Acknowledgment Trail ──────────────────────────────── */}
              {isAdmin && selectedPolicy.requiresAcknowledgment && selectedPolicy.acknowledgments?.length > 0 && (
                <div className="tracker-card bg-surface">
                  <div className="px-6 py-4 border-b border-hairline-soft flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-ink-muted" />
                      <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider">Acknowledgment Trail</h3>
                    </div>
                    <span className="text-xs font-semibold text-ink-muted">{selectedPolicy.acknowledgments.length} records</span>
                  </div>
                  <div className="divide-y divide-hairline-soft max-h-52 overflow-y-auto">
                    {selectedPolicy.acknowledgments.map((ack, idx) => (
                      <div key={idx} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm text-ink font-medium">
                            {ack.employeeId?.basicInfo
                              ? `${ack.employeeId.basicInfo.firstName || ""} ${ack.employeeId.basicInfo.lastName || ""}`.trim()
                              : `Employee ${idx + 1}`}
                          </span>
                        </div>
                        <span className="text-xs text-ink-muted">
                          {new Date(ack.acknowledgedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
