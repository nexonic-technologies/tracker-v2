import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import {
  ChevronLeft, Check, X, Calendar, User, Clock, AlertCircle, FileText, Building2, CheckCircle2
} from "lucide-react";

export default function RegularizationApprovalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { readDetailed, update, loading: apiLoading } = useGenericAPI();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await readDetailed("regularizations", {
        id,
        populateFields: {
          employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId,professionalInfo.department,professionalInfo.designation",
          departmentId: "name",
          managerId: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      if (res?.data) {
        setData(res.data);
      } else {
        setError("Regularization request record not found.");
      }
    } catch (err) {
      setError("Failed to load regularization request details.");
    } finally {
      setLoading(false);
    }
  }, [id, readDetailed]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleAction = async (approve) => {
    if (!data) return;
    setActionBusy(true);
    try {
      const targetStatus = approve ? "Approved" : "Rejected";
      const successMsg = approve ? "Regularization approved successfully!" : "Regularization rejected.";
      await update("regularizations", data._id, {
        status: targetStatus,
        remarks: comment,
        approverComment: comment,
        managerComments: comment
      }, successMsg);
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
      <div className="flex items-center justify-center min-h-[60dvh] bg-canvas" data-module="attendance">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[var(--module-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-muted">Loading regularization details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lmx-content py-8" data-module="attendance">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors mb-6 min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="p-6 bg-surface border border-hairline rounded-tracker-card flex flex-col items-center gap-4 text-center max-w-lg mx-auto shadow-xs">
          <AlertCircle className="text-tracker-danger" size={48} />
          <div>
            <h2 className="text-lg font-bold text-ink">Request Not Found</h2>
            <p className="text-sm text-ink-muted mt-1">{error || "The regularization request could not be loaded."}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPending = data.status === "Pending" || data.status === "Pending Approval";
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };

  const requestDateStr = data.requestDate ? new Date(data.requestDate).toLocaleDateString("en-IN", dateOptions) : "—";
  const originalCheckInStr = data.originalCheckIn ? new Date(data.originalCheckIn).toLocaleTimeString("en-IN", timeOptions) : "—";
  const originalCheckOutStr = data.originalCheckOut ? new Date(data.originalCheckOut).toLocaleTimeString("en-IN", timeOptions) : "—";
  const requestedCheckInStr = data.requestedCheckIn ? new Date(data.requestedCheckIn).toLocaleTimeString("en-IN", timeOptions) : "—";
  const requestedCheckOutStr = data.requestedCheckOut ? new Date(data.requestedCheckOut).toLocaleTimeString("en-IN", timeOptions) : "—";

  return (
    <div className="lmx-content py-6" data-module="attendance">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <span className="text-xs text-ink-subtle">
          Request ID: <code className="font-mono text-ink">{data._id}</code>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="tracker-card p-6 bg-surface space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-hairline-soft pb-4">
              <div>
                <span className="lmx-page-eyebrow">Attendance Regularization Review</span>
                <h1 className="text-xl font-bold text-ink mt-1">Review Regularization Request</h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isPending
                  ? "bg-tracker-warning-light text-tracker-warning"
                  : data.status === "Approved"
                  ? "bg-tracker-success-light text-tracker-success"
                  : "bg-tracker-danger-light text-tracker-danger"
              }`}>
                {data.status || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Employee</h3>
                  <p className="text-base font-bold text-ink mt-0.5">
                    {data.employeeId?.basicInfo
                      ? `${data.employeeId.basicInfo.firstName || ""} ${data.employeeId.basicInfo.lastName || ""}`.trim()
                      : "Assigned Employee"}
                  </p>
                  {data.employeeId?.professionalInfo?.empId && (
                    <p className="text-xs text-ink-muted mt-0.5">Emp ID: {data.employeeId.professionalInfo.empId}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Target Work Date</h3>
                  <p className="text-base font-bold text-ink mt-0.5">{requestDateStr}</p>
                </div>
              </div>

              {/* Time comparison comparison grid */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-canvas-muted p-4 rounded-tracker-md border border-hairline">
                <div>
                  <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Original Recorded Times</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-ink-subtle">Check-In:</span> <span className="font-semibold text-ink">{originalCheckInStr}</span></div>
                    <div><span className="text-ink-subtle">Check-Out:</span> <span className="font-semibold text-ink">{originalCheckOutStr}</span></div>
                  </div>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-hairline pt-3 md:pt-0 md:pl-4">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock size={12} className="text-accent" /> Requested Corrected Times
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-ink-subtle">Check-In:</span> <span className="font-semibold text-ink">{requestedCheckInStr}</span></div>
                    <div><span className="text-ink-subtle">Check-Out:</span> <span className="font-semibold text-ink">{requestedCheckOutStr}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {(data.reason || data.notes) && (
              <div className="mt-6 pt-5 border-t border-hairline-soft bg-canvas-muted p-4 rounded-tracker-md">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> Employee's Reason
                </h3>
                <p className="text-sm text-ink whitespace-pre-line leading-relaxed">{data.reason || data.notes}</p>
              </div>
            )}

            {(data.approverComment || data.managerComments || data.remarks) && (
              <div className="mt-4 bg-canvas-muted p-4 rounded-tracker-md border border-hairline">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                  Approver Remarks
                </h3>
                <p className="text-sm text-ink">{data.approverComment || data.managerComments || data.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Center */}
        <div>
          <div className="tracker-card-plain p-6 bg-surface space-y-6">
            <h2 className="text-lg font-bold text-ink border-b border-hairline-soft pb-3">Approval Action</h2>

            {isPending ? (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted leading-relaxed">
                  Review the requested punch corrections before approving or rejecting this regularization request.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
                    Add Comments
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 text-sm text-ink bg-canvas border border-hairline rounded-tracker-md focus:ring-1 focus:ring-[var(--module-accent)] focus:border-[var(--module-accent)] outline-none transition-shadow"
                    rows="3"
                    placeholder="Enter approval comments..."
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => handleAction(true)}
                    disabled={actionBusy}
                    className="tracker-btn-accent w-full min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-sm font-semibold disabled:opacity-50"
                  >
                    <Check size={18} /> Approve Regularization
                  </button>
                  <button
                    onClick={() => handleAction(false)}
                    disabled={actionBusy}
                    className="tracker-btn-secondary w-full min-h-[44px] flex items-center justify-center gap-2 text-tracker-danger border-tracker-border hover:bg-tracker-danger-light/10 cursor-pointer font-semibold disabled:opacity-50"
                  >
                    <X size={18} /> Reject Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  data.status === "Approved" ? "bg-tracker-success-light text-tracker-success" : "bg-tracker-danger-light text-tracker-danger"
                }`}>
                  {data.status === "Approved" ? <Check size={24} /> : <X size={24} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Already Processed</h3>
                  <p className="text-xs text-ink-muted mt-1">Status: <span className="font-semibold text-ink">"{data.status}"</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
