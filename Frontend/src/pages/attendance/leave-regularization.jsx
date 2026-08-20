import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import FormRenderer from "../../components/Common/FormRenderer";
import { leaveFormFields, leaveSubmitButton } from "../../constants/leaveForm";
import {
  regularizationFormFields,
  regularizationSubmitButton,
} from "../../constants/regularizationForm";
import { wfhFormFields, wfhSubmitButton } from "../../constants/wfhForm";
import { compOffFormFields, compOffSubmitButton } from "../../constants/compOffForm";
import useGenericAPI from "../../components/useGenericAPI";
import { useAuth } from "../../context/authProvider";
import toast, { Toaster } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Home,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  PieChart,
  History,
  FileText,
  User,
  Building2,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Clock3,
  CalendarCheck,
  Sparkles
} from "lucide-react";

const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const LeaveAndRegularization = ({ onClose, onSuccess, onFailed, defaultType = "" }) => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const [formType, setFormType] = useState(defaultType || typeParam || "leave");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { read, create } = useGenericAPI();

  // Employee profile and context
  const [userData, setUserData] = useState(null);
  const [entitledLeaveTypes, setEntitledLeaveTypes] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);

  // Form states
  const [liveForm, setLiveForm] = useState({});
  const [availableDays, setAvailableDays] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Regularization issue states
  const [attendanceIssues, setAttendanceIssues] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Safe navigation back
  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/attendance/leaves");
    }
  };

  // 1. Fetch Logged-in Employee Profile & Policy Entitlements
  const fetchUserData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await read("employees", {
        id: user.id,
        populateFields: {
          "professionalInfo.department": "name,leavePolicy",
          "professionalInfo.designation": "title,leavePolicy",
          "professionalInfo.role": "name",
          "professionalInfo.reportingManager": "basicInfo.firstName,basicInfo.lastName,authInfo.workEmail",
          "leaveStatus.leaveType": "name,code,color,quota",
        },
      });

      const emp = res?.data;
      setUserData(emp);

      if (emp) {
        const deptId = emp.professionalInfo?.department?._id || emp.professionalInfo?.department;
        const desigId = emp.professionalInfo?.designation?._id || emp.professionalInfo?.designation;
        const roleId = emp.professionalInfo?.role?._id || emp.professionalInfo?.role;

        // Fetch active policy scoped to this employee
        const [policiesRes, allTypesRes] = await Promise.all([
          read("leave_policies", {
            filter: {
              isActive: true,
              status: "Active",
              $or: [
                ...(deptId ? [{ applicableDepartments: deptId }] : []),
                ...(desigId ? [{ applicableDesignations: desigId }] : []),
                ...(roleId ? [{ applicableRoles: roleId }] : []),
              ],
            },
            populateFields: { "leaves.leaveType": "name,code,color,quota" },
            limit: 10,
          }),
          read("leave_types", { limit: 50 }),
        ]);

        const matchedPolicies = policiesRes?.data || [];
        let resolved = [];

        if (matchedPolicies.length > 0) {
          const policyMap = new Map();
          matchedPolicies.forEach((p) => {
            (p.leaves || []).forEach((item) => {
              if (item.leaveType) {
                const lt =
                  typeof item.leaveType === "object"
                    ? item.leaveType
                    : { _id: item.leaveType };
                policyMap.set(lt._id.toString(), {
                  ...lt,
                  maxDaysPerYear: item.maxDaysPerYear,
                  maxDaysPerMonth: item.maxDaysPerMonth,
                  carryForward: item.carryForward,
                });
              }
            });
          });
          resolved = Array.from(policyMap.values());
        }

        if (emp.leaveStatus && emp.leaveStatus.length > 0) {
          const empTypes = emp.leaveStatus
            .filter((s) => s.leaveType)
            .map((s) => ({
              ...(typeof s.leaveType === "object"
                ? s.leaveType
                : { _id: s.leaveType }),
              available: s.available,
              usedThisYear: s.usedThisYear,
            }));

          if (resolved.length === 0) {
            resolved = empTypes;
          } else {
            resolved = resolved.map((rt) => {
              const match = empTypes.find(
                (et) => et._id?.toString() === rt._id?.toString()
              );
              return match ? { ...rt, ...match } : rt;
            });
          }
        }

        if (resolved.length === 0) {
          resolved = allTypesRes?.data || [];
        }

        setEntitledLeaveTypes(resolved);
      }
    } catch (error) {
      console.error("Failed to load user data and leave policies:", error);
    }
  }, [user?.id, read]);

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  // 2. Fetch Recent Requests across all types
  const fetchRecentHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [leavesRes, regRes, wfhRes, compRes] = await Promise.all([
        read("leaves", {
          filter: { employeeId: user.id },
          sort: { createdAt: -1 },
          limit: 3,
          populateFields: { leaveTypeId: "name" },
        }),
        read("regularizations", {
          filter: {
            $or: [{ employeeId: user.id }, { employee: user.id }],
          },
          sort: { createdAt: -1 },
          limit: 2,
        }),
        read("wfh_requests", {
          filter: { employeeId: user.id },
          sort: { createdAt: -1 },
          limit: 2,
        }),
        read("comp_off_requests", {
          filter: { employeeId: user.id },
          sort: { createdAt: -1 },
          limit: 2,
        }),
      ]);

      const combined = [
        ...(leavesRes?.data || []).map((i) => ({
          id: i._id,
          type: "Leave",
          title: i.leaveTypeId?.name || i.leaveName || "Leave",
          dates: `${new Date(i.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(i.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          days: `${i.totalDays || 1}d`,
          status: i.status || "Pending",
          createdAt: i.createdAt,
        })),
        ...(regRes?.data || []).map((i) => ({
          id: i._id,
          type: "Regularization",
          title: "Attendance Regularization",
          dates: i.requestDate ? new Date(i.requestDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          days: "Time fix",
          status: i.status || "Pending",
          createdAt: i.createdAt,
        })),
        ...(wfhRes?.data || []).map((i) => ({
          id: i._id,
          type: "WFH",
          title: "Work From Home",
          dates: i.startDate ? new Date(i.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          days: `${i.totalDays || 1}d`,
          status: i.status || "Pending",
          createdAt: i.createdAt,
        })),
        ...(compRes?.data || []).map((i) => ({
          id: i._id,
          type: "Comp-Off",
          title: "Compensatory Off",
          dates: i.workedDate ? new Date(i.workedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
          days: `${i.days || 1}d`,
          status: i.status || "Pending",
          createdAt: i.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

      setRecentRequests(combined);
    } catch (err) {
      console.error("Failed to load recent requests history:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRecentHistory();
  }, [user?.id]);

  // 3. Fetch Attendance Discrepancies and Map Existing Regularizations
  const fetchAttendanceIssues = useCallback(async () => {
    if (!user?.id) return;
    setLoadingIssues(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(1); // 1st of current month

      const startLocalDate = getLocalDateString(startDate);
      const endLocalDate = getLocalDateString(endDate);

      const [res, regRes] = await Promise.all([
        read("attendances", {
          filter: {
            employee: user.id,
            date: {
              $gte: `${startLocalDate}T00:00:00.000Z`,
              $lte: `${endLocalDate}T23:59:59.999Z`,
            },
          },
          limit: 100,
          sort: { date: -1 },
        }),
        read("regularizations", {
          filter: {
            $or: [{ employeeId: user.id }, { employee: user.id }],
          },
          limit: 100,
          sort: { createdAt: -1 },
        }),
      ]);

      const regMap = new Map();
      (regRes?.data || []).forEach((r) => {
        const attId = (r.attendanceId?._id || r.attendanceId)?.toString();
        if (attId) regMap.set(attId, r);
      });

      const rawIssues = (res?.data || []).filter((record) => {
        return (
          !record.checkIn ||
          !record.checkOut ||
          record.status === "Absent" ||
          record.status === "Half Day"
        );
      });

      const issues = rawIssues.map((record) => ({
        ...record,
        existingRegularization: regMap.get(record._id.toString()) || null,
      }));

      setAttendanceIssues(issues);

      // Auto-select first actionable/unsubmitted issue, or fallback to first
      if (issues.length > 0) {
        const unsubmitted = issues.find((i) => !i.existingRegularization);
        const target = unsubmitted || issues[0];
        setSelectedDate(target);
        setLiveForm((prev) => ({
          ...prev,
          requestDate: target.date ? target.date.split("T")[0] : "",
          requestedCheckIn: target.checkIn ? String(new Date(target.checkIn).getHours()).padStart(2, "0") + ":" + String(new Date(target.checkIn).getMinutes()).padStart(2, "0") : "09:00",
          requestedCheckOut: target.checkOut ? String(new Date(target.checkOut).getHours()).padStart(2, "0") + ":" + String(new Date(target.checkOut).getMinutes()).padStart(2, "0") : "18:00",
          reason: "",
        }));
      }
    } catch (error) {
      console.error("Failed to load attendance issues:", error);
    } finally {
      setLoadingIssues(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (formType === "regularization" && user?.id) {
      fetchAttendanceIssues();
    }
  }, [formType, user?.id]);

  const getTimeString = (dStr, fallback = "09:00") => {
    if (!dStr) return fallback;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) {
      return dStr.length === 5 ? dStr : fallback;
    }
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Handle Date Selection for Regularization
  const handleDateSelect = (attendanceRecord) => {
    setSelectedDate(attendanceRecord);
    setLiveForm({
      requestDate: attendanceRecord.date ? attendanceRecord.date.split("T")[0] : "",
      requestedCheckIn: getTimeString(attendanceRecord.checkIn, "09:00"),
      requestedCheckOut: getTimeString(attendanceRecord.checkOut, "18:00"),
      reason: "",
    });
  };

  // Monitor form changes from FormRenderer
  const handleFormChange = (updated) => setLiveForm(updated);

  // Dynamic Available Leave Balance Calculation
  useEffect(() => {
    if (formType !== "leave" || !userData) return;
    const rawType = liveForm?.leaveType;
    const leaveTypeId = typeof rawType === "object" ? rawType?._id : rawType;
    if (!leaveTypeId) {
      setAvailableDays(null);
      return;
    }

    const stats = userData.leaveStatus || [];
    const match = stats.find(
      (l) =>
        (l.leaveType?._id || l.leaveType)?.toString() === leaveTypeId.toString()
    );
    const policyType = entitledLeaveTypes.find(
      (lt) => lt._id?.toString() === leaveTypeId.toString()
    );

    const isMonthly = policyType?.maxDaysPerMonth > 0 && (policyType?.maxDaysPerYear === null || policyType?.maxDaysPerYear === undefined);
    const carryForward = Boolean(policyType?.carryForward);

    if (match && typeof match.available === "number") {
      setAvailableDays(`${match.available} ${match.available === 1 ? "Day" : "Days"} Available (Used: ${match.usedThisYear || 0})`);
    } else if (isMonthly) {
      if (!carryForward) {
        setAvailableDays(`${policyType.maxDaysPerMonth} ${policyType.maxDaysPerMonth === 1 ? "Day" : "Days"} Available this Month (Monthly Quota · Non-Cumulative)`);
      } else {
        setAvailableDays(`${policyType.maxDaysPerMonth} ${policyType.maxDaysPerMonth === 1 ? "Day" : "Days"}/Month (Monthly Quota · Cumulative)`);
      }
    } else if (policyType?.maxDaysPerYear) {
      setAvailableDays(`${policyType.maxDaysPerYear} ${policyType.maxDaysPerYear === 1 ? "Day" : "Days"} Available (Annual Allowance)`);
    } else {
      setAvailableDays("Standard Policy Quota");
    }
  }, [liveForm?.leaveType, userData, formType, entitledLeaveTypes]);

  // Auto calculate totalDays for Date Ranges
  useEffect(() => {
    if (formType !== "leave" && formType !== "wfh") return;
    const { startDate, endDate } = liveForm;
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return;

    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    if (liveForm.totalDays !== diff) {
      setLiveForm((prev) => ({ ...prev, totalDays: diff }));
    }
  }, [liveForm.startDate, liveForm.endDate, formType, liveForm.totalDays]);

  // Final Submission Handler
  const handleSubmit = async (data) => {
    if (!userData) return;
    setSubmitting(true);

    try {
      if (formType === "leave") {
        const rawType = data.leaveType;
        const leaveTypeId = typeof rawType === "object" ? rawType?._id : rawType;
        const leaveName = typeof rawType === "object" ? rawType?.name : "";

        const payload = {
          employeeId: userData._id,
          employeeName: `${userData.basicInfo?.firstName || ""} ${userData.basicInfo?.lastName || ""}`.trim(),
          departmentId: userData.professionalInfo?.department?._id || userData.professionalInfo?.department,
          leaveTypeId: leaveTypeId,
          leaveName: leaveName,
          managerId: userData.professionalInfo?.reportingManager?._id || userData.professionalInfo?.reportingManager,
          startDate: data.startDate,
          endDate: data.endDate,
          totalDays: liveForm.totalDays || 1,
          reason: data.reason,
        };

        await create("leaves", payload, "Leave requested successfully!");
        onSuccess?.();
        handleBack();
        return;
      }

      if (formType === "regularization") {
        if (!selectedDate) {
          toast.error("Please select an attendance issue to regularize.");
          setSubmitting(false);
          return;
        }

        const payload = {
          attendanceId: selectedDate._id,
          employee: userData._id,
          requestDate: data.requestDate || selectedDate.date,
          requestedCheckIn: data.requestedCheckIn || "09:00",
          requestedCheckOut: data.requestedCheckOut || "18:00",
          reason: data.reason,
        };

        await create("regularizations", payload, "Regularization requested successfully!");
        onSuccess?.();
        handleBack();
        return;
      }

      if (formType === "wfh") {
        const payload = {
          ...data,
          employeeId: userData._id,
          totalDays: liveForm.totalDays || 1,
        };
        await create("wfh_requests", payload, "WFH requested successfully!");
        onSuccess?.();
        handleBack();
        return;
      }

      if (formType === "compoff") {
        const payload = {
          ...data,
          employeeId: userData._id,
        };
        await create("comp_off_requests", payload, "Comp-Off requested successfully!");
        onSuccess?.();
        handleBack();
        return;
      }
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error(err?.response?.data?.error || "Failed to submit request");
      onFailed?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getIssueBadge = (record) => {
    if (!record.checkIn && !record.checkOut)
      return { label: "No Punches", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" };
    if (!record.checkIn)
      return { label: "Missing In", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
    if (!record.checkOut)
      return { label: "Missing Out", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
    if (record.status === "Absent")
      return { label: "Marked Absent", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" };
    if (record.status === "Half Day")
      return { label: "Half Day", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" };
    return { label: "Discrepancy", color: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30" };
  };

  const fmtTime = (d) =>
    d
      ? new Date(d).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  const reportingManagerName = useMemo(() => {
    const mgr = userData?.professionalInfo?.reportingManager;
    if (mgr?.basicInfo) {
      return `${mgr.basicInfo.firstName || ""} ${mgr.basicInfo.lastName || ""}`.trim() || "Reporting Manager";
    }
    return "Department Head / Manager";
  }, [userData]);

  // Tab definitions
  const tabs = [
    { id: "leave", label: "Leave", icon: Calendar, desc: "Annual, sick, or personal time" },
    {
      id: "regularization",
      label: "Regularize",
      icon: Clock,
      badge: attendanceIssues.length > 0 ? attendanceIssues.length : null,
      desc: "Fix missed punches",
    },
    { id: "wfh", label: "Work From Home", icon: Home, desc: "Remote work days" },
    { id: "compoff", label: "Comp-Off", icon: Briefcase, desc: "Claim earned overtime" },
  ];

  /* ─────────────────────────────────────────────────────────────
      MAIN RENDER
      ───────────────────────────────────────────────────────────── */
  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5 text-[var(--tracker-ink)]">
      <Toaster position="top-right" />

      {/* 1. Header & Navigation Bar */}
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
            <span className="font-semibold text-[var(--tracker-ink)]">
              Application & Regularization Hub
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-[20px] sm:text-[22px] font-bold text-[var(--tracker-ink)] tracking-tight">
              New Application & Attendance Adjustment
            </h1>
          </div>
        </div>

        {/* Dynamic Mode Switcher (Pill Bar) */}
        {!typeParam && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] w-full sm:w-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = formType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFormType(tab.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-[var(--tracker-radius-sm)] text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[var(--tracker-surface)] text-[var(--tracker-ink)] shadow-xs border border-[var(--tracker-border)]"
                      : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)]/50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-[var(--brand-solid)]" : ""}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ═════════════════════════════════════════════════════════════
            LEFT COLUMN: INTERACTIVE FORM & ISSUE RESOLVER (7-8 cols)
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* REGULARIZATION FLOW */}
          {formType === "regularization" && (
            <div className="space-y-4">
              
              {/* Step 1: Discrepancy Selector */}
              <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--brand-solid)]" />
                    <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                      Select Attendance Record to Regularize
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--tracker-ink-muted)]">Current Month</span>
                </div>

                {loadingIssues ? (
                  <div className="flex items-center justify-center py-6 text-[12px] text-[var(--tracker-ink-muted)]">
                    Scanning monthly attendance logs...
                  </div>
                ) : attendanceIssues.length === 0 ? (
                  <div className="p-4 rounded-[var(--tracker-radius-md)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[13px] block">No Attendance Issues Detected</span>
                      <span className="text-[12px] opacity-90">
                        All your check-in and check-out logs for the current calendar period are complete and validated.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attendanceIssues.map((record, idx) => {
                        const date = new Date(record.date);
                        const isSelected = selectedDate?._id === record._id;
                        const badge = getIssueBadge(record);
                        const existingReg = record.existingRegularization;
                        const isPending = existingReg?.status === "Pending";
                        const isApproved = existingReg?.status === "Approved";

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleDateSelect(record)}
                            className={`p-3 rounded-[var(--tracker-radius-md)] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                              isSelected
                                ? "bg-[var(--brand-solid)]/5 border-[var(--brand-solid)] ring-1 ring-[var(--brand-solid)]"
                                : existingReg
                                ? "bg-[var(--tracker-surface-1)]/25 border-[var(--tracker-border)]/70 opacity-95"
                                : "bg-[var(--tracker-surface-1)]/40 border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)]/60"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[13px] font-bold text-[var(--tracker-ink)]">
                                {date.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isPending ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    Under Review
                                  </span>
                                ) : isApproved ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    Regularized
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}
                                  >
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-[var(--tracker-ink-muted)]">
                              <span>Recorded Punches:</span>
                              <span className="font-mono font-medium text-[var(--tracker-ink)]">
                                {fmtTime(record.checkIn)} → {fmtTime(record.checkOut)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Time Correction & Reason Form / Review Card */}
              {selectedDate && (
                <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-[var(--brand-solid)]" />
                      <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                        Time Correction for{" "}
                        {new Date(selectedDate.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </h3>
                    </div>
                    {selectedDate.existingRegularization && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {selectedDate.existingRegularization.status || "Pending"} Review
                      </span>
                    )}
                  </div>

                  {selectedDate.existingRegularization ? (
                    <div className="p-4 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)] space-y-3">
                      <div className="flex items-start gap-2.5 text-[13px] text-[var(--tracker-ink)]">
                        <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Regularization Request Already Submitted</span>
                          <span className="text-[12px] text-[var(--tracker-ink-muted)]">
                            You have already submitted a regularization request for this date. It is currently awaiting review by your manager.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--tracker-border)]/60 text-[12px]">
                        <div className="p-2.5 rounded bg-[var(--tracker-surface)] border border-[var(--tracker-border)]">
                          <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Requested Check-In</span>
                          <span className="font-mono font-semibold text-[var(--tracker-ink)]">
                            {fmtTime(selectedDate.existingRegularization.requestedCheckIn)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--tracker-surface)] border border-[var(--tracker-border)]">
                          <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Requested Check-Out</span>
                          <span className="font-mono font-semibold text-[var(--tracker-ink)]">
                            {fmtTime(selectedDate.existingRegularization.requestedCheckOut)}
                          </span>
                        </div>
                      </div>

                      {selectedDate.existingRegularization.reason && (
                        <div className="text-[12px] pt-1">
                          <span className="text-[11px] text-[var(--tracker-ink-muted)] block mb-0.5">Submitted Reason:</span>
                          <p className="italic text-[var(--tracker-ink)] p-2.5 rounded bg-[var(--tracker-surface)] border border-[var(--tracker-border)]">
                            &ldquo;{selectedDate.existingRegularization.reason}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <FormRenderer
                      fields={regularizationFormFields}
                      data={liveForm}
                      submitButton={regularizationSubmitButton}
                      onSubmit={handleSubmit}
                      onChange={handleFormChange}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* LEAVE FORM */}
          {formType === "leave" && (
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    Submit Leave Application
                  </h3>
                </div>
                <span className="text-[11px] text-[var(--tracker-ink-muted)]">
                  Approver: <strong className="text-[var(--tracker-ink)]">{reportingManagerName}</strong>
                </span>
              </div>

              {!userData ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 border-2 border-[var(--brand-solid)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <FormRenderer
                  fields={leaveFormFields(userData, entitledLeaveTypes).map((f) =>
                    f.name === "availableDays"
                      ? { ...f, externalValue: availableDays }
                      : f
                  )}
                  submitButton={leaveSubmitButton}
                  onSubmit={handleSubmit}
                  onChange={handleFormChange}
                />
              )}
            </div>
          )}

          {/* WORK FROM HOME (WFH) FORM */}
          {formType === "wfh" && (
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    Request Work From Home (WFH)
                  </h3>
                </div>
              </div>

              {!userData ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 border-2 border-[var(--brand-solid)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <FormRenderer
                  fields={wfhFormFields(userData)}
                  submitButton={wfhSubmitButton}
                  onSubmit={handleSubmit}
                  onChange={handleFormChange}
                />
              )}
            </div>
          )}

          {/* COMP-OFF FORM */}
          {formType === "compoff" && (
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    Request Compensatory Off (Comp-Off)
                  </h3>
                </div>
              </div>

              {!userData ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 border-2 border-[var(--brand-solid)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <FormRenderer
                  fields={compOffFormFields(userData)}
                  submitButton={compOffSubmitButton}
                  onSubmit={handleSubmit}
                  onChange={handleFormChange}
                />
              )}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            RIGHT COLUMN: CONTEXT, LIVE QUOTAS & HISTORY (4-5 cols)
            ═════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          
          {/* Card 1: Live Request Context Card */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  Application Summary
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-[var(--brand-solid)] uppercase tracking-wider">
                {formType}
              </span>
            </div>

            <div className="space-y-2 text-[12px]">
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/50">
                <span className="text-[var(--tracker-ink-muted)]">Applicant:</span>
                <span className="font-semibold text-[var(--tracker-ink)]">
                  {userData?.basicInfo ? `${userData.basicInfo.firstName} ${userData.basicInfo.lastName}` : "You"}
                </span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/50">
                <span className="text-[var(--tracker-ink-muted)]">Approver:</span>
                <span className="font-semibold text-[var(--tracker-ink)]">
                  {reportingManagerName}
                </span>
              </div>

              {liveForm.totalDays && (
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/50">
                  <span className="text-[var(--tracker-ink-muted)]">Calculated Duration:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {liveForm.totalDays} Day(s)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Active Policy Quotas */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <PieChart className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  My Leave Balances
                </h3>
              </div>
              <span className="text-[11px] text-[var(--tracker-ink-muted)]">Assigned Quotas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {entitledLeaveTypes.length > 0 ? (
                entitledLeaveTypes.map((lt) => {
                  const statusObj = (userData?.leaveStatus || []).find(
                    (s) => (s.leaveType?._id || s.leaveType)?.toString() === lt._id?.toString()
                  );
                  const isMonthly = lt.maxDaysPerMonth > 0 && (lt.maxDaysPerYear === null || lt.maxDaysPerYear === undefined);
                  const carryForward = Boolean(lt.carryForward);
                  const quota = isMonthly ? lt.maxDaysPerMonth : (lt.maxDaysPerYear || 12);
                  const available = statusObj?.available ?? lt.available ?? quota;
                  const used = isMonthly && !carryForward ? (statusObj?.usedThisMonth ?? 0) : (statusObj?.usedThisYear ?? lt.usedThisYear ?? 0);
                  const total = quota;
                  const unitLabel = isMonthly ? "avail / mo" : `avail / ${total} total`;
                  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

                  return (
                    <div
                      key={lt._id}
                      className="p-2.5 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[12px] gap-1">
                        <span className="font-semibold text-[var(--tracker-ink)] truncate">
                          {lt.name}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--tracker-ink-muted)] whitespace-nowrap">
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {available}
                          </strong>{" "}
                          {unitLabel}
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
                <div className="text-[12px] text-[var(--tracker-ink-muted)] text-center py-2 col-span-full">
                  No active policy quotas mapped.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Recent Submissions History */}
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-[var(--brand-solid)]" />
                <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                  Recent Submissions
                </h3>
              </div>
              <span className="text-[11px] text-[var(--tracker-ink-muted)]">Latest Requests</span>
            </div>

            {recentRequests.length === 0 ? (
              <div className="text-[12px] text-[var(--tracker-ink-muted)] text-center py-2">
                No past applications submitted.
              </div>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 p-2 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface-1)]/40 border border-[var(--tracker-border)] text-[12px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--tracker-ink)] block truncate">
                        {req.title} <span className="font-normal text-[var(--tracker-ink-muted)]">({req.days})</span>
                      </span>
                      <span className="text-[11px] text-[var(--tracker-ink-muted)] block">
                        {req.dates}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                        req.status === "Approved"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : req.status === "Rejected"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {req.status}
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
};

export default LeaveAndRegularization;
