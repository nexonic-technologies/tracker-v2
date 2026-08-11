import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";

const Allocations = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserLevel, setCurrentUserLevel] = useState(1);

  // Form comments
  const [approverComment, setApproverComment] = useState("");
  const [actioningAllocId, setActioningAllocId] = useState(null);
  const [actionType, setActionType] = useState(""); // "Approve" or "Reject"
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);

  useEffect(() => {
    fetchAllocations();
    fetchUserLevel();
  }, [user]);

  const fetchUserLevel = async () => {
    if (!user?.role) return;
    try {
      const res = await axiosInstance.post(`/populate/read/roles/${user.role}`, {});
      setCurrentUserLevel(res.data?.data?.level || 1);
    } catch (error) {
      console.error("Error fetching user level:", error);
    }
  };

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/assets_allocations", {
        limit: 1000,
        populateFields: {
          assetId: "name,assetId,serialNumber,make,model,condition",
          employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
          managerId: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      // Sort by creation date descending
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllocations(sorted);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast.error("Failed to load asset allocations log.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkflowModal = (id, type) => {
    setActioningAllocId(id);
    setActionType(type);
    setApproverComment("");
    setWorkflowModalOpen(true);
  };

  const handleActionWorkflow = async (e) => {
    e.preventDefault();
    setSubmittingWorkflow(true);

    const targetStatus = actionType === "Approve" ? "Active" : "Rejected";

    try {
      await axiosInstance.put(`/populate/update/assets_allocations/${actioningAllocId}`, {
        status: targetStatus,
        approverComment
      });
      toast.success(`Allocation request ${actionType.toLowerCase()}d successfully`);
      fetchAllocations();
      setWorkflowModalOpen(false);
    } catch (error) {
      console.error("Error executing workflow action:", error);
      toast.error(error.response?.data?.message || "Failed to update allocation request.");
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending Approval": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "Active": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Returned": return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
      case "Transferred": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "Rejected": return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Asset Allocations</h1>
        <p className="text-sm text-ink-muted mt-1">Track history of hardware handovers, returns, and dynamic manager approvals.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
        </div>
      ) : allocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Allocation Logs</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Handovers and return logs will appear here when processed.</p>
        </div>
      ) : (
        <div className="bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.01]">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned To</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Allocated Date</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Reviewer</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {allocations.map((alloc) => {
                  const asset = alloc.assetId || {};
                  const emp = alloc.employeeId || {};
                  const isPending = alloc.status === "Pending Approval";

                  // Check if logged in user is the current assigned approver
                  const isCurrentReviewer = alloc.managerId?._id === user?.id;

                  return (
                    <tr key={alloc._id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-4 text-xs">
                        <div className="font-bold text-gray-900 dark:text-white">{asset.name || "—"}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{asset.assetId} · {asset.serialNumber || "No SN"}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {emp.basicInfo ? `${emp.basicInfo.firstName} ${emp.basicInfo.lastName}` : "—"}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{emp.professionalInfo?.empId}</div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {alloc.allocationType}
                      </td>
                      <td className="px-5 py-4 text-xs text-center text-gray-800 dark:text-gray-200">
                        {new Date(alloc.allocationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4 text-xs text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(alloc.status)}`}>
                          {alloc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {isPending && alloc.managerId
                          ? `${alloc.managerId.basicInfo?.firstName} ${alloc.managerId.basicInfo?.lastName}`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                        {isPending && isCurrentReviewer ? (
                          <div className="space-x-1.5 inline-flex">
                            <button
                              onClick={() => handleOpenWorkflowModal(alloc._id, "Approve")}
                              className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenWorkflowModal(alloc._id, "Reject")}
                              className="px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 font-bold rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-450 dark:text-gray-550 text-[11px] font-medium">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workflow Comment Modal */}
      {workflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {actionType} Allocation Request
              </h3>
              <button onClick={() => setWorkflowModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleActionWorkflow} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Approver Remarks & Comments
                </label>
                <textarea
                  required
                  rows={3}
                  value={approverComment}
                  onChange={(e) => setApproverComment(e.target.value)}
                  placeholder={`Write comments for this ${actionType.toLowerCase()}al...`}
                  className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWorkflowModalOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWorkflow}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-md transition-colors ${actionType === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-650 hover:bg-red-700"
                    }`}
                >
                  {submittingWorkflow ? "Processing..." : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Allocations;
