import { useEffect, useState } from "react";
import { LeaveService } from "@services";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";
import { Calendar, User, Clock, FileText, CheckCircle2, XCircle } from "lucide-react";

const LeaveDetailModal = ({ id, onApprove, onReject, onClose }) => {
  const [data, setData] = useState(null);
  const [managerComment, setManagerComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await LeaveService.getLeaveById(id);
        setData(res);
      } catch (err) {
        console.error("Failed to load leave details:", err);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleApprove = async () => {
    if (!managerComment || managerComment.trim().length < 5) {
      toast.error("Please provide manager comments (at least 5 characters) to approve.");
      return;
    }
    setSubmitting(true);
    const payload = {
      status: "Approved",
      managerComments: managerComment.trim(),
      approverComment: managerComment.trim(),
      managerId: user?.id,
    };
    try {
      await LeaveService.updateLeave(id, payload);
      toast.success("Leave request approved successfully!");
      if (onApprove) onApprove();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to approve leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!managerComment || managerComment.trim().length < 5) {
      toast.error("Please provide a reason/comment (at least 5 characters) for rejection.");
      return;
    }
    setSubmitting(true);
    const payload = {
      status: "Rejected",
      managerComments: managerComment.trim(),
      approverComment: managerComment.trim(),
      managerId: user?.id,
    };
    try {
      await LeaveService.updateLeave(id, payload);
      toast.success("Leave request rejected.");
      if (onReject) onReject();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reject leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const leave = data?.data || {};

  return (
    <div className="space-y-4 p-5 max-w-lg mx-auto bg-[var(--tracker-surface)] text-[var(--tracker-ink)] rounded-[var(--tracker-radius-lg)]">
      <div className="flex items-center justify-between border-b border-[var(--tracker-border)] pb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--tracker-ink)]">
            Leave Request Details
          </h2>
          <p className="text-[12px] text-[var(--tracker-ink-muted)]">
            Review entitlement and approve or reject request
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
          leave.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
          leave.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
          'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        }`}>
          {leave.status || 'Pending'}
        </span>
      </div>

      <div className="rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)]/40 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Employee</span>
            <span className="font-medium text-[var(--tracker-ink)] flex items-center gap-1.5 mt-0.5">
              <User className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
              {leave.employeeName || "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Leave Type</span>
            <span className="font-medium text-[var(--tracker-ink)] flex items-center gap-1.5 mt-0.5">
              <FileText className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
              {leave.leaveName || leave.leaveTypeId?.name || "Leave"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Date Range</span>
            <span className="font-medium text-[var(--tracker-ink)] flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
              {leave.startDate ? new Date(leave.startDate).toLocaleDateString("en-GB") : "—"}
              {" → "}
              {leave.endDate ? new Date(leave.endDate).toLocaleDateString("en-GB") : "—"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Duration</span>
            <span className="font-medium text-[var(--tracker-ink)] flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
              {leave.totalDays ? `${leave.totalDays} day(s)` : "—"}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--tracker-border)]/60">
          <span className="text-[11px] text-[var(--tracker-ink-muted)] block mb-1">Employee Reason</span>
          <p className="p-2.5 rounded-[var(--tracker-radius-sm)] bg-[var(--tracker-surface)] border border-[var(--tracker-border)] text-[12px] leading-relaxed text-[var(--tracker-ink)]">
            {leave.reason || "No reason specified"}
          </p>
        </div>
      </div>

      {leave.status === 'Pending' && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-[var(--tracker-ink)] block">
            Manager Remarks <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={managerComment}
            onChange={(e) => setManagerComment(e.target.value)}
            placeholder="Add approval or rejection remarks (min 5 chars)..."
            className="w-full px-3 py-2 rounded-[var(--tracker-radius-md)] text-[12px] bg-[var(--tracker-surface)] border border-[var(--tracker-border)] text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] outline-none focus:border-[var(--brand-solid)] focus:ring-2 focus:ring-[var(--brand-solid)]/15 transition-all resize-none"
          />
        </div>
      )}

      {leave.status === 'Pending' ? (
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-[var(--tracker-radius-md)] text-[13px] font-medium border border-[var(--tracker-border)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="px-4 py-2 rounded-[var(--tracker-radius-md)] text-[13px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="px-4 py-2 rounded-[var(--tracker-radius-md)] text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--tracker-radius-md)] text-[13px] font-medium bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaveDetailModal;
