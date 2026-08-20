import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import {
  ChevronLeft, Check, X, Calendar, User, Building2, AlertCircle, FileText, CheckCircle2
} from "lucide-react";

export default function WfhApprovalPage() {
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
      const res = await readDetailed("wfh_requests", {
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
        setError("WFH request record not found.");
      }
    } catch (err) {
      setError("Failed to load WFH request details.");
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
      const successMsg = approve ? "WFH request approved successfully!" : "WFH request rejected.";
      await update("wfh_requests", data._id, {
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
          <p className="text-sm text-ink-muted">Loading WFH request details...</p>
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
            <p className="text-sm text-ink-muted mt-1">{error || "The WFH request could not be loaded."}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPending = data.status === "Pending" || data.status === "Pending Approval";
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const startDateStr = data.startDate ? new Date(data.startDate).toLocaleDateString("en-IN", dateOptions) : "—";
  const endDateStr = data.endDate ? new Date(data.endDate).toLocaleDateString("en-IN", dateOptions) : "—";

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
                <span className="lmx-page-eyebrow">Work From Home Request Review</span>
                <h1 className="text-xl font-bold text-ink mt-1">Review WFH Application</h1>
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
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Department</h3>
                  <p className="text-base font-bold text-ink mt-0.5">{data.departmentId?.name || "General"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                <div className="lmx-icon-tile mt-0.5">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">WFH Duration</h3>
                  <p className="text-base font-bold text-ink mt-0.5">
                    {startDateStr} — {endDateStr}
                  </p>
                </div>
              </div>
            </div>

            {(data.reason || data.notes) && (
              <div className="mt-6 pt-5 border-t border-hairline-soft bg-canvas-muted p-4 rounded-tracker-md">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> Reason for WFH
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
                  Review the requested work from home duration before approving or rejecting this request.
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
                    <Check size={18} /> Approve WFH Request
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
