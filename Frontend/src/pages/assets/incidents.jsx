import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";

const Incidents = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Workflow action state
  const [actioningIncidentId, setActioningIncidentId] = useState(null);
  const [actionType, setActionType] = useState(""); // "Investigate", "Approve", "Reject"
  const [approverNotes, setApproverNotes] = useState("");
  const [recoveryAmountVal, setRecoveryAmountVal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, [user]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/assets_incidents", {
        limit: 1000,
        populateFields: {
          assetId: "name,assetId,serialNumber,make,model",
          employeeId: "basicInfo.firstName,basicInfo.lastName,professionalInfo.empId",
          managerId: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      // Sort by creation date descending
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setIncidents(sorted);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast.error("Failed to load reported incidents.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (incident, type) => {
    setActioningIncidentId(incident._id);
    setActionType(type);
    setApproverNotes("");
    setRecoveryAmountVal(incident.estimatedRepairCost || 0);
    setModalOpen(true);
  };

  const handleActionWorkflow = async (e) => {
    e.preventDefault();
    setSubmittingWorkflow(true);

    let payload = { notes: approverNotes };

    if (actionType === "Investigate") {
      payload.status = "Under Investigation";
    } else if (actionType === "Approve") {
      payload.status = "Approved";
      payload.recoveryAmount = Number(recoveryAmountVal);
    } else if (actionType === "Reject") {
      payload.status = "Rejected";
    }

    try {
      await axiosInstance.put(`/populate/update/assets_incidents/${actioningIncidentId}`, payload);
      toast.success(`Incident status updated to ${payload.status}`);
      fetchIncidents();
      setModalOpen(false);
    } catch (error) {
      console.error("Error updating incident status:", error);
      toast.error(error.response?.data?.message || "Failed to update incident.");
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Reported": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "Under Investigation": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "Approved": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Rejected": return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      case "Closed": return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
      default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Asset Incidents Log</h1>
        <p className="text-sm text-ink-muted mt-1">Track and manage asset damages, loss reports, and salary recoveries.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Incidents Reported</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Damages, lost items, and theft logs will show up here.</p>
        </div>
      ) : (
        <div className="bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.01]">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported By</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type / Date</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Estimated Cost</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Recovery Amount</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {incidents.map((incident) => {
                  const asset = incident.assetId || {};
                  const emp = incident.employeeId || {};
                  const isReported = incident.status === "Reported";
                  const isInvestigating = incident.status === "Under Investigation";

                  // Check if logged in user is the current reviewer
                  const isCurrentReviewer = incident.managerId?._id === user?.id;

                  return (
                    <tr key={incident._id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005] transition-colors">
                      <td className="px-5 py-4 text-xs">
                        <div className="font-bold text-gray-900 dark:text-white">{asset.name || "—"}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{asset.assetId} · SN: {asset.serialNumber || "N/A"}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {emp.basicInfo ? `${emp.basicInfo.firstName} ${emp.basicInfo.lastName}` : "—"}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{emp.professionalInfo?.empId}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-semibold text-gray-800 dark:text-gray-250">{incident.incidentType}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(incident.incidentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-right font-medium text-gray-900 dark:text-white">
                        ₹{(incident.estimatedRepairCost || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-xs text-right">
                        {incident.recoveryApproved ? (
                          <div className="font-bold text-emerald-600 dark:text-emerald-455">
                            ₹{(incident.recoveryAmount || 0).toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <div className="text-gray-400">Pending Approval</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-right whitespace-nowrap">
                        {isCurrentReviewer && (isReported || isInvestigating) ? (
                          <div className="space-x-1.5 inline-flex">
                            {isReported && (
                              <button
                                onClick={() => handleOpenActionModal(incident, "Investigate")}
                                className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded transition-colors"
                              >
                                Investigate
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenActionModal(incident, "Approve")}
                              className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded transition-colors"
                            >
                              Approve Recovery
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(incident, "Reject")}
                              className="px-2.5 py-1 bg-red-650 text-white hover:bg-red-700 font-bold rounded transition-colors"
                            >
                              Dismiss
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

      {/* Action modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {actionType} Incident Report
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleActionWorkflow} className="p-5 space-y-4">
              {actionType === "Approve" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Salary Recovery Amount (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={recoveryAmountVal}
                    onChange={(e) => setRecoveryAmountVal(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Specify how much should be recovered from employee salary.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Resolution / Investigation Remarks
                </label>
                <textarea
                  required
                  rows={3}
                  value={approverNotes}
                  onChange={(e) => setApproverNotes(e.target.value)}
                  placeholder="Input internal notes or findings..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWorkflow}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-md transition-colors ${actionType === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" :
                      actionType === "Investigate" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-650 hover:bg-red-700"
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

export default Incidents;
