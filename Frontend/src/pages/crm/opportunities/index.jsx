import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import PageLoader from "@components/Common/PageLoader";
import StatCard from "@components/Common/StatCard";
import FloatingCard from "@components/Common/FloatingCard";
import TableGenerator from "@components/Common/TableGenerator";
import {
  TrendingUp, Plus, Kanban, ListFilter, Search,
  Calendar, CheckCircle2, XCircle, Clock,
  ArrowRight, Award, RefreshCw, DollarSign, Filter
} from "lucide-react";
import toast from "react-hot-toast";

const OPPORTUNITY_STAGES = ['New', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const STAGE_CONFIGS = {
  'New': { color: 'border-t-blue-500 bg-blue-50/20 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', defaultProb: 10 },
  'Discovery': { color: 'border-t-indigo-500 bg-indigo-50/20 text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', defaultProb: 25 },
  'Proposal': { color: 'border-t-amber-500 bg-amber-50/20 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', defaultProb: 50 },
  'Negotiation': { color: 'border-t-orange-500 bg-orange-50/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500', defaultProb: 75 },
  'Won': { color: 'border-t-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', defaultProb: 100 },
  'Lost': { color: 'border-t-rose-500 bg-rose-50/20 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', defaultProb: 0 },
};

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

export default function OpportunitiesPage() {
  const [viewMode, setViewMode] = useState("kanban"); // kanban | table
  const [opportunities, setOpportunities] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    accountId: "",
    stage: "New",
    expectedValue: 0,
    probability: 10,
    expectedCloseDate: "",
    ownerId: "",
    quotationId: "",
    notes: "",
    lostReason: ""
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [oppsRes, clientsRes, empsRes, quotesRes] = await Promise.all([
        axiosInstance.post("/populate/read/opportunities", {
          limit: 1000,
          populate: [
            { path: "accountId", select: "name email Status" },
            { path: "ownerId", select: "basicInfo.firstName basicInfo.lastName email" },
            { path: "quotationId", select: "quotationNumber grandTotal status" }
          ],
          sort: { createdAt: -1 }
        }),
        axiosInstance.post("/populate/read/clients", { limit: 1000, select: "name _id Status" }),
        axiosInstance.post("/populate/read/employees", { limit: 1000, select: "basicInfo _id" }),
        axiosInstance.post("/populate/read/quotations", { limit: 1000, select: "quotationNumber grandTotal clientId status" })
      ]);

      setOpportunities(oppsRes.data?.data || []);
      setClients(clientsRes.data?.data || []);
      setEmployees(empsRes.data?.data || []);
      setQuotations(quotesRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching opportunities data:", err);
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openFormModal = (opp = null, defaultStage = "New") => {
    setSelectedOpp(opp);
    if (opp) {
      setFormData({
        name: opp.name || "",
        accountId: opp.accountId?._id || opp.accountId || "",
        stage: opp.stage || "New",
        expectedValue: opp.expectedValue || 0,
        probability: opp.probability ?? STAGE_CONFIGS[opp.stage]?.defaultProb ?? 10,
        expectedCloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split("T")[0] : "",
        ownerId: opp.ownerId?._id || opp.ownerId || "",
        quotationId: opp.quotationId?._id || opp.quotationId || "",
        notes: opp.notes || "",
        lostReason: opp.lostReason || ""
      });
    } else {
      setFormData({
        name: "",
        accountId: "",
        stage: defaultStage,
        expectedValue: 0,
        probability: STAGE_CONFIGS[defaultStage]?.defaultProb || 10,
        expectedCloseDate: "",
        ownerId: "",
        quotationId: "",
        notes: "",
        lostReason: ""
      });
    }
    setModalOpen(true);
  };

  const handleSaveOpportunity = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a deal/opportunity name");
      return;
    }
    if (!formData.accountId) {
      toast.error("Please select a client account");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        accountId: formData.accountId,
        stage: formData.stage,
        expectedValue: Number(formData.expectedValue) || 0,
        probability: Number(formData.probability) || 0,
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : undefined,
        ownerId: formData.ownerId || undefined,
        quotationId: formData.quotationId || undefined,
        notes: formData.notes,
        lostReason: formData.stage === "Lost" ? formData.lostReason : undefined
      };

      if (selectedOpp?._id) {
        await axiosInstance.put(`/populate/update/opportunities/${selectedOpp._id}`, payload);
        toast.success("Opportunity updated successfully");
      } else {
        await axiosInstance.post("/populate/create/opportunities", payload);
        toast.success("Opportunity created successfully");
      }

      setModalOpen(false);
      setSelectedOpp(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save opportunity");
    } finally {
      setSaving(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, oppId) => {
    e.dataTransfer.setData("oppId", oppId);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const oppId = e.dataTransfer.getData("oppId");
    if (!oppId) return;

    const oppDoc = opportunities.find(o => o._id === oppId);
    if (oppDoc && oppDoc.stage !== targetStage) {
      if (targetStage === "Lost" && !oppDoc.lostReason) {
        openFormModal(oppDoc, "Lost");
        return;
      }

      try {
        await axiosInstance.put(`/populate/update/opportunities/${oppId}`, { stage: targetStage });
        setOpportunities(prev => prev.map(o => o._id === oppId ? { ...o, stage: targetStage } : o));
        toast.success(`Deal moved to ${targetStage}`);
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to advance deal stage");
      }
    }
  };

  // Filtered Data
  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return opportunities;
    const q = searchQuery.toLowerCase();
    return opportunities.filter(o =>
      o.name?.toLowerCase().includes(q) ||
      o.accountId?.name?.toLowerCase().includes(q) ||
      o.ownerId?.basicInfo?.firstName?.toLowerCase().includes(q) ||
      o.stage?.toLowerCase().includes(q)
    );
  }, [opportunities, searchQuery]);

  // Aggregate Metrics (6 Revenue Operations Metrics)
  const metrics = useMemo(() => {
    const totalPipeline = opportunities
      .filter(o => o.stage !== 'Won' && o.stage !== 'Lost')
      .reduce((sum, o) => sum + (o.expectedValue || 0), 0);

    const weightedPipeline = opportunities
      .filter(o => o.stage !== 'Won' && o.stage !== 'Lost')
      .reduce((sum, o) => sum + ((o.expectedValue || 0) * (o.probability || 0) / 100), 0);

    const wonValue = opportunities
      .filter(o => o.stage === 'Won')
      .reduce((sum, o) => sum + (o.expectedValue || 0), 0);

    const winRate = opportunities.length > 0
      ? Math.round((opportunities.filter(o => o.stage === 'Won').length / opportunities.length) * 100)
      : 0;

    return {
      totalDeals: opportunities.length,
      openDeals: opportunities.filter(o => o.stage !== 'Won' && o.stage !== 'Lost').length,
      totalPipeline,
      weightedPipeline,
      wonValue,
      winRate
    };
  }, [opportunities]);

  if (loading) return <PageLoader />;

  return (
    <div data-module="project" className="h-full flex flex-col gap-4 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">REVENUE OPERATIONS</p>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-500" />
            Opportunity & Deal Pipeline
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
            <RefreshCw className="h-4 w-4 text-ink-subtle" />
          </button>
          
          <div className="flex items-center bg-surface-1 rounded-tracker-md p-1 border border-hairline">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 text-xs font-semibold rounded-tracker-sm transition-colors ${viewMode === "kanban" ? "bg-surface text-ink shadow-sm" : "text-ink-subtle hover:text-ink"}`}
            >
              <Kanban size={14} className="inline mr-1" /> Pipeline Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 text-xs font-semibold rounded-tracker-sm transition-colors ${viewMode === "table" ? "bg-surface text-ink shadow-sm" : "text-ink-subtle hover:text-ink"}`}
            >
              <ListFilter size={14} className="inline mr-1" /> List View
            </button>
          </div>

          <button
            onClick={() => openFormModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 tracker-btn-brand text-[12px] font-semibold cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Opportunity
          </button>
        </div>
      </div>

      {/* ─── STATS COCKPIT ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Pipeline Value" value={fmtCurrency(metrics.totalPipeline)} icon={DollarSign} color="blue" />
        <StatCard title="Weighted Forecast" value={fmtCurrency(metrics.weightedPipeline)} icon={TrendingUp} color="purple" />
        <StatCard title="Closed Won Revenue" value={fmtCurrency(metrics.wonValue)} icon={Award} color="green" />
        <StatCard title="Win Rate" value={`${metrics.winRate}%`} icon={CheckCircle2} color="yellow" />
      </div>

      {/* ─── SEARCH & FILTER BAR ─── */}
      <div className="flex items-center justify-between gap-4 bg-surface p-3 rounded-tracker-md border border-hairline">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" size={16} />
          <input
            type="text"
            placeholder="Search deals, accounts, owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="lmx-input pl-10"
          />
        </div>
        <p className="text-xs text-ink-muted">
          Showing <span className="font-semibold text-ink">{filteredOpportunities.length}</span> deals
        </p>
      </div>

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px] h-full items-start">
            {OPPORTUNITY_STAGES.map((stage) => {
              const stageOpps = filteredOpportunities.filter(o => o.stage === stage);
              const stageValue = stageOpps.reduce((sum, o) => sum + (o.expectedValue || 0), 0);
              const isOver = draggedOverStage === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`flex-1 min-w-[220px] bg-surface rounded-tracker-lg border border-hairline flex flex-col max-h-full transition-colors ${isOver ? 'ring-2 ring-brand/50 bg-brand/5' : ''}`}
                >
                  {/* Column Header */}
                  <div className={`p-3 border-t-4 border-b border-hairline rounded-t-tracker-lg ${STAGE_CONFIGS[stage].color}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STAGE_CONFIGS[stage].dot}`} />
                        <h4 className="text-xs font-bold uppercase tracking-wider">{stage}</h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface/80 border border-hairline">
                        {stageOpps.length}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold mt-1 opacity-90">{fmtCurrency(stageValue)}</p>
                  </div>

                  {/* Deals Cards */}
                  <div className="p-2 space-y-2.5 overflow-y-auto flex-1 min-h-[350px]">
                    {stageOpps.map((opp) => (
                      <div
                        key={opp._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opp._id)}
                        onClick={() => openFormModal(opp)}
                        className="p-3 bg-surface-1 hover:bg-surface-2 border border-hairline-soft rounded-tracker-md shadow-xs cursor-grab active:cursor-grabbing transition group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-ink group-hover:text-brand transition line-clamp-1">
                            {opp.name}
                          </h5>
                          <span className="text-[10px] font-mono font-bold text-ink-subtle bg-surface px-1.5 py-0.5 rounded border border-hairline">
                            {opp.probability}%
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-ink-muted mt-1 truncate">
                          🏢 {opp.accountId?.name || "Independent Deal"}
                        </p>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-hairline-soft text-[11px]">
                          <span className="font-bold text-brand">{fmtCurrency(opp.expectedValue)}</span>
                          {opp.expectedCloseDate && (
                            <span className="text-ink-tertiary flex items-center gap-1 text-[10px]">
                              <Clock size={12} /> {new Date(opp.expectedCloseDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageOpps.length === 0 && (
                      <div className="h-32 flex items-center justify-center border-2 border-dashed border-hairline-soft rounded-tracker-md text-[11px] text-ink-tertiary">
                        No deals in {stage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="bg-surface rounded-tracker-xl border border-hairline shadow-card overflow-hidden">
          <TableGenerator
            data={filteredOpportunities.map(o => ({
              _id: o._id,
              name: o.name,
              account: o.accountId?.name || "N/A",
              stage: o.stage,
              expectedValue: fmtCurrency(o.expectedValue),
              probability: `${o.probability || 0}%`,
              owner: o.ownerId ? `${o.ownerId.basicInfo?.firstName || ""} ${o.ownerId.basicInfo?.lastName || ""}`.trim() : "Unassigned",
              closeDate: o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : "—",
              oppData: o
            }))}
            hiddenColumns={["_id", "oppData"]}
            customRender={{
              stage: (row) => (
                <span className={`px-2.5 py-1 text-xs rounded-full font-semibold border ${STAGE_CONFIGS[row.stage]?.color || "bg-gray-100 text-gray-800"}`}>
                  {row.stage}
                </span>
              ),
              name: (row) => (
                <span className="font-bold text-ink hover:text-brand cursor-pointer" onClick={() => openFormModal(row.oppData)}>
                  {row.name}
                </span>
              )
            }}
            onEdit={(row) => openFormModal(row.oppData)}
          />
        </div>
      )}

      {/* ─── OPPORTUNITY CREATE / EDIT MODAL ─── */}
      {modalOpen && (
        <FloatingCard
          title={selectedOpp ? `Edit Deal: ${selectedOpp.name}` : "Create New Opportunity"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSaveOpportunity} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Opportunity / Deal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud ERP Migration"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Client Account *</label>
                <select
                  required
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="">Select Customer Account...</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Sales Owner</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="">Assign Sales Rep...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Deal Stage</label>
                <select
                  value={formData.stage}
                  onChange={(e) => {
                    const stg = e.target.value;
                    setFormData({
                      ...formData,
                      stage: stg,
                      probability: STAGE_CONFIGS[stg]?.defaultProb ?? formData.probability
                    });
                  }}
                  className="lmx-input mt-1"
                >
                  {OPPORTUNITY_STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Probability (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Expected Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.expectedValue}
                  onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Target Close Date</label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="lmx-input mt-1"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Linked Quotation</label>
                <select
                  value={formData.quotationId}
                  onChange={(e) => setFormData({ ...formData, quotationId: e.target.value })}
                  className="lmx-input mt-1"
                >
                  <option value="">No Quotation Linked</option>
                  {quotations.map(q => (
                    <option key={q._id} value={q._id}>
                      {q.quotationNumber} — ₹{(q.grandTotal || 0).toLocaleString()} ({q.status})
                    </option>
                  ))}
                </select>
              </div>

              {formData.stage === "Lost" && (
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Lost Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget constraints / Selected competitor X"
                    value={formData.lostReason}
                    onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                    className="lmx-input mt-1 border-rose-300 focus:border-rose-500"
                  />
                </div>
              )}

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Notes & Next Actions</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="lmx-input mt-1 min-h-[80px]"
                  placeholder="Key decision makers, requirements, objections, or strategy..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="tracker-btn-secondary px-5"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="tracker-btn-brand px-6 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{saving ? "Saving..." : (selectedOpp ? "Update Opportunity" : "Create Opportunity")}</span>
              </button>
            </div>
          </form>
        </FloatingCard>
      )}
    </div>
  );
}
