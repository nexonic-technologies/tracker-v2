import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authProvider.jsx";
import useGenericAPI from "../../components/useGenericAPI";
import {
  ChevronLeft, Check, X, Calendar, MapPin, User, Clock, AlertCircle, FileText
} from "lucide-react";

const fmt12 = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtHM = (hrs) => {
  if (!hrs && hrs !== 0) return "—";
  const h = Math.floor(hrs);
  const m = Math.floor((hrs - h) * 60);
  return h === 0 && m === 0 ? "—" : `${h}h ${m}m`;
};

export default function AttendanceApprovalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { readDetailed, update, loading: apiLoading } = useGenericAPI();

  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      setError(null);
      const res = await readDetailed("attendances", { id });
      if (res?.data) {
        setAttendance(res.data);
      } else {
        setError("Attendance request not found.");
      }
    } catch (err) {
      setError("Failed to load attendance request details.");
    } finally {
      setLoading(false);
    }
  }, [id, readDetailed]);

  useEffect(() => {
    if (id) {
      fetchAttendance();
    }
  }, [id, fetchAttendance]);

  const handleAction = async (approve) => {
    if (!attendance) return;
    setActionBusy(true);
    try {
      const targetStatus = approve ? (attendance.request || "Present") : "Absent";
      const message = approve ? "Attendance request approved" : "Attendance request rejected";
      
      await update("attendances", attendance._id, {
        status: targetStatus
      }, message);
      
      // Reload request details to show updated status
      await fetchAttendance();
    } catch (err) {
      // Error toast is handled by useGenericAPI
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh] bg-canvas" data-module="hr">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[var(--module-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-muted">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !attendance) {
    return (
      <div className="lmx-content py-8" data-module="hr">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors mb-6 min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="p-6 bg-surface border border-hairline rounded-tracker-card flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
          <AlertCircle className="text-tracker-danger" size={48} />
          <div>
            <h2 className="text-lg font-bold text-ink">Error Loading Request</h2>
            <p className="text-sm text-ink-muted mt-1">{error || "The attendance record could not be loaded."}</p>
          </div>
          <button
            onClick={() => navigate("/Attendance/pending-approvals")}
            className="tracker-btn-accent min-h-[40px] cursor-pointer mt-2"
          >
            Go to Pending Approvals
          </button>
        </div>
      </div>
    );
  }

  const isPending = attendance.status === "Pending";
  const dateStr = new Date(attendance.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="lmx-content py-6" data-module="hr">
      {/* Back navigation */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={14} /> Back
        </button>
      </div>

      {/* Main card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="tracker-card p-6 bg-surface">
            {/* Title & Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline-soft pb-4 mb-6">
              <div>
                <span className="lmx-page-eyebrow">Attendance Request Review</span>
                <h1 className="text-xl font-bold text-ink mt-1">Review Request</h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                attendance.status === "Pending"
                  ? "bg-tracker-warning-light text-tracker-warning"
                  : attendance.status === "Present" || attendance.status === "Work From Home"
                  ? "bg-tracker-success-light text-tracker-success"
                  : "bg-tracker-danger-light text-tracker-danger"
              }`}>
                {attendance.status}
              </span>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Detail */}
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Employee</h3>
                  <p className="text-base font-bold text-ink mt-0.5">{attendance.employeeName || "Unknown Employee"}</p>
                  {attendance.employee?.professionalInfo?.empId && (
                    <p className="text-xs text-ink-muted mt-0.5">ID: {attendance.employee.professionalInfo.empId}</p>
                  )}
                  {attendance.employee?.professionalInfo?.designation?.name && (
                    <p className="text-xs text-ink-muted mt-0.5">{attendance.employee.professionalInfo.designation.name}</p>
                  )}
                </div>
              </div>

              {/* Date Detail */}
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Request Date</h3>
                  <p className="text-base font-bold text-ink mt-0.5">{dateStr}</p>
                </div>
              </div>

              {/* Punch times */}
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Punch Timeline</h3>
                  <div className="space-y-1 mt-1 text-sm text-ink">
                    <p><span className="font-medium text-ink-muted">Check-In:</span> {fmt12(attendance.checkIn)}</p>
                    <p><span className="font-medium text-ink-muted">Check-Out:</span> {fmt12(attendance.checkOut)}</p>
                    <p><span className="font-medium text-ink-muted">Work Hours:</span> {fmtHM(attendance.workHours)}</p>
                    {attendance.overtimeHours > 0 && (
                      <p className="flex items-center gap-1.5">
                        <span className="font-medium text-ink-muted">Overtime:</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          ⏱ {fmtHM(attendance.overtimeHours)}
                        </span>
                      </p>
                    )}
                  </div>
                  {/* Punch-by-punch breakdown */}
                  {attendance.punches && attendance.punches.length > 1 && (
                    <div className="mt-3 pt-2 border-t border-hairline-soft">
                      <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Punch Breakdown</p>
                      <div className="space-y-1.5">
                        {attendance.punches.map((p, i) => {
                          const dur = p.checkIn && p.checkOut
                            ? (new Date(p.checkOut) - new Date(p.checkIn)) / 3600000
                            : null;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs bg-surface-1 rounded-[6px] px-2.5 py-1.5">
                              <span className="text-ink-tertiary font-medium w-[18px]">#{i+1}</span>
                              <span className="text-ink">{fmt12(p.checkIn)}</span>
                              <span className="text-ink-tertiary">→</span>
                              <span className="text-ink">{p.checkOut ? fmt12(p.checkOut) : 'Active'}</span>
                              {dur !== null && (
                                <span className="ml-auto text-ink-subtle font-medium">{fmtHM(dur)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Punch Location</h3>
                  {attendance.location?.latitude && attendance.location?.longitude ? (
                    <div className="mt-1">
                      <p className="text-sm text-ink">{attendance.location.latitude.toFixed(6)}, {attendance.location.longitude.toFixed(6)}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${attendance.location.latitude},${attendance.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-[var(--module-accent)] hover:underline mt-1 font-semibold"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted mt-1">No location data captured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Employee Request Note */}
            {attendance.request && (
              <div className="mt-6 pt-5 border-t border-hairline-soft bg-canvas-muted p-4 rounded-tracker-md">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> Employee Requested Action
                </h3>
                <p className="text-sm text-ink">
                  Mark attendance as <span className="font-bold text-[var(--module-accent)]">"{attendance.request}"</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action card */}
        <div>
          <div className="tracker-card-plain p-6 bg-surface space-y-6">
            <h2 className="text-lg font-bold text-ink border-b border-hairline-soft pb-3">Approval Action Center</h2>
            
            {isPending ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-muted leading-relaxed">
                  Review the attendance logs above carefully before approving or rejecting this request.
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => handleAction(true)}
                    disabled={actionBusy}
                    className="tracker-btn-accent w-full min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:brightness-105 transition-all font-semibold disabled:opacity-50"
                  >
                    <Check size={18} /> Approve to "{attendance.request || "Present"}"
                  </button>
                  <button
                    onClick={() => handleAction(false)}
                    disabled={actionBusy}
                    className="tracker-btn-secondary w-full min-h-[44px] flex items-center justify-center gap-2 text-tracker-danger border-tracker-border hover:bg-tracker-danger-light/10 cursor-pointer transition-all font-semibold disabled:opacity-50"
                  >
                    <X size={18} /> Reject (Mark Absent)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  attendance.status === "Present" || attendance.status === "Work From Home"
                    ? "bg-tracker-success-light text-tracker-success"
                    : "bg-tracker-danger-light text-tracker-danger"
                }`}>
                  {attendance.status === "Present" || attendance.status === "Work From Home" ? <Check size={24} /> : <X size={24} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Already Processed</h3>
                  <p className="text-xs text-ink-muted mt-1">
                    This request was resolved to status <span className="font-semibold text-ink">"{attendance.status}"</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
