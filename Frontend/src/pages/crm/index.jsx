import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useGenericAPI } from "@hooks/useGenericAPI";
import PageLoader from "@components/Common/PageLoader";
import StatCard from "@components/Common/StatCard";
import {
  BadgeDollarSign, Users, Award, Play, CheckCircle,
  Clock, AlertCircle, BarChart3, ListFilter, Kanban,
  TrendingUp, ArrowRight, User, Plus, RefreshCw,
  FolderMinus, Calendar, FileText
} from "lucide-react";
import toast from "react-hot-toast";

const LEAD_STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS = {
  'New': 'border-t-blue-500 bg-blue-50/20 text-blue-700 dark:text-blue-300',
  'Qualified': 'border-t-violet-500 bg-violet-50/20 text-violet-700 dark:text-violet-300',
  'Proposal': 'border-t-amber-500 bg-amber-50/20 text-amber-700 dark:text-amber-300',
  'Negotiation': 'border-t-orange-500 bg-orange-50/20 text-orange-700 dark:text-orange-300',
  'Closed Won': 'border-t-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-300',
  'Closed Lost': 'border-t-rose-500 bg-rose-50/20 text-rose-700 dark:text-rose-300',
};

const STAGE_DOTS = {
  'New': 'bg-blue-500',
  'Qualified': 'bg-violet-500',
  'Proposal': 'bg-amber-500',
  'Negotiation': 'bg-orange-500',
  'Closed Won': 'bg-emerald-500',
  'Closed Lost': 'bg-rose-500',
};

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

export default function CRMIndex() {
  const { read, update } = useGenericAPI();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, pipeline, analytics
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsRes, quotationsRes, meetingsRes, oppsRes, invsRes] = await Promise.all([
        read("clients", { limit: 1000 }),
        read("quotations", { limit: 1000 }),
        read("crm_meetings", { limit: 1000, sort: { scheduledTime: -1 } }),
        read("opportunities", { limit: 1000 }),
        read("invoices", { limit: 1000 })
      ]);
      setClients(clientsRes?.data || []);
      setQuotations(quotationsRes?.data || []);
      setMeetings(meetingsRes?.data || []);
      setOpportunities(oppsRes?.data || []);
      setInvoices(invsRes?.data || []);
    } catch (err) {
      console.error("Error fetching CRM index data:", err);
      toast.error("Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Client Quotation Values Map
  const clientValues = useMemo(() => {
    const map = {};
    quotations.forEach(q => {
      const cid = q.clientId?._id || q.clientId;
      if (cid) {
        if (!map[cid]) map[cid] = { total: 0, count: 0, pending: 0 };
        const quoteValue = q.grandTotal || q.totalAmount || 0;
        map[cid].total += quoteValue;
        map[cid].count++;
        if (q.status === 'Draft' || q.status === 'Sent' || q.status === 'Under Review' || q.status === 'Internally Approved') {
          map[cid].pending += quoteValue;
        }
      }
    });
    return map;
  }, [quotations]);

  // Aggregate Stats (6 Revenue Operations Metrics)
  const stats = useMemo(() => {
    const activeLeads = clients.filter(c => c.leadStatus !== 'Closed Won' && c.leadStatus !== 'Closed Lost').length;
    const completedMeetings = meetings.filter(m => m.status === 'Completed').length;
    
    // Opportunity-based pipeline
    const oppPipeline = opportunities
      .filter(o => o.stage !== 'Won' && o.stage !== 'Lost')
      .reduce((sum, o) => sum + (o.expectedValue || 0), 0);

    const weightedPipeline = opportunities
      .filter(o => o.stage !== 'Won' && o.stage !== 'Lost')
      .reduce((sum, o) => sum + ((o.expectedValue || 0) * (o.probability || 0) / 100), 0);

    const totalInvoiced = invoices
      .filter(i => i.status !== 'Draft' && i.status !== 'Cancelled')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    const totalOutstandingAR = invoices
      .filter(i => i.status !== 'Draft' && i.status !== 'Cancelled' && i.status !== 'Paid')
      .reduce((sum, i) => sum + (i.balanceDue || 0), 0);

    return {
      totalClients: clients.length,
      activeLeads,
      completedMeetings,
      totalPipelineVal: oppPipeline || Object.values(clientValues).reduce((acc, cv) => acc + cv.pending, 0),
      weightedPipeline,
      totalInvoiced,
      totalOutstandingAR,
      totalOpps: opportunities.length
    };
  }, [clients, meetings, clientValues, quotations, opportunities, invoices]);

  // Funnel Analytics Data
  const stageStats = useMemo(() => {
    const counts = {};
    const values = {};
    LEAD_STAGES.forEach(s => {
      counts[s] = 0;
      values[s] = 0;
    });

    clients.forEach(c => {
      if (counts[c.leadStatus] !== undefined) {
        counts[c.leadStatus]++;
        values[c.leadStatus] += clientValues[c._id]?.total || 0;
      }
    });

    return { counts, values };
  }, [clients, clientValues]);

  // HTML5 Drag-and-drop handlers for Kanban
  const handleDragStart = (e, clientId) => {
    e.dataTransfer.setData("clientId", clientId);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const clientId = e.dataTransfer.getData("clientId");
    if (!clientId) return;

    const clientDoc = clients.find(c => c._id === clientId);
    if (clientDoc && clientDoc.leadStatus !== targetStage) {
      try {
        await update("clients", clientId, { leadStatus: targetStage }, `Lead moved to ${targetStage}`);
        // Optimistically update status local state
        setClients(prev => prev.map(c => c._id === clientId ? { ...c, leadStatus: targetStage } : c));
        // Refresh fully to trigger any background computations/re-evaluation
        fetchData();
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || "Failed to move lead");
      }
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div data-module="project" className="h-full flex flex-col gap-4 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">CRM MODULE</p>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <BadgeDollarSign className="h-6 w-6 text-indigo-500" />
            Client Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
            <RefreshCw className="h-4 w-4 text-ink-subtle" />
          </button>
          <Link to="/crm/contacts?create=true" className="flex items-center gap-1.5 px-3 py-1.5 tracker-btn-accent text-[12px] font-semibold cursor-pointer">
            <Plus className="h-4 w-4" /> Add Lead
          </Link>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex items-center gap-1 border-b border-hairline pb-1.5 flex-shrink-0">
        {[
          { id: "dashboard", label: "Overview", icon: BarChart3 },
          { id: "pipeline", label: "Sales Pipeline", icon: Kanban },
          { id: "analytics", label: "Analytics & Funnel", icon: TrendingUp }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-t-[8px] transition cursor-pointer border-b-2 -mb-[8px] ${activeTab === t.id
                ? "border-[var(--module-accent)] text-[var(--module-accent)] bg-surface"
                : "border-transparent text-ink-subtle hover:text-ink hover:bg-surface-1/50"
                }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB CONTENT: DASHBOARD ─── */}
      {activeTab === "dashboard" && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Active Pipeline" value={fmtCurrency(stats.totalPipelineVal)} icon={TrendingUp} color="blue" />
            <StatCard title="Weighted Forecast" value={fmtCurrency(stats.weightedPipeline)} icon={BadgeDollarSign} color="purple" />
            <StatCard title="Total Invoiced" value={fmtCurrency(stats.totalInvoiced)} icon={FileText} color="green" />
            <StatCard title="Outstanding AR" value={fmtCurrency(stats.totalOutstandingAR)} icon={AlertCircle} color="yellow" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Quick Actions */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-4 shadow-sm space-y-2.5">
              <h3 className="text-[13px] font-semibold text-ink">Revenue Operations Hub</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link to="/crm/opportunities" className="flex items-center justify-between p-2.5 bg-surface-1 hover:bg-accent/5 border border-hairline-soft rounded-[8px] transition group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-ink leading-tight">Deal Pipeline (Opportunities)</p>
                      <p className="text-[10px] text-ink-tertiary mt-0.5">Weighted sales funnel & forecasting</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary group-hover:translate-x-1 transition" />
                </Link>

                <Link to="/crm/invoices" className="flex items-center justify-between p-2.5 bg-surface-1 hover:bg-accent/5 border border-hairline-soft rounded-[8px] transition group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <BadgeDollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-ink leading-tight">Tax Invoices & Billing</p>
                      <p className="text-[10px] text-ink-tertiary mt-0.5">Accounts receivable & payment dues</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary group-hover:translate-x-1 transition" />
                </Link>

                <Link to="/crm/quotations" className="flex items-center justify-between p-2.5 bg-surface-1 hover:bg-accent/5 border border-hairline-soft rounded-[8px] transition group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-ink leading-tight">Quotations Manager</p>
                      <p className="text-[10px] text-ink-tertiary mt-0.5">Price proposals & revision logs</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary group-hover:translate-x-1 transition" />
                </Link>

                <Link to="/crm/ledger" className="flex items-center justify-between p-2.5 bg-surface-1 hover:bg-accent/5 border border-hairline-soft rounded-[8px] transition group">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-ink leading-tight">Client Outstanding Ledger</p>
                      <p className="text-[10px] text-ink-tertiary mt-0.5">Double-entry statement of accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary group-hover:translate-x-1 transition" />
                </Link>
              </div>
            </div>

            {/* Upcoming / Recent Meetings */}
            <div className="lg:col-span-2 bg-surface rounded-tracker-card border border-hairline p-4 shadow-sm space-y-2.5">
              <h3 className="text-[13px] font-semibold text-ink">Upcoming or Recent Scheduled Events</h3>
              <div className="space-y-2.5">
                {meetings.slice(0, 4).map(meeting => (
                  <div key={meeting._id} className="flex items-start justify-between p-3 bg-surface-1/50 border border-hairline-soft rounded-[8px]">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-semibold text-ink">{meeting.title}</h4>
                        <p className="text-[10px] text-ink-subtle mt-0.5">
                          {new Date(meeting.scheduledTime).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {meeting.location && <p className="text-[10px] text-ink-tertiary mt-0.5">📍 {meeting.location}</p>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${meeting.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      meeting.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                      {meeting.status}
                    </span>
                  </div>
                ))}
                {meetings.length === 0 && (
                  <p className="text-center text-[12px] text-ink-tertiary py-8">No scheduled meetings</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: PIPELINE KANBAN ─── */}
      {activeTab === "pipeline" && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-2 select-none" style={{ minHeight: "500px" }}>
          {LEAD_STAGES.map(stage => {
            const stageClients = clients.filter(c => c.leadStatus === stage);
            const isOverThis = draggedOverStage === stage;

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-[270px] flex flex-col bg-surface-1/40 rounded-tracker-card border border-hairline-soft overflow-hidden transition-colors ${isOverThis ? 'bg-accent/5 border-dashed border-accent' : ''}`}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={() => setDraggedOverStage(null)}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column Header */}
                <div className={`p-3 border-t-4 border-b border-hairline-soft bg-surface flex items-center justify-between flex-shrink-0 ${STAGE_COLORS[stage] || ''}`}>
                  <span className="text-[12px] font-bold uppercase tracking-wider">{stage}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-1 text-ink-subtle">{stageClients.length}</span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
                  {stageClients.map(client => {
                    const stats = clientValues[client._id] || { total: 0, count: 0, pending: 0 };

                    return (
                      <div
                        key={client._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, client._id)}
                        className="bg-surface p-3.5 rounded-tracker-card border border-hairline shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition group space-y-2.5"
                      >
                        <div>
                          <Link to={`/crm/contacts/${client._id}`} className="text-[13px] font-bold text-ink hover:text-[var(--module-accent)] hover:underline block leading-tight">
                            {client.name}
                          </Link>
                          {client.ownerName && <p className="text-[10px] text-ink-subtle mt-0.5 flex items-center gap-1"><User className="h-3 w-3" /> {client.ownerName}</p>}
                        </div>

                        {stats.count > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-hairline-soft text-[11px]">
                            <span className="text-ink-tertiary">{stats.count} Quote{stats.count !== 1 ? 's' : ''}</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(stats.total)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {stageClients.length === 0 && (
                    <div className="text-center py-10 text-[11px] text-ink-tertiary">Drag leads here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB CONTENT: ANALYTICS ─── */}
      {activeTab === "analytics" && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Sales Funnel Conversion counts */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
              <h3 className="text-[14px] font-medium text-ink border-b border-hairline-soft pb-2">Deal Funnel (Counts)</h3>
              <div className="space-y-3.5">
                {LEAD_STAGES.map((stage, idx) => {
                  const val = stageStats.counts[stage] || 0;
                  const maxVal = Math.max(...Object.values(stageStats.counts), 1);
                  const pct = (val / maxVal) * 100;

                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-medium text-ink-subtle">{stage}</span>
                        <span className="font-bold text-ink">{val} Lead{val !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-5 bg-surface-1 rounded-[6px] overflow-hidden relative">
                        <div
                          className="h-full rounded-[6px] bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pipeline Stage Valuation */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
              <h3 className="text-[14px] font-medium text-ink border-b border-hairline-soft pb-2">Pipeline Stage Valuation</h3>
              <div className="space-y-3.5">
                {LEAD_STAGES.map((stage, idx) => {
                  const val = stageStats.values[stage] || 0;
                  const maxVal = Math.max(...Object.values(stageStats.values), 1);
                  const pct = (val / maxVal) * 100;

                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-medium text-ink-subtle">{stage}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(val)}</span>
                      </div>
                      <div className="h-5 bg-surface-1 rounded-[6px] overflow-hidden relative">
                        <div
                          className="h-full rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}