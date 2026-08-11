import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authProvider.jsx";
import useGenericAPI from "../../components/useGenericAPI";
import {
  ChevronLeft, Check, X, Calendar, User, Clock, AlertCircle, FileText, Building2
} from "lucide-react";

export default function DynamicModelPage() {
  const { model: rawModel, id } = useParams();
  const getNormalizedModelName = (name) => {
    if (!name) return "";
    const lower = name.toLowerCase();
    if (lower === "leave" || lower === "leaves") return "leaves";
    if (lower === "wfhrequest" || lower === "wfh_requests") return "wfh_requests";
    if (lower === "regularization" || lower === "regularizations") return "regularizations";
    if (lower === "assetallocation" || lower === "assets_allocations") return "assets_allocations";
    return name;
  };
  const model = getNormalizedModelName(rawModel);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { readDetailed, update, loading: apiLoading } = useGenericAPI();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const fetchRecord = useCallback(async () => {
    try {
      setError(null);
      if (model === "wfh_requests") {
        const res = await readDetailed("wfh_requests", {
          id,
          populateFields: {
            employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
            departmentId: "name",
            managerId: "basicInfo.firstName,basicInfo.lastName"
          }
        });
        if (res?.data) {
          setData(res.data);
        } else {
          setError("WFH request not found.");
        }
      } else if (model === "leaves") {
        const res = await readDetailed("leaves", {
          id,
          populateFields: {
            employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.employeeId",
            departmentId: "name",
            managerId: "basicInfo.firstName,basicInfo.lastName",
            leaveTypeId: "name"
          }
        });
        if (res?.data) {
          setData(res.data);
        } else {
          setError("Leave request not found.");
        }
      } else if (model === "regularizations") {
        const res = await readDetailed("regularizations", {
          id,
          populateFields: {
            employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
            departmentId: "name",
            managerId: "basicInfo.firstName,basicInfo.lastName"
          }
        });
        if (res?.data) {
          setData(res.data);
        } else {
          setError("Regularization request not found.");
        }
      } else if (model === "assets_allocations") {
        const res = await readDetailed("assets_allocations", {
          id,
          populateFields: {
            employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
            departmentId: "name",
            assetId: "name,serialNumber,category,status",
            managerId: "basicInfo.firstName,basicInfo.lastName",
            transferFromEmployee: "basicInfo.firstName,basicInfo.lastName",
            transferToEmployee: "basicInfo.firstName,basicInfo.lastName"
          }
        });
        if (res?.data) {
          setData(res.data);
        } else {
          setError("Asset allocation request not found.");
        }
      } else {
        // Fallback placeholder for other models
        setData({ isPlaceholder: true });
      }
    } catch (err) {
      setError(`Failed to load ${model} record details.`);
    } finally {
      setLoading(false);
    }
  }, [model, id, readDetailed]);

  useEffect(() => {
    if (id && model) {
      fetchRecord();
    }
  }, [id, model, fetchRecord]);

  const handleAction = async (approve) => {
    if (!data || (model !== "wfh_requests" && model !== "leaves" && model !== "regularizations" && model !== "assets_allocations")) return;
    setActionBusy(true);
    try {
      let targetStatus = approve ? "Approved" : "Rejected";
      if (model === "assets_allocations" && approve) {
        targetStatus = "Active";
      }

      let successMsg = "";
      if (model === "leaves") {
        successMsg = approve ? "Leave request approved successfully!" : "Leave request rejected.";
      } else if (model === "wfh_requests") {
        successMsg = approve ? "WFH request approved successfully!" : "WFH request rejected.";
      } else if (model === "regularizations") {
        successMsg = approve ? "Regularization request approved successfully!" : "Regularization request rejected.";
      } else if (model === "assets_allocations") {
        successMsg = approve ? "Asset allocation request approved successfully!" : "Asset allocation request rejected.";
      }

      const updateData = {
        status: targetStatus,
        remarks: comment,
        approverComment: comment,
        managerComments: comment
      };

      await update(model, data._id, updateData, successMsg);

      setComment("");
      await fetchRecord();
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

  // Render placeholder if it's not a wfhrequest
  if (data?.isPlaceholder) {
    return (
      <div className="p-6" data-module="hr">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors mb-6 min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="p-6 bg-surface border border-hairline rounded-tracker-card max-w-xl mx-auto shadow-sm">
          <h1 className="text-2xl font-bold mb-4">Dynamic Model Page</h1>
          <p className="text-sm text-ink-muted mb-2">Model: <code className="bg-canvas px-1.5 py-0.5 rounded text-xs">{model}</code></p>
          <p className="text-sm text-ink-muted mb-4">ID: <code className="bg-canvas px-1.5 py-0.5 rounded text-xs">{id}</code></p>
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300 rounded border border-amber-200/50">
            <p className="text-sm font-semibold">Note: This is a placeholder dynamic route.</p>
            <p className="text-xs mt-1">If you are trying to reach "Role Permissions", ensure the route in your database matches the actual file path (e.g., <code>/settings/RoleAccessPolicy</code>).</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
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
            <p className="text-sm text-ink-muted mt-1">{error || `The ${model} record could not be loaded.`}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPending = data.status === "Pending" || data.status === "Pending Approval";
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: true };

  const startDateStr = data.startDate ? new Date(data.startDate).toLocaleDateString("en-IN", dateOptions) : "";
  const endDateStr = data.endDate ? new Date(data.endDate).toLocaleDateString("en-IN", dateOptions) : "";
  const requestDateStr = data.requestDate ? new Date(data.requestDate).toLocaleDateString("en-IN", dateOptions) : "";
  const allocationDateStr = data.allocationDate ? new Date(data.allocationDate).toLocaleDateString("en-IN", dateOptions) : "";
  const expectedReturnStr = data.expectedReturn ? new Date(data.expectedReturn).toLocaleDateString("en-IN", dateOptions) : "—";

  const originalCheckInStr = data.originalCheckIn ? new Date(data.originalCheckIn).toLocaleTimeString("en-IN", timeOptions) : "—";
  const originalCheckOutStr = data.originalCheckOut ? new Date(data.originalCheckOut).toLocaleTimeString("en-IN", timeOptions) : "—";
  const requestedCheckInStr = data.requestedCheckIn ? new Date(data.requestedCheckIn).toLocaleTimeString("en-IN", timeOptions) : "—";
  const requestedCheckOutStr = data.requestedCheckOut ? new Date(data.requestedCheckOut).toLocaleTimeString("en-IN", timeOptions) : "—";

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
                <span className="lmx-page-eyebrow">
                  {model === "leaves"
                    ? "Leave Request Review"
                    : model === "wfh_requests"
                      ? "WFH Request Review"
                      : model === "regularizations"
                        ? "Regularization Request Review"
                        : "Asset Allocation Review"}
                </span>
                <h1 className="text-xl font-bold text-ink mt-1">
                  {model === "leaves"
                    ? "Review Leave Request"
                    : model === "wfh_requests"
                      ? "Review WFH Request"
                      : model === "regularizations"
                        ? "Review Regularization Request"
                        : "Review Asset Allocation"}
                </h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${data.status === "Pending" || data.status === "Pending Approval"
                ? "bg-tracker-warning-light text-tracker-warning"
                : data.status === "Approved" || data.status === "Active"
                  ? "bg-tracker-success-light text-tracker-success"
                  : "bg-tracker-danger-light text-tracker-danger"
                }`}>
                {data.status}
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
                  <p className="text-base font-bold text-ink mt-0.5">
                    {data.employeeId?.basicInfo
                      ? `${data.employeeId.basicInfo.firstName || ""} ${data.employeeId.basicInfo.lastName || ""}`.trim()
                      : "Unknown Employee"}
                  </p>
                  {(data.employeeId?.professionalInfo?.empId || data.employeeId?.professionalInfo?.employeeId) && (
                    <p className="text-xs text-ink-muted mt-0.5">ID: {data.employeeId.professionalInfo.empId || data.employeeId.professionalInfo.employeeId}</p>
                  )}
                </div>
              </div>

              {/* Department Detail */}
              <div className="flex items-start gap-3">
                <div className="lmx-icon-tile mt-0.5">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Department</h3>
                  <p className="text-base font-bold text-ink mt-0.5">{data.departmentId?.name || "General"}</p>
                </div>
              </div>

              {/* Duration or Request Date Detail */}
              {model !== "regularizations" && model !== "assets_allocations" && (
                <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                  <div className="lmx-icon-tile mt-0.5">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Duration</h3>
                    <p className="text-base font-bold text-ink mt-0.5">
                      {startDateStr} — {endDateStr}
                    </p>
                  </div>
                </div>
              )}
              {model === "regularizations" && (
                <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                  <div className="lmx-icon-tile mt-0.5">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Request Date</h3>
                    <p className="text-base font-bold text-ink mt-0.5">
                      {requestDateStr}
                    </p>
                  </div>
                </div>
              )}

              {/* Leave Type Detail */}
              {model === "leaves" && (
                <div className="flex items-start gap-3">
                  <div className="lmx-icon-tile mt-0.5">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Leave Type</h3>
                    <p className="text-base font-bold text-ink mt-0.5">
                      {data.leaveName || data.leaveTypeId?.name || "Leave"}
                    </p>
                  </div>
                </div>
              )}

              {/* Asset Allocation Details */}
              {model === "assets_allocations" && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="lmx-icon-tile mt-0.5">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Allocation Type</h3>
                      <p className="text-base font-bold text-ink mt-0.5">{data.allocationType || "Allocation"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                    <div className="lmx-icon-tile mt-0.5">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Allocation Period</h3>
                      <p className="text-base font-bold text-ink mt-0.5">
                        {allocationDateStr} {expectedReturnStr ? `— ${expectedReturnStr}` : " (No expected return)"}
                      </p>
                    </div>
                  </div>

                  {/* Asset Details Sub-grid */}
                  <div className="col-span-1 md:col-span-2 mt-4 bg-canvas-muted p-4 rounded-tracker-md border border-hairline space-y-3">
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider border-b border-hairline pb-1.5">Asset Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[11px] font-bold text-ink-subtle uppercase">Asset Name</span>
                        <span className="font-semibold text-ink">{data.assetId?.name || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-ink-subtle uppercase">Serial Number</span>
                        <span className="font-semibold text-ink">{data.assetId?.serialNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-ink-subtle uppercase">Category</span>
                        <span className="font-semibold text-ink">{data.assetId?.category || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-ink-subtle uppercase">Asset Status</span>
                        <span className="font-semibold text-ink capitalize">{data.assetId?.status || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Details Sub-grid if Type is Transfer */}
                  {data.allocationType === "Transfer" && (
                    <div className="col-span-1 md:col-span-2 mt-4 bg-canvas-muted p-4 rounded-tracker-md border border-hairline space-y-3">
                      <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider border-b border-hairline pb-1.5">Transfer Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[11px] font-bold text-ink-subtle uppercase">Transfer From</span>
                          <span className="font-semibold text-ink">
                            {data.transferFromEmployee ? `${data.transferFromEmployee.basicInfo?.firstName || ""} ${data.transferFromEmployee.basicInfo?.lastName || ""}`.trim() : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-ink-subtle uppercase">Transfer To</span>
                          <span className="font-semibold text-ink">
                            {data.transferToEmployee ? `${data.transferToEmployee.basicInfo?.firstName || ""} ${data.transferToEmployee.basicInfo?.lastName || ""}`.trim() : "—"}
                          </span>
                        </div>
                        {data.transferReason && (
                          <div className="col-span-2">
                            <span className="block text-[11px] font-bold text-ink-subtle uppercase">Transfer Reason</span>
                            <span className="text-sm text-ink">{data.transferReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Regularization Times Detail */}
              {model === "regularizations" && (
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-canvas-muted p-4 rounded-tracker-md border border-hairline">
                  <div>
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Original Times</h4>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-ink-subtle">Check-In: </span>
                        <span className="font-semibold text-ink">{originalCheckInStr}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-ink-subtle">Check-Out: </span>
                        <span className="font-semibold text-ink">{originalCheckOutStr}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t md:border-t-0 md:border-l border-hairline pt-3 md:pt-0 md:pl-4">
                    <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock size={12} className="text-accent" /> Requested Times
                    </h4>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-ink-subtle">Check-In: </span>
                        <span className="font-semibold text-ink">{requestedCheckInStr}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-ink-subtle">Check-Out: </span>
                        <span className="font-semibold text-ink">{requestedCheckOutStr}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Employee Request Note */}
            {(data.reason || data.notes) && (
              <div className="mt-6 pt-5 border-t border-hairline-soft bg-canvas-muted p-4 rounded-tracker-md">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} /> Reason for Request / Notes
                </h3>
                <p className="text-sm text-ink whitespace-pre-line leading-relaxed">
                  {data.reason || data.notes}
                </p>
              </div>
            )}

            {/* Approver Comments */}
            {(data.approverComment || data.managerComments || data.remarks) && (
              <div className="mt-4 bg-canvas-muted p-4 rounded-tracker-md border border-hairline">
                <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
                  Approver Comment / Remarks
                </h3>
                <p className="text-sm text-ink">{data.approverComment || data.managerComments || data.remarks}</p>
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
                  Review the {model === "leaves" ? "leave details" : model === "wfh_requests" ? "Work From Home duration" : model === "regularizations" ? "attendance corrections" : "asset allocation details"} and reasons carefully before approving or rejecting this request.
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
                    placeholder="Add approval or rejection comment..."
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => handleAction(true)}
                    disabled={actionBusy}
                    className="tracker-btn-accent w-full min-h-[44px] flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:brightness-105 transition-all font-semibold disabled:opacity-50"
                  >
                    <Check size={18} /> Approve {model === "leaves" ? "Leave" : model === "wfh_requests" ? "WFH" : model === "regularizations" ? "Regularization" : "Asset Allocation"} Request
                  </button>
                  <button
                    onClick={() => handleAction(false)}
                    disabled={actionBusy}
                    className="tracker-btn-secondary w-full min-h-[44px] flex items-center justify-center gap-2 text-tracker-danger border-tracker-border hover:bg-tracker-danger-light/10 cursor-pointer transition-all font-semibold disabled:opacity-50"
                  >
                    <X size={18} /> Reject Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${data.status === "Approved" || data.status === "Active"
                  ? "bg-tracker-success-light text-tracker-success"
                  : "bg-tracker-danger-light text-tracker-danger"
                  }`}>
                  {data.status === "Approved" || data.status === "Active" ? <Check size={24} /> : <X size={24} />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Already Processed</h3>
                  <p className="text-xs text-ink-muted mt-1">
                    This request was resolved to status <span className="font-semibold text-ink">"{data.status}"</span>.
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
