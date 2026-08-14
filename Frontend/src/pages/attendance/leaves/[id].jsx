import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import PageLoader from "../../../components/Common/PageLoader";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Mail,
  ShieldAlert,
  Paperclip,
  Download,
  ExternalLink,
  ChevronRight,
  Users2,
  History,
  PieChart,
  Check,
  X,
  Clock3,
  CalendarCheck,
  AlertTriangle,
  Briefcase
} from "lucide-react";

export default function LeaveDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { read, update } = useGenericAPI();

  // Core state
  const [leave, setLeave] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [overlappingLeaves, setOverlappingLeaves] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);

  // Interaction state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [managerComment, setManagerComment] = useState("");
  const [commentError, setCommentError] = useState("");

  // Safe navigation back
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/attendance/leaves");
    }
  };

  // Fetch all comprehensive leave & context data
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch Primary Leave Record
      const leaveRes = await read("leaves", {
        id,
        populateFields: {
          employeeId: "basicInfo,professionalInfo,leaveStatus",
          leaveTypeId: "name,code,color,quota",
          departmentId: "name",
          managerId: "basicInfo.firstName,basicInfo.lastName,authInfo.workEmail",
          "approvals.approverId": "basicInfo.firstName,basicInfo.lastName",
        },
      });

      const currentLeave = leaveRes?.data;
      if (!currentLeave) {
        setLeave(null);
        return;
      }

      setLeave(currentLeave);

      const empId =
        typeof currentLeave.employeeId === "object"
          ? currentLeave.employeeId?._id
          : currentLeave.employeeId;
      const deptId =
        typeof currentLeave.departmentId === "object"
          ? currentLeave.departmentId?._id
          : currentLeave.departmentId;

      // 2. Parallel Secondary Context Fetches (with Policy Scoping)
      const empDeptId = employee?.professionalInfo?.department?._id || employee?.professionalInfo?.department || deptId;
      const empDesigId = employee?.professionalInfo?.designation?._id || employee?.professionalInfo?.designation;
      const empRoleId = employee?.professionalInfo?.role?._id || employee?.professionalInfo?.role;

      const [policiesRes, typesRes, overlapRes, historyRes, empDetailsRes] = await Promise.all([
        read("leave_policies", {
          filter: {
            isActive: true,
            status: "Active",
            $or: [
              ...(empDeptId ? [{ applicableDepartments: empDeptId }] : []),
              ...(empDesigId ? [{ applicableDesignations: empDesigId }] : []),
              ...(empRoleId ? [{ applicableRoles: empRoleId }] : []),
            ],
          },
          populateFields: { "leaves.leaveType": "name,code,color,quota" },
          limit: 10,
        }),
        read("leave_types", { limit: 50 }),
        deptId && currentLeave.startDate && currentLeave.endDate
          ? read("leaves", {
              filter: {
                departmentId: deptId,
                _id: { $ne: currentLeave._id },
                status: { $in: ["Approved", "Pending"] },
                startDate: { $lte: currentLeave.endDate },
                endDate: { $gte: currentLeave.startDate },
              },
              populateFields: {
                employeeId: "basicInfo.firstName,basicInfo.lastName",
                leaveTypeId: "name",
              },
              limit: 10,
            })
          : Promise.resolve({ data: [] }),
        empId
          ? read("leaves", {
              filter: {
                employeeId: empId,
                _id: { $ne: currentLeave._id },
              },
              sort: { createdAt: -1 },
              limit: 5,
              populateFields: { leaveTypeId: "name" },
            })
          : Promise.resolve({ data: [] }),
        empId && (!currentLeave.employeeId?.basicInfo || !currentLeave.employeeId?.leaveStatus)
          ? read("employees", {
              id: empId,
              populateFields: {
                "professionalInfo.department": "name,leavePolicy",
                "professionalInfo.designation": "title,leavePolicy",
                "leaveStatus.leaveType": "name,code,color",
              },
            })
          : Promise.resolve({ data: currentLeave.employeeId }),
      ]);

      const fetchedEmp = empDetailsRes?.data || currentLeave.employeeId || null;
      setEmployee(fetchedEmp);

      // Resolve Applicable Leave Types & Quotas from Employee Policy
      const matchedPolicies = policiesRes?.data || [];
      let resolvedTypes = [];

      if (matchedPolicies.length > 0) {
        // Collect all distinct leave types defined in the matching department/designation policies
        const policyLeaveMap = new Map();
        matchedPolicies.forEach((p) => {
          (p.leaves || []).forEach((item) => {
            if (item.leaveType) {
              const ltObj = typeof item.leaveType === "object" ? item.leaveType : { _id: item.leaveType };
              policyLeaveMap.set(ltObj._id.toString(), {
                ...ltObj,
                policyMaxPerYear: item.maxDaysPerYear,
                policyMaxPerMonth: item.maxDaysPerMonth,
                carryForward: item.carryForward,
              });
            }
          });
        });
        resolvedTypes = Array.from(policyLeaveMap.values());
      }

      // If employee has direct leaveStatus assignments, merge them
      if (fetchedEmp?.leaveStatus && fetchedEmp.leaveStatus.length > 0) {
        const empStatusTypes = fetchedEmp.leaveStatus
          .filter((s) => s.leaveType)
          .map((s) => ({
            ...(typeof s.leaveType === "object" ? s.leaveType : { _id: s.leaveType }),
            available: s.available,
            usedThisYear: s.usedThisYear,
          }));

        if (resolvedTypes.length === 0) {
          resolvedTypes = empStatusTypes;
        } else {
          // Enrich resolved types with employee balances
          resolvedTypes = resolvedTypes.map((rt) => {
            const match = empStatusTypes.find((est) => est._id?.toString() === rt._id?.toString());
            return match ? { ...rt, ...match } : rt;
          });
        }
      }

      // Fallback to all global leave types if no policy or employee quota is assigned
      if (resolvedTypes.length === 0) {
        resolvedTypes = typesRes?.data || [];
      }

      setLeaveTypes(resolvedTypes);
      setOverlappingLeaves(overlapRes?.data || []);
      setRecentLeaves(historyRes?.data || []);
    } catch (err) {
      console.error("Failed to load leave details:", err);
      toast.error("Failed to load leave details");
    } finally {
      setLoading(false);
    }
  }, [id, read]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Approval handler
  const handleApprove = async () => {
    if (!managerComment || managerComment.trim().length < 5) {
      setCommentError("Please provide approval remarks (minimum 5 characters).");
      return;
    }
    setCommentError("");
    setSubmitting(true);

    const payload = {
      status: "Approved",
      managerComments: managerComment.trim(),
      approverComment: managerComment.trim(),
      managerId: user?.id || user?._id,
      approvedAt: new Date().toISOString(),
    };

    try {
      await update("leaves", { id, data: payload });
      toast.success("Leave request approved successfully!");
      setManagerComment("");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to approve leave request");
    } finally {
      setSubmitting(false);
    }
  };

  // Rejection handler
  const handleReject = async () => {
    if (!managerComment || managerComment.trim().length < 5) {
      setCommentError("Please provide a reason for rejection (minimum 5 characters).");
      return;
    }
    setCommentError("");
    setSubmitting(true);

    const payload = {
      status: "Rejected",
      managerComments: managerComment.trim(),
      approverComment: managerComment.trim(),
      managerId: user?.id || user?._id,
      rejectedAt: new Date().toISOString(),
    };

    try {
      await update("leaves", { id, data: payload });
      toast.success("Leave request rejected.");
      setManagerComment("");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reject leave request");
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const employeeName = useMemo(() => {
    if (leave?.employeeName) return leave.employeeName;
    if (employee?.basicInfo) {
      const { firstName = "", lastName = "" } = employee.basicInfo;
      return `${firstName} ${lastName}`.trim() || "Employee";
    }
    return "Employee";
  }, [leave, employee]);

  const leaveTypeName = useMemo(() => {
    if (leave?.leaveName) return leave.leaveName;
    if (leave?.leaveTypeId?.name) return leave.leaveTypeId.name;
    return "General Leave";
  }, [leave]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status Styling Configuration
  const getStatusBadge = (status) => {
    const s = status || "Pending";
    switch (s) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Pending Approval
          </span>
        );
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!leave) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-[var(--tracker-surface-2)] flex items-center justify-center mb-4 text-[var(--tracker-ink-muted)]">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-[18px] font-bold text-[var(--tracker-ink)] mb-1">
          Leave Request Not Found
        </h2>
        <p className="text-[13px] text-[var(--tracker-ink-muted)] max-w-sm mb-6">
          The requested leave record does not exist or you may not have permission to view it.
        </p>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--tracker-radius-md)] text-[13px] font-medium bg-[var(--brand-solid)] text-white hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leave Hub
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5 text-[var(--tracker-ink)]">
      <Toaster position="top-right" />

      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION & BREADCRUMB BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--tracker-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] text-[var(--tracker-ink-muted)]">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 hover:text-[var(--tracker-ink)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <span>/</span>
            <Link
              to="/attendance/leaves"
              className="hover:text-[var(--tracker-ink)] transition-colors"
            >
              Attendance
            </Link>
            <span>/</span>
            <Link
              to="/attendance/leaves"
              className="hover:text-[var(--tracker-ink)] transition-colors"
            >
              Leaves
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--tracker-ink)]">
              REQ-{id.substring(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-[20px] sm:text-[22px] font-bold text-[var(--tracker-ink)] tracking-tight">
              Leave Request Details
            </h1>
            {leave.isEmergency && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase tracking-wide">
                <ShieldAlert className="h-3 w-3" />
                Emergency
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {getStatusBadge(leave.status)}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN 2-COLUMN ENTERPRISE GRID
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ═════════════════════════════════════════════════════════════
            LEFT COLUMN: CORE DETAILS & ACTION (7 cols on desktop)
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Card 1: Applicant Profile & Request Parameters */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
            
            {/* Applicant Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-[var(--tracker-surface-2)] border border-[var(--tracker-border)] flex items-center justify-center font-bold text-[14px] text-[var(--brand-solid)] shadow-xs">
                  {employeeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--tracker-ink)] leading-tight">
                    {employeeName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[12px] text-[var(--tracker-ink-muted)]">
                    {employee?.professionalInfo?.empId && (
                      <span className="font-mono bg-[var(--tracker-surface-1)] px-1.5 py-0.5 rounded border border-[var(--tracker-border)]">
                        {employee.professionalInfo.empId}
                      </span>
                    )}
                    {leave.departmentId?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-[var(--tracker-ink-subtle)]" />
                        {leave.departmentId.name}
                      </span>
                    )}
                    {employee?.professionalInfo?.designation?.name && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-[var(--tracker-ink-subtle)]" />
                        {employee.professionalInfo.designation.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-[var(--tracker-ink-muted)]">
                <span className="block">Submitted On</span>
                <span className="font-medium text-[var(--tracker-ink)]">
                  {formatDateTime(leave.createdAt)}
                </span>
              </div>
            </div>

            {/* Key Request Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)]">
                <span className="text-[11px] font-medium text-[var(--tracker-ink-muted)] flex items-center gap-1 block">
                  <FileText className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
                  Leave Type
                </span>
                <span className="text-[13px] font-bold text-[var(--tracker-ink)] block mt-1">
                  {leaveTypeName}
                </span>
              </div>

              <div className="p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)]">
                <span className="text-[11px] font-medium text-[var(--tracker-ink-muted)] flex items-center gap-1 block">
                  <Clock className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
                  Duration
                </span>
                <span className="text-[13px] font-bold text-[var(--tracker-ink)] block mt-1">
                  {leave.totalDays} {leave.totalDays === 1 ? "Day" : "Days"}
                </span>
              </div>

              <div className="p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)] sm:col-span-2">
                <span className="text-[11px] font-medium text-[var(--tracker-ink-muted)] flex items-center gap-1 block">
                  <Calendar className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
                  Schedule Interval
                </span>
                <span className="text-[13px] font-semibold text-[var(--tracker-ink)] block mt-1">
                  {formatDate(leave.startDate)}
                  <span className="mx-1 text-[var(--tracker-ink-subtle)]">→</span>
                  {formatDate(leave.endDate)}
                </span>
              </div>
            </div>

            {/* Stated Reason */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[12px] font-medium text-[var(--tracker-ink-muted)] flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Employee Stated Reason
              </span>
              <div className="p-3.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] text-[13px] text-[var(--tracker-ink)] leading-relaxed italic">
                &ldquo;{leave.reason || "No detailed remarks provided by the employee."}&rdquo;
              </div>
            </div>

            {/* Supporting Document Attachment */}
            {leave.document && (
              <div className="pt-2 border-t border-[var(--tracker-border)]">
                <span className="text-[12px] font-medium text-[var(--tracker-ink-muted)] block mb-1.5">
                  Attached Verification Document
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/50 border border-[var(--tracker-border)]">
                  <div className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--tracker-ink)] truncate">
                    <Paperclip className="h-4 w-4 text-[var(--brand-solid)] flex-shrink-0" />
                    <span className="truncate">
                      {leave.document.split("/").pop() || "Attached_Document.pdf"}
                    </span>
                  </div>
                  <a
                    href={leave.document}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--tracker-radius-sm)] text-[12px] font-medium bg-[var(--tracker-surface)] border border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink)] transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View / Download
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Decision & Approval Action Hub */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[15px] font-bold text-[var(--tracker-ink)]">
                  Workflow & Decision Hub
                </h3>
              </div>
              <span className="text-[12px] text-[var(--tracker-ink-muted)]">
                Status: <strong className="text-[var(--tracker-ink)]">{leave.status || "Pending"}</strong>
              </span>
            </div>

            {/* If Pending: Interactive Approval / Rejection Box */}
            {leave.status === "Pending" ? (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[12px] font-semibold text-[var(--tracker-ink)] block mb-1">
                    Manager Remarks / Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={managerComment}
                    onChange={(e) => {
                      setManagerComment(e.target.value);
                      if (commentError) setCommentError("");
                    }}
                    placeholder="Enter approval remarks or reason for rejection (min 5 characters required for audit trail)..."
                    className="w-full px-3 py-2.5 rounded-[var(--tracker-radius-md)] text-[13px] bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] outline-none focus:border-[var(--brand-solid)] focus:ring-2 focus:ring-[var(--brand-solid)]/15 transition-all resize-none"
                  />
                  {commentError ? (
                    <p className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {commentError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--tracker-ink-muted)] mt-1">
                      Minimum 5 characters required. Comments are permanently logged in the audit ledger.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-[var(--tracker-radius-md)] text-[13px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {submitting ? "Processing..." : "Reject Request"}
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-[var(--tracker-radius-md)] text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? "Processing..." : "Approve Request"}
                  </button>
                </div>
              </div>
            ) : (
              /* If Decided: Decision Outcome Display */
              <div
                className={`p-4 rounded-[var(--tracker-radius-md)] border ${
                  leave.status === "Approved"
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300"
                    : "bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-300"
                } space-y-2`}
              >
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    {leave.status === "Approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    )}
                    Request {leave.status}
                  </span>
                  <span className="text-[11px] opacity-80 font-normal">
                    {formatDateTime(leave.approvedAt || leave.rejectedAt || leave.updatedAt)}
                  </span>
                </div>

                <div className="text-[12px] opacity-90">
                  <span className="font-medium">Recorded Manager Remarks:</span>
                  <p className="mt-1 p-2.5 rounded bg-[var(--tracker-surface)] border border-[var(--tracker-border)] text-[var(--tracker-ink)] italic">
                    &ldquo;{leave.managerComments || leave.approverComment || "No remarks recorded."}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Approval Chain / Multi-Tier Steps */}
            {leave.approvals && leave.approvals.length > 0 && (
              <div className="pt-3 border-t border-[var(--tracker-border)] space-y-2.5">
                <span className="text-[12px] font-semibold text-[var(--tracker-ink-muted)] block">
                  Approval Hierarchy Steps
                </span>
                <div className="space-y-2">
                  {leave.approvals.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] text-[12px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-[var(--tracker-surface-2)] flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-[var(--tracker-ink)]">
                          {step.approverId?.basicInfo
                            ? `${step.approverId.basicInfo.firstName} ${step.approverId.basicInfo.lastName}`
                            : step.approverType || `Tier ${idx + 1} Approver`}
                        </span>
                      </div>
                      <span
                        className={`font-semibold text-[11px] ${
                          step.status === "Approved"
                            ? "text-emerald-600"
                            : step.status === "Rejected"
                            ? "text-rose-600"
                            : "text-amber-600"
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            RIGHT COLUMN: CONTEXT, BALANCES & TEAM OVERLAP (5 cols)
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          
          {/* Card 3: Employee Leave Balances */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <PieChart className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  Leave Balance Quota
                </h3>
              </div>
              <span className="text-[11px] text-[var(--tracker-ink-muted)]">Current Year</span>
            </div>

            <div className="space-y-2.5">
              {leaveTypes.length > 0 ? (
                leaveTypes.slice(0, 4).map((lt) => {
                  // match against employee leaveStatus
                  const statusObj = (employee?.leaveStatus || []).find(
                    (s) => (s.leaveType?._id || s.leaveType)?.toString() === lt._id.toString()
                  );
                  const available = statusObj?.available ?? lt.available ?? lt.policyMaxPerYear ?? lt.quota ?? 12;
                  const used = statusObj?.usedThisYear ?? lt.usedThisYear ?? 0;
                  const total = lt.policyMaxPerYear ?? lt.quota ?? (available + used);
                  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

                  return (
                    <div
                      key={lt._id}
                      className="p-2.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-[var(--tracker-ink)]">
                          {lt.name}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--tracker-ink-muted)]">
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {available}
                          </strong>{" "}
                          avail / {total} total
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--tracker-surface-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--brand-solid)] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[12px] text-[var(--tracker-ink-muted)] text-center py-2">
                  No leave quotas configured for this role.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Team Overlap & Capacity Card */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <Users2 className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  Department Capacity Overlap
                </h3>
              </div>
              <span className="text-[11px] text-[var(--tracker-ink-muted)]">
                {overlappingLeaves.length} conflict(s)
              </span>
            </div>

            {overlappingLeaves.length === 0 ? (
              <div className="p-3 rounded-[var(--tracker-radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2 text-[12px]">
                <CalendarCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Full Department Capacity</span>
                  <span className="text-[11px] opacity-90">
                    No other team members have pending or approved leaves in this date window.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-2.5 rounded-[var(--tracker-radius-md)] bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-[11px] font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>
                    {overlappingLeaves.length} peer(s) are away during these overlapping dates.
                  </span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {overlappingLeaves.map((peerLeave) => {
                    const peerName =
                      peerLeave.employeeId?.basicInfo
                        ? `${peerLeave.employeeId.basicInfo.firstName} ${peerLeave.employeeId.basicInfo.lastName}`
                        : peerLeave.employeeName || "Team Member";
                    return (
                      <div
                        key={peerLeave._id}
                        className="flex items-center justify-between p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)] text-[12px]"
                      >
                        <span className="font-medium text-[var(--tracker-ink)] truncate max-w-[140px]">
                          {peerName}
                        </span>
                        <span className="text-[11px] text-[var(--tracker-ink-muted)]">
                          {formatDate(peerLeave.startDate)} - {formatDate(peerLeave.endDate)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Recent Leave History */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  Employee Leave History
                </h3>
              </div>
              <span className="text-[11px] text-[var(--tracker-ink-muted)]">Recent 5</span>
            </div>

            {recentLeaves.length === 0 ? (
              <div className="text-[12px] text-[var(--tracker-ink-muted)] text-center py-2">
                No past leave history recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeaves.map((pastLeave) => (
                  <div
                    key={pastLeave._id}
                    className="flex items-center justify-between p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] text-[12px]"
                  >
                    <div>
                      <span className="font-medium text-[var(--tracker-ink)] block">
                        {pastLeave.leaveTypeId?.name || pastLeave.leaveName || "Leave"} (
                        {pastLeave.totalDays}d)
                      </span>
                      <span className="text-[11px] text-[var(--tracker-ink-muted)]">
                        {formatDate(pastLeave.startDate)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        pastLeave.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : pastLeave.status === "Rejected"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {pastLeave.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
