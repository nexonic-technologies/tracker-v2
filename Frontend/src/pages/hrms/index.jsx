import { useEffect, useState, useMemo } from "react";
import useGenericAPI from "../../components/useGenericAPI";
import PageLoader from "../../components/Common/PageLoader";
import StatCard from "../../components/Common/StatCard";
import {
  Users, Briefcase, UserCheck, Play, CheckCircle,
  Clock, AlertCircle, Plus, RefreshCw, Kanban,
  ListTodo, UserCheck2, ClipboardList, Send, Calendar,
  ArrowRight, Search, CheckCircle2, ChevronRight, X,
  ShieldCheck, FileText, AlertTriangle, XCircle
} from "lucide-react";
import toast from "react-hot-toast";

const CANDIDATE_STAGES = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];

const STAGE_META = {
  Applied: { bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800", dot: "bg-blue-500" },
  Screening: { bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-800", dot: "bg-indigo-500" },
  Interview: { bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  Offered: { bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800", dot: "bg-orange-500" },
  Hired: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  Rejected: { bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
};

import { useCapability } from "@hooks/useCapability";

export default function HRMSDashboard() {
  const { read, create, update } = useGenericAPI();
  const { isSuperAdmin, hasAnyCapability } = useCapability();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, jobs, pipeline, onboarding

  // Data States
  const [job_openings, setjob_openings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [onboardings, setOnboardings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drag states
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  // Candidate detail overlay
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [isMakingOffer, setIsMakingOffer] = useState(false);
  const [offerCTC, setOfferCTC] = useState("");
  const [offerDate, setOfferDate] = useState("");

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const [isConfirmingHire, setIsConfirmingHire] = useState(false);
  const [employeeCode, setEmployeeCode] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [hirePassword, setHirePassword] = useState("");
  const [hireRole, setHireRole] = useState("");
  const [reportingManager, setReportingManager] = useState("");

  // Onboarding Filter & Modal States
  const [onboardingFilter, setOnboardingFilter] = useState("All");
  const [documentModalItem, setDocumentModalItem] = useState(null); // { onboardingId, taskIndex, task }
  const [documentFileUrlInput, setDocumentFileUrlInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [exceptionModalOnboarding, setExceptionModalOnboarding] = useState(null); // { onboardingId, action }
  const [postponeDateInput, setPostponeDateInput] = useState("");
  const [cancellationReasonInput, setCancellationReasonInput] = useState("");

  useEffect(() => {
    setIsMakingOffer(false);
    setIsRejecting(false);
    setIsConfirmingHire(false);
    setOfferCTC("");
    setOfferDate("");
    setRejectionReasonText("");
    setEmployeeCode("");
    setWorkEmail(selectedCandidate?.email || "");
    setHirePassword("");
    setHireRole("");
    setReportingManager("");
  }, [selectedCandidate]);

  // Modals
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", department: "", designation: "", location: "", jobType: "Full-Time", openings: 1, description: "", requirements: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, candRes, onbRes, deptRes, desgRes, rolesRes, empRes] = await Promise.all([
        read("job_openings", { limit: 1000, populateFields: { department: "name", designation: "title" } }),
        read("candidates", { limit: 1000, populateFields: { jobOpeningId: "title,department,designation" } }),
        read("onboardings", { limit: 1000, populateFields: { employeeId: "basicInfo.firstName,basicInfo.lastName", department: "name", designation: "title" } }),
        read("departments", { limit: 500 }),
        read("designations", { limit: 500 }),
        read("roles", { limit: 500, filter: { isActive: true } }),
        read("employees", { limit: 1000, filter: { status: "Active" } })
      ]);
      setjob_openings(jobsRes?.data || []);
      setCandidates(candRes?.data || []);
      setOnboardings(onbRes?.data || []);
      setDepartments(deptRes?.data || []);
      setDesignations(desgRes?.data || []);
      setRoles(rolesRes?.data || []);
      setEmployees(empRes?.data || []);
    } catch (err) {
      console.error("Error fetching HRMS data:", err);
      toast.error("Failed to fetch HRMS records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Aggregated summaries
  const summaries = useMemo(() => {
    const activeJobs = job_openings.filter(j => j.status === 'Published').length;
    const pendingOnboardings = onboardings.filter(o => o.status !== 'Completed').length;
    const stageCounts = {};
    CANDIDATE_STAGES.forEach(s => { stageCounts[s] = 0; });
    candidates.forEach(c => { if (stageCounts[c.stage] !== undefined) stageCounts[c.stage]++; });

    return {
      activeJobs,
      totalCandidates: candidates.length,
      pendingOnboardings,
      stageCounts
    };
  }, [job_openings, candidates, onboardings]);

  // Create Job Opening
  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.department || !newJob.designation) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      await create("job_openings", newJob, "Job Opening created successfully!");
      setJobModalOpen(false);
      setNewJob({ title: "", department: "", designation: "", location: "", jobType: "Full-Time", openings: 1, description: "", requirements: "" });
      fetchData();
    } catch (err) {
      toast.error("Failed to create job opening");
    }
  };

  // Drag and drop for recruitment pipeline stage movement
  const handleDragStart = (e, candidateId) => {
    e.dataTransfer.setData("candidateId", candidateId);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const candidateId = e.dataTransfer.getData("candidateId");
    if (!candidateId) return;

    const cand = candidates.find(c => c._id === candidateId);
    if (cand && cand.stage !== targetStage) {
      try {
        await update("candidates", candidateId, { stage: targetStage }, `Moved candidate to ${targetStage}`);
        fetchData();
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || "Invalid status transition");
      }
    }
  };

  // Candidate Detailed Action Trigger (Offers / Rejections / Interviews)
  const handleUpdateCandidateStage = async (candidateId, stage, extraFields = {}) => {
    try {
      await update("candidates", candidateId, { stage, ...extraFields }, `Candidate stage changed to ${stage}`);
      setSelectedCandidate(null);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update candidate state");
    }
  };

  // Toggle individual onboarding checklist tasks
  const handleToggleChecklistTask = async (onboardingId, taskIndex) => {
    const onboarding = onboardings.find(o => o._id === onboardingId);
    if (!onboarding) return;

    try {
      const updatedChecklist = [...onboarding.checklist];
      const task = updatedChecklist[taskIndex];
      const nextCompletedState = !task.isCompleted;

      updatedChecklist[taskIndex] = {
        ...task,
        isCompleted: nextCompletedState,
        completedAt: nextCompletedState ? new Date() : null
      };

      await update("onboardings", onboardingId, { checklist: updatedChecklist }, "Checklist updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update checklist item");
    }
  };

  // Update Document URL / Upload for Checklist Item
  const handleUpdateChecklistDocUrl = async (onboardingId, taskIndex, fileUrl) => {
    const onboarding = onboardings.find(o => o._id === onboardingId);
    if (!onboarding) return;

    try {
      const updatedChecklist = [...onboarding.checklist];
      updatedChecklist[taskIndex] = {
        ...updatedChecklist[taskIndex],
        fileUrl,
        isCompleted: true,
        completedAt: new Date()
      };
      await update("onboardings", onboardingId, { checklist: updatedChecklist }, "Document attached!");
      setDocumentModalItem(null);
      setDocumentFileUrlInput("");
      fetchData();
    } catch (err) {
      toast.error("Failed to update document URL");
    }
  };

  // Verify / Reject Document Item
  const handleVerifyChecklistDoc = async (onboardingId, taskIndex, verified, rejectionReason = "") => {
    const onboarding = onboardings.find(o => o._id === onboardingId);
    if (!onboarding) return;

    try {
      const updatedChecklist = [...onboarding.checklist];
      updatedChecklist[taskIndex] = {
        ...updatedChecklist[taskIndex],
        verified,
        verifiedAt: verified ? new Date() : null,
        rejectionReason: verified ? "" : rejectionReason
      };
      await update("onboardings", onboardingId, { checklist: updatedChecklist }, verified ? "Document verified!" : "Document rejected!");
      setDocumentModalItem(null);
      setRejectionReasonInput("");
      fetchData();
    } catch (err) {
      toast.error("Failed to update verification status");
    }
  };

  // Handle Onboarding Exception Actions (Postpone, Cancel, No Show)
  const handleOnboardingAction = async (onboardingId, action, payload = {}) => {
    try {
      const updatePayload = { status: action, ...payload };
      if (action === 'Postponed' && payload.postponedToDate) {
        updatePayload.joiningDate = payload.postponedToDate;
      }
      await update("onboardings", onboardingId, updatePayload, `Onboarding updated to ${action}`);
      setExceptionModalOnboarding(null);
      setCancellationReasonInput("");
      setPostponeDateInput("");
      fetchData();
    } catch (err) {
      toast.error("Failed to update onboarding status");
    }
  };

  const filteredOnboardings = useMemo(() => {
    if (onboardingFilter === "All") return onboardings;
    if (onboardingFilter === "In Progress") return onboardings.filter(o => ['Pending', 'In Progress'].includes(o.status));
    if (onboardingFilter === "Verification Pending") return onboardings.filter(o => ['Documents Pending', 'Verification Pending'].includes(o.status));
    if (onboardingFilter === "Ready To Join") return onboardings.filter(o => o.status === 'Ready To Join');
    if (onboardingFilter === "Completed") return onboardings.filter(o => ['Joined', 'Completed'].includes(o.status));
    if (onboardingFilter === "Exceptions") return onboardings.filter(o => ['Cancelled', 'Postponed', 'No Show'].includes(o.status));
    return onboardings;
  }, [onboardings, onboardingFilter]);

  if (loading) return <PageLoader />;

  return (
    <div data-module="hr" className="h-full flex flex-col gap-4 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">HRMS MODULE</p>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-500" />
            Recruitment & Onboarding
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
            <RefreshCw className="h-4 w-4 text-ink-subtle" />
          </button>
          <button onClick={() => setJobModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 tracker-btn-accent text-[12px] font-semibold cursor-pointer">
            <Plus className="h-4 w-4" /> Create Opening
          </button>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex items-center gap-1 border-b border-hairline pb-1.5 flex-shrink-0">
        {[
          (isSuperAdmin || hasAnyCapability(['hrms_dashboard:view', 'hrms_overview:view'])) && { id: "dashboard", label: "Overview", icon: ClipboardList },
          (isSuperAdmin || hasAnyCapability(['job_openings:view', 'job_openings:create'])) && { id: "jobs", label: "Job Openings", icon: Briefcase },
          (isSuperAdmin || hasAnyCapability(['recruitment_pipeline:view', 'candidates:view'])) && { id: "pipeline", label: "Recruitment Pipeline", icon: Kanban },
          (isSuperAdmin || hasAnyCapability(['onboarding_checklist:view', 'onboardings:view'])) && { id: "onboarding", label: "Onboarding Checklist", icon: ListTodo }
        ].filter(Boolean).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-t-[8px] transition cursor-pointer border-b-2 -mb-[8px] ${activeTab === t.id
                ? "border-[var(--module-accent)] text-[var(--module-accent)] bg-surface"
                : "border-transparent text-ink-subtle hover:text-ink hover:bg-surface-1/50"
                }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB CONTENT: OVERVIEW ─── */}
      {activeTab === "dashboard" && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Active Openings" value={summaries.activeJobs} icon={Briefcase} color="blue" />
            <StatCard title="Total Applicants" value={summaries.totalCandidates} icon={Users} color="purple" />
            <StatCard title="Onboarding Checklist" value={summaries.pendingOnboardings} icon={ListTodo} color="yellow" />
            <StatCard title="Screening State" value={summaries.stageCounts.Screening || 0} icon={UserCheck2} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stage Summary List */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
              <h3 className="text-[14px] font-semibold text-ink">Applicant Stage Distribution</h3>
              <div className="space-y-3">
                {CANDIDATE_STAGES.map(stage => {
                  const count = summaries.stageCounts[stage] || 0;
                  const maxCount = Math.max(...Object.values(summaries.stageCounts), 1);
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-semibold text-ink-subtle">{stage}</span>
                        <span className="font-bold text-ink">{count}</span>
                      </div>
                      <div className="h-4 bg-surface-1 rounded-[5px] overflow-hidden">
                        <div className="h-full rounded-[5px] bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Onboarding List Preview */}
            <div className="lg:col-span-2 bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
              <h3 className="text-[14px] font-semibold text-ink">New Hire Onboarding Pipeline</h3>
              <div className="space-y-2.5">
                {onboardings.slice(0, 4).map(o => {
                  const empName = o.employeeId?.basicInfo
                    ? `${o.employeeId.basicInfo.firstName || ""} ${o.employeeId.basicInfo.lastName || ""}`
                    : "New Hire";
                  return (
                    <div key={o._id} className="flex items-center justify-between p-3.5 bg-surface-1 border border-hairline-soft rounded-[8px]">
                      <div>
                        <h4 className="text-[13px] font-semibold text-ink leading-tight">{empName}</h4>
                        <p className="text-[10px] text-ink-subtle mt-1">
                          Role: {o.designation?.title || "—"} | Dept: {o.department?.name || "—"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="text-right">
                          <p className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{o.completionPercent}%</p>
                          <p className="text-[9px] text-ink-tertiary">Tasks Met</p>
                        </div>
                        <div className="w-[100px] h-2.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${o.completionPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {onboardings.length === 0 && (
                  <p className="text-center text-[12px] text-ink-tertiary py-8">No current onboardings</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: JOB OPENINGS ─── */}
      {activeTab === "jobs" && (
        <div className="flex-1 bg-surface rounded-tracker-card border border-hairline shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ minWidth: "750px" }}>
              <thead className="bg-surface-1">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-ink-subtle">Role Title</th>
                  <th className="text-left px-3 py-2.5 font-medium text-ink-subtle">Department</th>
                  <th className="text-left px-3 py-2.5 font-medium text-ink-subtle">Type</th>
                  <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">Target Openings</th>
                  <th className="text-right px-3 py-2.5 font-medium text-ink-subtle">Filled</th>
                  <th className="text-center px-3 py-2.5 font-medium text-ink-subtle">Status</th>
                </tr>
              </thead>
              <tbody>
                {job_openings.map((job) => (
                  <tr key={job._id} className="hover:bg-accent/5 border-b border-hairline-soft transition">
                    <td className="px-4 py-3 font-semibold text-ink">{job.title}</td>
                    <td className="px-3 py-3 text-ink-subtle">{job.department?.name || "—"}</td>
                    <td className="px-3 py-3 text-ink-subtle">{job.jobType}</td>
                    <td className="px-3 py-3 text-right font-medium text-ink">{job.openings}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{job.filled}</td>
                    <td className="px-3 py-3 text-center">
                      <select
                        value={job.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await update("job_openings", job._id, { status: newStatus }, "Job status updated!");
                            fetchData();
                          } catch (err) {
                            toast.error("Failed to update status");
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold outline-none cursor-pointer border ${job.status === 'Published' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          job.status === 'Filled' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                        <option value="Closed">Closed</option>
                        <option value="Filled">Filled</option>
                      </select>
                    </td >
                  </tr >
                ))
                }
                {
                  job_openings.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-ink-tertiary">No job postings found. Click Create Opening.</td></tr>
                  )
                }
              </tbody >
            </table >
          </div >
        </div >
      )}

      {/* ─── TAB CONTENT: RECRUITMENT PIPELINE ─── */}
      {
        activeTab === "pipeline" && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-2 select-none" style={{ minHeight: "500px" }}>
            {CANDIDATE_STAGES.map(stage => {
              const stageCands = candidates.filter(c => c.stage === stage);
              const isOver = draggedOverStage === stage;
              return (
                <div
                  key={stage}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={() => setDraggedOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`flex-shrink-0 w-[270px] flex flex-col bg-surface-1/40 rounded-tracker-card border border-hairline-soft overflow-hidden transition-all ${isOver ? 'bg-accent/5 border-dashed border-accent' : ''
                    }`}
                >
                  {/* Column Header */}
                  <div className={`p-3 border-t-4 border-b border-hairline-soft bg-surface flex items-center justify-between flex-shrink-0 ${STAGE_META[stage]?.bg || ''}`}>
                    <span className="text-[12px] font-bold uppercase tracking-wider">{stage}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-1 text-ink-subtle">{stageCands.length}</span>
                  </div>

                  {/* Column Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageCands.map(cand => (
                      <div
                        key={cand._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, cand._id)}
                        onClick={() => setSelectedCandidate(cand)}
                        className="bg-surface p-3.5 rounded-tracker-card border border-hairline shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition space-y-2"
                      >
                        <div>
                          <h4 className="text-[13px] font-bold text-ink hover:text-[var(--module-accent)] transition-colors line-clamp-1">{cand.firstName} {cand.lastName || ''}</h4>
                          <p className="text-[10px] text-ink-subtle mt-0.5 font-medium">{cand.jobOpeningId?.title || 'Open Position'}</p>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-ink-tertiary pt-2 border-t border-hairline-soft">
                          <span>📞 {cand.phone || 'No phone'}</span>
                          <span>✉️ {cand.source || 'Direct'}</span>
                        </div>
                      </div>
                    ))}
                    {stageCands.length === 0 && (
                      <p className="text-center py-10 text-[11px] text-ink-tertiary">Drag candidates here</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* ─── TAB CONTENT: ONBOARDING CHECKLISTS ─── */}
      {
        activeTab === "onboarding" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Status Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-hairline-soft text-[12px]">
              {["All", "In Progress", "Verification Pending", "Ready To Join", "Completed", "Exceptions"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setOnboardingFilter(tab)}
                  className={`px-3 py-1.5 rounded-full font-medium transition cursor-pointer flex-shrink-0 ${onboardingFilter === tab
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-surface-1 border border-hairline text-ink-subtle hover:text-ink'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredOnboardings.map(o => {
              const empName = o.employeeId?.basicInfo
                ? `${o.employeeId.basicInfo.firstName || ""} ${o.employeeId.basicInfo.lastName || ""}`
                : "Employee";

              const isReadyToJoin = o.status === 'Ready To Join';
              const isCompleted = ['Joined', 'Completed'].includes(o.status);
              const isException = ['Cancelled', 'Postponed', 'No Show'].includes(o.status);

              return (
                <div key={o._id} className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
                  {/* Employee card header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline-soft pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-bold text-ink">{empName}</h3>
                        {o.slaBreached && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> SLA Breached
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-subtle mt-0.5">
                        Designation: {o.designation?.title || '—'} | Dept: {o.department?.name || '—'} | Target Joining: {new Date(o.joiningDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* State Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        isReadyToJoin ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse' :
                          o.status === 'Verification Pending' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            isException ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                        {isReadyToJoin && <ShieldCheck className="h-3 w-3 text-amber-600" />}
                        Onboarding: {o.status}
                      </span>

                      <div className="text-right">
                        <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{o.completionPercent}% Tasks</span>
                        <span className="text-[10px] text-ink-tertiary block">{o.verifiedPercent}% Verified</span>
                      </div>

                      {/* Exception Actions Menu */}
                      {!isCompleted && !isException && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-hairline-soft">
                          <button
                            title="Postpone Joining Date"
                            onClick={() => setExceptionModalOnboarding({ onboardingId: o._id, action: 'Postponed' })}
                            className="p-1.5 bg-surface-1 border border-hairline rounded-[6px] hover:bg-surface-2 text-[10px] font-semibold cursor-pointer text-ink-subtle"
                          >
                            Postpone
                          </button>
                          <button
                            title="Mark No Show"
                            onClick={() => setExceptionModalOnboarding({ onboardingId: o._id, action: 'No Show' })}
                            className="p-1.5 bg-rose-50 border border-rose-200 rounded-[6px] hover:bg-rose-100 text-[10px] font-semibold cursor-pointer text-rose-700"
                          >
                            No Show
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checklist tasks grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {o.checklist?.map((task, idx) => (
                      <div
                        key={task._id || idx}
                        className={`p-3 rounded-[8px] border flex flex-col justify-between gap-2 transition ${task.isCompleted
                          ? task.verified
                            ? 'bg-emerald-50/20 border-emerald-200 text-emerald-900 dark:border-emerald-900/50'
                            : 'bg-indigo-50/20 border-indigo-200 text-indigo-900'
                          : 'bg-surface-1 border-hairline text-ink'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold truncate leading-tight">{task.task}</p>
                            <p className="text-[9px] text-ink-tertiary mt-0.5">{task.category} {task.documentType ? `• ${task.documentType}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleToggleChecklistTask(o._id, idx)}
                            className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 cursor-pointer ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-hairline bg-surface'
                              }`}
                          >
                            {task.isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>

                        {/* Document Verification & File Link section */}
                        {(task.documentType || task.category === 'Documents') && (
                          <div className="pt-2 border-t border-hairline-soft/60 flex items-center justify-between text-[10px]">
                            {task.fileUrl ? (
                              <a
                                href={task.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 truncate max-w-[130px]"
                              >
                                <FileText className="h-3 w-3" /> Document Link 🔗
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  setDocumentModalItem({ onboardingId: o._id, taskIndex: idx, task: task.task });
                                  setDocumentFileUrlInput('');
                                }}
                                className="text-indigo-600 hover:underline font-medium"
                              >
                                + Attach Document URL
                              </button>
                            )}

                            {/* HR Document Verification Controls */}
                            {task.fileUrl && (
                              <div className="flex items-center gap-1">
                                {task.verified ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-0.5 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    <ShieldCheck className="h-3 w-3" /> Verified
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyChecklistDoc(o._id, idx, true)}
                                    className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Verify HR
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredOnboardings.length === 0 && (
              <div className="text-center py-20 text-ink-tertiary">
                <ListTodo className="h-10 w-10 mx-auto opacity-40 mb-2" />
                <p className="text-xs">No onboardings matching filter "{onboardingFilter}".</p>
              </div>
            )}
          </div>
        )
      }

      {/* ─── DOCUMENT ATTACHMENT MODAL ─── */}
      {documentModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={(e) => e.target === e.currentTarget && setDocumentModalItem(null)}>
          <div className="bg-surface rounded-tracker-card border border-hairline w-full max-w-md p-5 shadow-2xl space-y-4 text-[12px]">
            <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
              <h3 className="font-bold text-ink text-[14px]">Attach Document URL</h3>
              <button onClick={() => setDocumentModalItem(null)} className="cursor-pointer text-ink-subtle">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-ink-subtle">Target Task: <strong className="text-ink">{documentModalItem.task}</strong></p>
            <div className="space-y-1">
              <label className="font-semibold text-ink-subtle">Document URL / Storage Link *</label>
              <input
                type="text"
                value={documentFileUrlInput}
                onChange={(e) => setDocumentFileUrlInput(e.target.value)}
                placeholder="https://storage.provider.com/doc-file.pdf"
                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!documentFileUrlInput.trim()) {
                    toast.error("Please enter a valid document URL");
                    return;
                  }
                  handleUpdateChecklistDocUrl(documentModalItem.onboardingId, documentModalItem.taskIndex, documentFileUrlInput.trim());
                }}
                className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-[6px] hover:bg-indigo-700 cursor-pointer"
              >
                Save Document URL
              </button>
              <button
                type="button"
                onClick={() => setDocumentModalItem(null)}
                className="px-4 py-2 border border-hairline rounded-[6px] text-ink-subtle hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXCEPTION ACTIONS MODAL (POSTPONE / NO SHOW) ─── */}
      {exceptionModalOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={(e) => e.target === e.currentTarget && setExceptionModalOnboarding(null)}>
          <div className="bg-surface rounded-tracker-card border border-hairline w-full max-w-md p-5 shadow-2xl space-y-4 text-[12px]">
            <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
              <h3 className="font-bold text-ink text-[14px]">Update Status: {exceptionModalOnboarding.action}</h3>
              <button onClick={() => setExceptionModalOnboarding(null)} className="cursor-pointer text-ink-subtle">
                <X className="h-4 w-4" />
              </button>
            </div>

            {exceptionModalOnboarding.action === 'Postponed' && (
              <div className="space-y-1">
                <label className="font-semibold text-ink-subtle">New Target Joining Date *</label>
                <input
                  type="date"
                  value={postponeDateInput}
                  onChange={(e) => setPostponeDateInput(e.target.value)}
                  className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none"
                />
              </div>
            )}

            {exceptionModalOnboarding.action === 'No Show' && (
              <div className="space-y-1">
                <label className="font-semibold text-ink-subtle">No-Show Remarks / Notes *</label>
                <textarea
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                  placeholder="e.g. Candidate failed to join on expected date and unreachable"
                  rows={3}
                  className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (exceptionModalOnboarding.action === 'Postponed' && !postponeDateInput) {
                    toast.error("Please enter a new joining date");
                    return;
                  }
                  handleOnboardingAction(
                    exceptionModalOnboarding.onboardingId,
                    exceptionModalOnboarding.action,
                    exceptionModalOnboarding.action === 'Postponed'
                      ? { postponedToDate: new Date(postponeDateInput) }
                      : { cancellationReason: cancellationReasonInput }
                  );
                }}
                className="flex-1 py-2 bg-rose-600 text-white font-semibold rounded-[6px] hover:bg-rose-700 cursor-pointer"
              >
                Confirm {exceptionModalOnboarding.action}
              </button>
              <button
                type="button"
                onClick={() => setExceptionModalOnboarding(null)}
                className="px-4 py-2 border border-hairline rounded-[6px] text-ink-subtle hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SLIDING CANDIDATE DETAILS SHEET ─── */}
      {
        selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={(e) => e.target === e.currentTarget && setSelectedCandidate(null)}>
            <div className="h-full w-full max-w-lg flex flex-col shadow-2xl bg-surface border-l border-hairline animate-[slideInRight_.22s_ease-out]">

              {/* Header */}
              <div className="px-6 py-4 flex items-start justify-between border-b border-hairline-soft">
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Candidate Screening</span>
                  <h2 className="text-[18px] font-bold text-ink mt-0.5">{selectedCandidate.firstName} {selectedCandidate.lastName || ''}</h2>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${STAGE_META[selectedCandidate.stage]?.bg || ''}`}>
                    Stage: {selectedCandidate.stage}
                  </span>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-1 cursor-pointer">
                  <X className="h-4 w-4 text-ink-subtle" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-[13px]">

                {/* Contact information */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Contact details</h4>
                  <div className="bg-surface-1 p-3 rounded-[8px] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-subtle">Application ID</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[11px]">
                        {selectedCandidate.applicationId || `APP-2026-${selectedCandidate._id?.slice(-4).toUpperCase()}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Email</span>
                      <a href={`mailto:${selectedCandidate.email}`} className="font-semibold text-indigo-600 hover:underline">{selectedCandidate.email}</a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-subtle">Phone</span>
                      <span className="font-medium text-ink">{selectedCandidate.phone || '—'}</span>
                    </div>
                    {selectedCandidate.linkedinUrl && (
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">LinkedIn</span>
                        <a href={selectedCandidate.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">Profile 🔗</a>
                      </div>
                    )}
                    {selectedCandidate.resumeUrl && (
                      <div className="flex justify-between">
                        <span className="text-ink-subtle">Resume</span>
                        <a href={selectedCandidate.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">Download Resume 📄</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* External Pre-Joining Portal Action */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-[8px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">External Candidate Access</span>
                    <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <p className="text-[11px] text-ink-subtle">Direct external candidate portal link for offer review & pre-joining confirmation.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const externalUrl = import.meta.env.VITE_EXTERNAL_PORTAL_URL || 'http://localhost:3001';
                      const appId = selectedCandidate.applicationId || `APP-2026-${selectedCandidate._id?.slice(-4).toUpperCase()}`;
                      window.open(`${externalUrl}/pre-joining?applicationId=${appId}`, '_blank');
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-[8px] text-[12px] transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>→ Pre - Joining Confirmation</span>
                  </button>
                </div>

                {/* Status transition actions */}
                <div className="space-y-2 pt-2 border-t border-hairline-soft">
                  <h4 className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Pipeline Stage Transitions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCandidate.stage === 'Applied' && (
                      <button
                        onClick={() => handleUpdateCandidateStage(selectedCandidate._id, 'Screening')}
                        className="py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded-[8px] text-[12px] hover:bg-indigo-100 transition cursor-pointer"
                      >
                        Move to Screening
                      </button>
                    )}
                    {selectedCandidate.stage === 'Screening' && (
                      <button
                        onClick={() => handleUpdateCandidateStage(selectedCandidate._id, 'Interview')}
                        className="py-2 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-[8px] text-[12px] hover:bg-amber-100 transition cursor-pointer"
                      >
                        Schedule Interview
                      </button>
                    )}
                    {selectedCandidate.stage === 'Interview' && (
                      <div className="col-span-2 space-y-2">
                        {!isMakingOffer ? (
                          <button
                            onClick={() => { setIsMakingOffer(true); setIsRejecting(false); }}
                            className="w-full py-2 bg-orange-50 border border-orange-200 text-orange-700 font-semibold rounded-[8px] text-[12px] hover:bg-orange-100 transition cursor-pointer"
                          >
                            Make Offer
                          </button>
                        ) : (
                          <div className="bg-surface-1 border border-hairline p-3.5 rounded-[8px] space-y-3">
                            <p className="font-bold text-ink text-[12px]">New Job Offer Details</p>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Offered CTC (INR/year) *</label>
                              <input
                                type="number"
                                value={offerCTC}
                                onChange={(e) => setOfferCTC(e.target.value)}
                                placeholder="e.g. 1200000"
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Target Joining Date *</label>
                              <input
                                type="date"
                                value={offerDate}
                                onChange={(e) => setOfferDate(e.target.value)}
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Assigned Reporting Manager *</label>
                              <select
                                value={reportingManager}
                                onChange={(e) => setReportingManager(e.target.value)}
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink cursor-pointer outline-none text-[12px]"
                              >
                                <option value="">-- Select Reporting Manager --</option>
                                {employees?.map(emp => (
                                  <option key={emp._id} value={emp._id}>
                                    {emp.basicInfo?.firstName} {emp.basicInfo?.lastName || ''} ({emp.authInfo?.workEmail || emp.basicInfo?.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!offerCTC || !offerDate || !reportingManager) {
                                    toast.error("Please specify CTC, Joining Date, and Reporting Manager");
                                    return;
                                  }
                                  handleUpdateCandidateStage(selectedCandidate._id, 'Offered', {
                                    offeredSalary: Number(offerCTC),
                                    joiningDate: new Date(offerDate),
                                    reportingManager: reportingManager
                                  });
                                }}
                                className="flex-1 py-1.5 bg-indigo-600 text-white font-semibold rounded-[6px] text-[11px] hover:bg-indigo-700 transition cursor-pointer"
                              >
                                Confirm Offer
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsMakingOffer(false)}
                                className="px-3 py-1.5 bg-surface border border-hairline text-ink-subtle rounded-[6px] text-[11px] hover:bg-surface-2 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedCandidate.stage === 'Offered' && (
                      <div className="col-span-2 space-y-2">
                        {!isConfirmingHire ? (
                          <button
                            onClick={() => { setIsConfirmingHire(true); setIsMakingOffer(false); setIsRejecting(false); }}
                            className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-[8px] text-[12px] hover:bg-emerald-100 transition cursor-pointer"
                          >
                            Confirm Hire (Joined)
                          </button>
                        ) : (
                          <div className="bg-surface-1 border border-emerald-200 p-3.5 rounded-[8px] space-y-3">
                            <p className="font-bold text-emerald-800 text-[12px]">Complete Onboarding Credentials</p>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Employee Code / ID *</label>
                              <input
                                type="text"
                                value={employeeCode}
                                onChange={(e) => setEmployeeCode(e.target.value)}
                                placeholder="e.g. LMX-1042"
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Work Email *</label>
                              <input
                                type="email"
                                value={workEmail}
                                onChange={(e) => setWorkEmail(e.target.value)}
                                placeholder="e.g. employee@company.com"
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Password *</label>
                              <input
                                type="password"
                                value={hirePassword}
                                onChange={(e) => setHirePassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">System Access Role *</label>
                              <select
                                value={hireRole}
                                onChange={(e) => setHireRole(e.target.value)}
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none text-[12px]"
                              >
                                <option value="">-- Select Access Role --</option>
                                {roles?.map(r => (
                                  <option key={r._id} value={r._id}>{r.name} (L{r.level || 1})</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-ink-subtle text-[11px] font-semibold">Reporting Manager *</label>
                              <select
                                value={reportingManager}
                                onChange={(e) => setReportingManager(e.target.value)}
                                className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink cursor-pointer outline-none text-[12px]"
                              >
                                <option value="">-- Select Reporting Manager --</option>
                                {employees?.map(emp => (
                                  <option key={emp._id} value={emp._id}>
                                    {emp.basicInfo?.firstName} {emp.basicInfo?.lastName || ''} ({emp.authInfo?.workEmail || emp.basicInfo?.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!employeeCode || !workEmail || !hirePassword || !hireRole || !reportingManager) {
                                    toast.error("Please fill all required onboarding fields and reporting manager");
                                    return;
                                  }
                                  handleUpdateCandidateStage(selectedCandidate._id, 'Hired', {
                                    empId: employeeCode,
                                    workEmail: workEmail,
                                    password: hirePassword,
                                    role: hireRole,
                                    reportingManager: reportingManager
                                  });
                                }}
                                className="flex-1 py-1.5 bg-emerald-600 text-white font-semibold rounded-[6px] text-[11px] hover:bg-emerald-700 transition cursor-pointer"
                              >
                                Confirm Access & Hire
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsConfirmingHire(false)}
                                className="px-3 py-1.5 bg-surface border border-hairline text-ink-subtle rounded-[6px] text-[11px] hover:bg-surface-2 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedCandidate.stage !== 'Hired' && selectedCandidate.stage !== 'Rejected' && !isMakingOffer && (
                      <div className="col-span-2 space-y-2">
                        {!isRejecting ? (
                          <button
                            onClick={() => { setIsRejecting(true); setIsMakingOffer(false); }}
                            className="w-full py-2 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-[8px] text-[12px] hover:bg-rose-100 transition cursor-pointer"
                          >
                            Reject Candidate
                          </button>
                        ) : (
                          <div className="bg-rose-50/10 border border-rose-200 p-3.5 rounded-[8px] space-y-3">
                            <p className="font-bold text-rose-800 text-[12px]">Reject Candidate</p>
                            <div className="space-y-1">
                              <label className="text-rose-700 text-[11px] font-semibold">Rejection Reason *</label>
                              <input
                                type="text"
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                placeholder="e.g. Failed technical screening"
                                className="w-full p-2 bg-surface border border-rose-200 rounded-[8px] text-ink outline-none text-[12px]"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateCandidateStage(selectedCandidate._id, 'Rejected', {
                                    rejectionReason: rejectionReasonText.trim() || 'Not Specified'
                                  });
                                }}
                                className="flex-1 py-1.5 bg-rose-600 text-white font-semibold rounded-[6px] text-[11px] hover:bg-rose-700 transition cursor-pointer"
                              >
                                Confirm Rejection
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsRejecting(false)}
                                className="px-3 py-1.5 bg-surface border border-hairline text-ink-subtle rounded-[6px] text-[11px] hover:bg-surface-2 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Log details */}
                {selectedCandidate.rejectionReason && (
                  <div className="bg-rose-50/20 border border-rose-200 p-3 rounded-[8px] text-rose-800 text-[12px]">
                    <p className="font-bold">Rejection Reason:</p>
                    <p className="mt-0.5">{selectedCandidate.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ─── CREATE JOB OPENING MODAL ─── */}
      {
        jobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
            onClick={(e) => e.target === e.currentTarget && setJobModalOpen(false)}>
            <div className="bg-surface rounded-tracker-card border border-hairline w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-hairline-soft flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-ink">Create Job Opening</h3>
                <button onClick={() => setJobModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-1 cursor-pointer">
                  <X className="h-4 w-4 text-ink-subtle" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="flex-1 overflow-y-auto p-6 space-y-4 text-[12px]">
                <div className="space-y-1">
                  <label className="font-semibold text-ink-subtle">Job Title *</label>
                  <input
                    type="text"
                    value={newJob.title}
                    onChange={e => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-ink-subtle">Department *</label>
                    <select
                      value={newJob.department}
                      onChange={e => setNewJob(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink cursor-pointer"
                      required
                    >
                      <option value="">— Select Department —</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-ink-subtle">Designation *</label>
                    <select
                      value={newJob.designation}
                      onChange={e => setNewJob(prev => ({ ...prev, designation: e.target.value }))}
                      className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink cursor-pointer"
                      required
                    >
                      <option value="">— Select Designation —</option>
                      {designations.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-ink-subtle">Location</label>
                    <input
                      type="text"
                      value={newJob.location}
                      onChange={e => setNewJob(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Remote / Bangalore"
                      className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-ink-subtle">Job Type</label>
                    <select
                      value={newJob.jobType}
                      onChange={e => setNewJob(prev => ({ ...prev, jobType: e.target.value }))}
                      className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink cursor-pointer"
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-ink-subtle">Openings</label>
                    <input
                      type="number"
                      value={newJob.openings}
                      onChange={e => setNewJob(prev => ({ ...prev, openings: Number(e.target.value) }))}
                      min={1}
                      className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink-subtle">Job Description</label>
                  <textarea
                    value={newJob.description}
                    onChange={e => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe role responsibilities..."
                    rows={3}
                    className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-2.5 tracker-btn-accent font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  Submit Job Posting
                </button>
              </form>
            </div>
          </div>
        )
      }
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div >
  );
}
