import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";

const MyAssetsView = ({ employeeId }) => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  // Return Form State
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyAssets();
  }, [employeeId]);

  const fetchMyAssets = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/assets", {
        filter: { currentAllocatedTo: employeeId, status: "Allocated", metaStatus: "active" },
        populateFields: {
          currentAllocationId: "status,allocationType,allocationDate,expectedReturn,notes"
        }
      });

      const mapped = (res.data?.data || []).map(asset => ({
        _id: asset.currentAllocationId?._id || asset.currentAllocationId,
        allocationDate: asset.currentAllocationId?.allocationDate || asset.createdAt,
        allocationType: asset.currentAllocationId?.allocationType || 'Allocation',
        status: asset.currentAllocationId?.status || 'Active',
        notes: asset.currentAllocationId?.notes || '',
        assetId: asset
      }));

      setAllocations(mapped);
    } catch (error) {
      console.error("Error fetching allocated assets:", error);
      toast.error("Failed to load your assets.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReturnModal = (alloc) => {
    setSelectedAlloc(alloc);
    setCondition("Good");
    setNotes("");
    setReturnModalOpen(true);
  };

  const handleCloseReturnModal = () => {
    setSelectedAlloc(null);
    setReturnModalOpen(false);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!selectedAlloc) return;

    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/assets_allocations/${selectedAlloc._id}`, {
        status: "Returned",
        returnedCondition: condition,
        returnNotes: notes
      });
      toast.success("Return request submitted successfully");
      fetchMyAssets();
      handleCloseReturnModal();
    } catch (error) {
      console.error("Error requesting return:", error);
      toast.error(error.response?.data?.message || "Failed to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getConditionColor = (cond) => {
    switch (cond) {
      case "Excellent": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Good": return "bg-teal-500/10 text-teal-600 dark:text-teal-400";
      case "Fair": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "Poor": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "Damaged": return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
      default: return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Currently Allocated Assets</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">All company devices and equipment registered to you.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          {allocations.length} Active Asset{allocations.length !== 1 ? "s" : ""}
        </span>
      </div>

      {allocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-surface dark:bg-surface border border-dashed border-gray-200 dark:border-white/[0.08] rounded-xl text-center">
          <svg className="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Assets Allocated</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">You do not currently have any active allocations. Contact IT if you need a device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((alloc) => {
            const asset = alloc.assetId || {};
            return (
              <div
                key={alloc._id}
                className="bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.06] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                        {asset.make || "General"}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1.5">{asset.name}</h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getConditionColor(asset.condition)}`}>
                      {asset.condition || "Good"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Asset ID:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{asset.assetId}</span>
                    </div>
                    {asset.serialNumber && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Serial Number:</span>
                        <span className="font-mono text-gray-800 dark:text-gray-200">{asset.serialNumber}</span>
                      </div>
                    )}
                    {asset.model && (
                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                        <span>Model:</span>
                        <span className="text-gray-800 dark:text-gray-200">{asset.model}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                      <span>Allocated On:</span>
                      <span className="text-gray-800 dark:text-gray-200">
                        {new Date(alloc.allocationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-gray-50/50 dark:bg-white/[0.01] border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    Type: <span className="font-semibold">{alloc.allocationType}</span>
                  </span>
                  <button
                    onClick={() => handleOpenReturnModal(alloc)}
                    className="px-3 py-1.5 bg-white dark:bg-white/[0.04] hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-white/[0.08] hover:border-red-200 dark:hover:border-red-800/30 rounded-lg transition-colors shadow-sm"
                  >
                    Request Return
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {returnModalOpen && selectedAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface dark:bg-surface border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Request Asset Return</h3>
              <button onClick={handleCloseReturnModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Asset to Return
                </label>
                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/[0.06] rounded-lg">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{(selectedAlloc.assetId || {}).name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Asset ID: {(selectedAlloc.assetId || {}).assetId}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Current Condition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Excellent", "Good", "Fair", "Poor", "Damaged"].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all ${condition === cond
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                          : "bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Return Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe reason for returning, any wear/tear or issues..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCloseReturnModal}
                  className="px-4 py-2 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 border border-gray-200 dark:border-white/[0.08] text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-xs font-bold text-white rounded-lg shadow-md transition-colors flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Submit Return Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssetsView;
