import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "@components/StatusBadge";
import { MdClose } from "react-icons/md";
import SearchableDropdown from "@components/Common/SearchableDropdown";


const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Transition Form Dialog state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState(null);
  const [repairCondition, setRepairCondition] = useState("Good");
  const [finalCost, setFinalCost] = useState("");
  const [submittingTransition, setSubmittingTransition] = useState(false);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/assets_repairs", {
        limit: 1000,
        populateFields: {
          assetId: "name,assetId,serialNumber,make,model",
          createdBy: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      // Sort by creation date descending
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRepairs(sorted);
    } catch (error) {
      console.error("Error loading repairs:", error);
      toast.error("Failed to load repairs list.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, targetStatus) => {
    try {
      await axiosInstance.put(`/populate/update/assets_repairs/${id}`, {
        status: targetStatus
      });
      toast.success(`Repair status advanced to "${targetStatus}"`);
      fetchRepairs();
    } catch (error) {
      console.error("Error updating repair status:", error);
      toast.error(error.response?.data?.message || "Invalid status transition.");
    }
  };

  const handleOpenCompleteModal = (id) => {
    setSelectedRepairId(id);
    setRepairCondition("Good");
    setFinalCost("");
    setCompleteModalOpen(true);
  };

  const handleCompleteRepair = async (e) => {
    e.preventDefault();
    setSubmittingTransition(true);

    const payload = {
      status: "Repaired",
      repairCondition,
      actualCost: finalCost ? Number(finalCost) : undefined
    };

    try {
      await axiosInstance.put(`/populate/update/assets_repairs/${selectedRepairId}`, payload);
      toast.success("Asset repaired successfully! Restored to Available stock.");
      setCompleteModalOpen(false);
      fetchRepairs();
    } catch (error) {
      console.error("Error finalizing repair:", error);
      toast.error(error.response?.data?.message || "Failed to finalize repair.");
    } finally {
      setSubmittingTransition(false);
    }
  };

  const handleBeyondRepair = async (id) => {
    if (!window.confirm("Marking this asset as Beyond Repair will write it off and set its status to 'Disposed'. Continue?")) return;
    try {
      await axiosInstance.put(`/populate/update/assets_repairs/${id}`, {
        status: "Beyond Repair"
      });
      toast.success("Asset marked as Beyond Repair and Disposed from stock.");
      fetchRepairs();
    } catch (error) {
      console.error("Error writing off asset:", error);
      toast.error("Failed to process write-off.");
    }
  };

  // Format table rows
  const tableData = repairs.map(r => {
    const asset = r.assetId || {};
    const creator = r.createdBy || {};
    const creatorName = creator.basicInfo ? `${creator.basicInfo.firstName} ${creator.basicInfo.lastName}` : "—";

    return {
      _id: r._id,
      assetName: asset.name || "—",
      assetIdCode: asset.assetId || "—",
      serialNumber: asset.serialNumber || "—",
      vendor: r.vendorName || "—",
      estimatedCost: r.estimatedRepairCost ? `$${r.estimatedRepairCost.toLocaleString()}` : "—",
      actualCost: r.actualCost ? `$${r.actualCost.toLocaleString()}` : "—",
      dateSent: r.createdAt,
      status: r.status || "Sent for Repair",
      performedBy: creatorName,
      rawDoc: r
    };
  });

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Repairs Log</h1>
        <p className="text-sm text-ink-muted mt-1">Track hardware sent for servicing, repairs, and vendor maintenance.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="tracker-card-plain overflow-hidden">
          <TableGenerator
            title="Active and Completed Repairs"
            data={tableData}
            hiddenColumns={["_id", "rawDoc", "serialNumber"]}
            customColumns={["assetName", "assetIdCode", "vendor", "estimatedCost", "actualCost", "dateSent", "status", "performedBy"]}
            customRender={{
              status: (row) => <StatusBadge status={row.status} />,
              __actions: (row) => {
                const rep = row.rawDoc;
                return (
                  <div className="flex items-center gap-1.5">
                    {rep.status === "Sent for Repair" && (
                      <button
                        onClick={() => handleUpdateStatus(rep._id, "In Repair")}
                        className="px-2 py-1 text-xs font-semibold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors"
                      >
                        Start Repair
                      </button>
                    )}

                    {rep.status === "In Repair" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenCompleteModal(rep._id)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          Repaired
                        </button>
                        <button
                          onClick={() => handleBeyondRepair(rep._id)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                        >
                          Scrap
                        </button>
                      </div>
                    )}

                    {["Repaired", "Beyond Repair"].includes(rep.status) && (
                      <span className="text-xs text-ink-subtle italic">Archived</span>
                    )}
                  </div>
                );
              }
            }}
          />
        </div>
      )}

      {/* Complete Repair Modal Dialog */}
      {completeModalOpen && (
        <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-tracker-lg border border-hairline max-w-md w-full shadow-tracker-overlay p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-hairline">
              <h3 className="text-sm font-bold text-ink">Complete Repair Action</h3>
              <button onClick={() => setCompleteModalOpen(false)} className="text-ink-subtle hover:text-ink">
                <MdClose className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCompleteRepair} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase font-sans">Final Condition of Asset *</label>
                <SearchableDropdown
                  value={repairCondition}
                  options={[
                    { value: "Excellent", label: "Excellent (Like New)" },
                    { value: "Good", label: "Good" },
                    { value: "Fair", label: "Fair (Wear & Tear)" },
                    { value: "Poor", label: "Poor" }
                  ]}
                  onChange={(val) => setRepairCondition(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase font-sans">Actual Cost of Repair</label>
                <input
                  type="number"
                  min="0"
                  value={finalCost}
                  onChange={(e) => setFinalCost(e.target.value)}
                  className="lmx-input"
                  placeholder="Enter repair charges in dollars"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="tracker-btn-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransition}
                  className="tracker-btn-accent py-1.5 px-3 text-xs"
                >
                  {submittingTransition ? "Finalizing..." : "Return to Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Repairs;
