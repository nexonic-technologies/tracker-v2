import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import toast from "react-hot-toast";
import { StatusBadge } from "@components/StatusBadge";
import { MdRefresh } from "react-icons/md";

const Reports = () => {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    allocated: 0,
    repair: 0,
    disposed: 0,
    totalValue: 0
  });
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // 1. Fetch assets to aggregate statistics client-side
      const assetsRes = await axiosInstance.post("/populate/read/assets", { limit: 5000 });
      const assets = assetsRes.data?.data || [];

      let avail = 0;
      let alloc = 0;
      let rep = 0;
      let disp = 0;
      let val = 0;

      assets.forEach(a => {
        if (a.status === "Available") avail++;
        else if (a.status === "Allocated") alloc++;
        else if (a.status === "Under Repair") rep++;
        else if (a.status === "Disposed") disp++;
        val += Number(a.purchaseCost) || 0;
      });

      setStats({
        total: assets.length,
        available: avail,
        allocated: alloc,
        repair: rep,
        disposed: disp,
        totalValue: val
      });

      // 2. Fetch stock ledger entries
      const ledgerRes = await axiosInstance.post("/populate/read/assets_stock_ledgers", {
        limit: 2000,
        populateFields: {
          assetId: "name,assetId",
          performedBy: "basicInfo.firstName,basicInfo.lastName"
        }
      });
      // Sort ledger descending by transaction date
      const sortedLedger = (ledgerRes.data?.data || []).sort(
        (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
      );
      setLedger(sortedLedger);

    } catch (error) {
      console.error("Error fetching reports data:", error);
      toast.error("Failed to load inventory reports.");
    } finally {
      setLoading(false);
    }
  };

  // Map ledger items for table generator
  const tableData = ledger.map(item => {
    const asset = item.assetId || {};
    const actor = item.performedBy || {};
    const actorName = actor.basicInfo ? `${actor.basicInfo.firstName} ${actor.basicInfo.lastName}` : "System";

    return {
      _id: item._id,
      transactionDate: item.transactionDate,
      assetName: asset.name || "—",
      assetIdCode: asset.assetId || "—",
      type: item.transactionType || "—",
      triggerType: (item.triggerType || "—").replace(/_/g, " "),
      previousState: item.previousState || "—",
      newState: item.newState || "—",
      performedBy: actorName
    };
  });

  return (
    <div className="tracker-page" data-module="hr">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Asset Reports & Analytics</h1>
          <p className="text-sm text-ink-muted mt-1">Audit trail stock ledgers and overall inventory metrics for WorkHub.</p>
        </div>
        <button
          onClick={fetchReportData}
          className="tracker-btn-secondary flex items-center gap-1.5 px-4 py-2"
        >
          <MdRefresh className="text-lg" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

            {/* Stat: Total Inventory Value */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--module-hr)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Total Value</span>
                <span className="block text-xl font-bold text-ink mt-1 truncate">
                  ${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">Cumulative procurement</span>
            </div>

            {/* Stat: Total Assets */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--module-project)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Total Items</span>
                <span className="block text-2xl font-bold text-ink mt-1">{stats.total}</span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">Overall asset units</span>
            </div>

            {/* Stat: Available */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--tracker-success)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Available</span>
                <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.available}</span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">Ready in stock</span>
            </div>

            {/* Stat: Allocated */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--tracker-info)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Allocated</span>
                <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.allocated}</span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">Assigned to employees</span>
            </div>

            {/* Stat: Under Repair */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--tracker-warning)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">In Repair</span>
                <span className="block text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">{stats.repair}</span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">At maintenance vendor</span>
            </div>

            {/* Stat: Disposed */}
            <div className="tracker-card p-4 flex flex-col justify-between" style={{ borderLeftColor: "var(--tracker-danger)" }}>
              <div>
                <span className="block text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Disposed</span>
                <span className="block text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.disposed}</span>
              </div>
              <span className="text-[10px] text-ink-subtle mt-2">Scrapped/Written off</span>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="tracker-card-plain overflow-hidden">
            <TableGenerator
              title="Asset Stock Ledger (History Log)"
              data={tableData}
              hiddenColumns={["_id"]}
              customColumns={["transactionDate", "assetName", "assetIdCode", "type", "triggerType", "previousState", "newState", "performedBy"]}
              customRender={{
                type: (row) => (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${row.type === "IN"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}>
                    {row.type}
                  </span>
                ),
                previousState: (row) => <StatusBadge status={row.previousState} />,
                newState: (row) => <StatusBadge status={row.newState} />
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
