import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import PageLoader from "@components/Common/PageLoader";
import StatCard from "@components/Common/StatCard";
import {
  ChevronLeft, Building, User, Mail, Phone, MapPin,
  DollarSign, FileText, Calendar, Plus, RefreshCw,
  Send, PhoneCall, Award, MessageSquare, AlertCircle, CheckCircle,
  FileCheck, Wallet, ChevronRight, TrendingUp, Clock, Receipt,
  Layers, ArrowUpRight, BarChart3, CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

const LEAD_STATUS_OPTIONS = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const LEAD_STATUS_META = {
  New: { bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800" },
  Qualified: { bg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-800" },
  Proposal: { bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800" },
  Negotiation: { bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800" },
  "Closed Won": { bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800" },
  "Closed Lost": { bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-800" },
};

const fmtCurrency = (n) => {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // overview, opportunities, contracts, invoices, delivery, timeline
  const [client, setClient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [oas, setOas] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick activity log states
  const [logType, setLogType] = useState("Note");
  const [logContent, setLogContent] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  // Quick schedule meeting states
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!id || id === "create" || id === "new" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setLoading(false);
      navigate("/crm/contacts?create=true", { replace: true });
      return;
    }
    try {
      setLoading(true);
      const [
        clientRes,
        activitiesRes,
        meetingsRes,
        oppsRes,
        quotationsRes,
        oasRes,
        invoicesRes,
        paymentsRes,
        sessionsRes
      ] = await Promise.all([
        axiosInstance.get(`/populate/read/clients/${id}`),
        axiosInstance.post("/populate/read/crm_activities", { filter: { clientId: id }, sort: { timestamp: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/crm_meetings", { filter: { clientId: id }, sort: { scheduledTime: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/opportunities", { filter: { accountId: id }, sort: { createdAt: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/quotations", { filter: { clientId: id }, sort: { createdAt: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/order_acknowledgements", { filter: { clientId: id }, sort: { createdAt: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/invoices", { filter: { clientId: id }, sort: { createdAt: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/payments", { filter: { clientId: id }, sort: { paymentDate: -1 }, limit: 100 }),
        axiosInstance.post("/populate/read/time_tracker_sessions", { filter: { clientId: id }, limit: 500 })
      ]);

      if (clientRes.data?.data) {
        setClient(clientRes.data.data);
      }
      setActivities(activitiesRes.data?.data || []);
      setMeetings(meetingsRes.data?.data || []);
      setOpportunities(oppsRes.data?.data || []);
      setQuotations(quotationsRes.data?.data || []);
      setOas(oasRes.data?.data || []);
      setInvoices(invoicesRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
      setSessions(sessionsRes.data?.data || []);
    } catch (e) {
      console.error("Error fetching 360 client details:", e);
      toast.error("Failed to load client 360 data");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchAllData();
    }
  }, [id, fetchAllData]);

  // Handle lead status transition
  const handleStatusChange = async (newStatus) => {
    if (!client) return;
    try {
      await axiosInstance.put(`/populate/update/clients/${client._id}`, { leadStatus: newStatus });
      toast.success(`Lead status updated to ${newStatus}`);
      await fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update lead status");
    }
  };

  // Quick log interaction
  const handleQuickLog = async (e) => {
    e.preventDefault();
    if (!logContent.trim()) return;
    setSubmittingLog(true);
    try {
      await axiosInstance.post("/populate/create/crm_activities", {
        clientId: id,
        type: logType,
        content: logContent.trim()
      });
      setLogContent("");
      toast.success("Activity logged!");
      await fetchAllData();
    } catch (err) {
      toast.error("Failed to log activity");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Quick schedule meeting
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingTime) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmittingMeeting(true);
    try {
      const scheduled = new Date(meetingTime);
      const end = new Date(scheduled.getTime() + parseInt(meetingDuration) * 60000);
      await axiosInstance.post("/populate/create/crm_meetings", {
        clientId: id,
        title: meetingTitle,
        scheduledTime: scheduled,
        endTime: end,
        location: meetingLocation || "Online",
        description: meetingNotes || ""
      });

      setMeetingTitle("");
      setMeetingTime("");
      setMeetingLocation("");
      setMeetingNotes("");
      toast.success("Meeting scheduled successfully!");
      await fetchAllData();
    } catch (err) {
      toast.error("Failed to schedule meeting");
    } finally {
      setSubmittingMeeting(false);
    }
  };

  // Convert Quotation to OA Helper
  const handleConvertToOA = async (quotation) => {
    try {
      const oaPayload = {
        quotationId: quotation._id,
        clientId: client._id,
        orderNumber: `OA-${Date.now().toString().slice(-6)}`,
        totalOrderValue: quotation.grandTotal || quotation.totalAmount || 0,
        status: "Draft",
        modules: quotation.lineItems?.map(item => ({
          description: item.description,
          agreedValue: item.lineTotal || (item.quantity * item.unitPrice)
        })) || []
      };

      await axiosInstance.post("/populate/create/order_acknowledgements", oaPayload);
      await axiosInstance.put(`/populate/update/quotations/${quotation._id}`, { status: "Accepted" });
      toast.success("Quotation converted to Order Acknowledgment!");
      await fetchAllData();
    } catch (err) {
      toast.error("Failed to convert quotation to OA");
    }
  };

  // Real-time Commercial & Profitability Engine
  const financials = useMemo(() => {
    const totalContracted = oas.reduce((s, o) => s + (o.totalOrderValue || o.committedPrice || 0), 0);
    const totalInvoiced = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0) || totalContracted;
    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const outstandingAR = Math.max(0, totalInvoiced - totalCollected);

    // Delivery Hours & Cost Analysis
    const totalHoursLogged = sessions.reduce((s, sess) => s + ((sess.duration || 0) / 3600), 0);
    const directLaborCost = sessions.reduce((s, sess) => {
      if (sess.productionCost) return s + sess.productionCost;
      const rate = sess.costSnapshot?.employeeHourlyRate || 650;
      return s + (((sess.duration || 0) / 3600) * rate);
    }, 0);

    const grossProfit = totalInvoiced - directLaborCost;
    const grossMarginPercent = totalInvoiced > 0 ? Math.round((grossProfit / totalInvoiced) * 100) : 0;

    let healthStatus = '🟢 High Margin';
    if (grossMarginPercent < 0) healthStatus = '🔴 Loss-Making Deal';
    else if (grossMarginPercent < 25) healthStatus = '🟡 Low Margin';
    else if (grossMarginPercent >= 40) healthStatus = '🟢 Prime Account';

    return {
      totalContracted,
      totalInvoiced,
      totalCollected,
      outstandingAR,
      totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
      directLaborCost: Math.round(directLaborCost),
      grossProfit: Math.round(grossProfit),
      grossMarginPercent,
      healthStatus
    };
  }, [oas, invoices, payments, sessions]);

  // Combined master timeline
  const masterTimeline = useMemo(() => {
    const items = [];

    activities.forEach(a => {
      items.push({
        id: `activity_${a._id}`,
        date: new Date(a.timestamp),
        type: a.type,
        icon: a.type === 'Call' ? PhoneCall : a.type === 'System' ? Send : MessageSquare,
        title: a.type === 'System' ? 'System Event' : `${a.type} Activity`,
        body: a.content,
        meta: a.performedBy ? `Logged by user` : '',
        badgeColor: a.type === 'Call' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200'
      });
    });

    meetings.forEach(m => {
      items.push({
        id: `meeting_${m._id}`,
        date: new Date(m.scheduledTime),
        type: 'Meeting',
        icon: Calendar,
        title: `Meeting: ${m.title}`,
        body: m.description || m.outcome || 'No description provided.',
        meta: `Status: ${m.status}`,
        badgeColor: m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
      });
    });

    quotations.forEach(q => {
      items.push({
        id: `quote_${q._id}`,
        date: new Date(q.createdAt),
        type: 'Quotation',
        icon: FileText,
        title: `Quotation: #${q.quotationNumber}`,
        body: `Grand Total: ${fmtCurrency(q.grandTotal || q.totalAmount)} (Rev ${q.revisionNumber || 0})`,
        meta: `Status: ${q.status}`,
        badgeColor: q.status === 'Accepted' || q.status === 'Client Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200',
        action: q.status === 'Draft' || q.status === 'Client Approved' ? () => handleConvertToOA(q) : null,
        actionLabel: 'Convert to OA'
      });
    });

    oas.forEach(o => {
      items.push({
        id: `oa_${o._id}`,
        date: new Date(o.createdAt),
        type: 'OA',
        icon: FileCheck,
        title: `Sales Contract / OA: #${o.orderNumber || o.oaNumber || 'OA'}`,
        body: `Order Value: ${fmtCurrency(o.totalOrderValue || o.committedPrice || 0)}`,
        meta: `Status: ${o.status}`,
        badgeColor: (o.status === 'Client Approved' || o.status === 'Active') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      });
    });

    invoices.forEach(inv => {
      items.push({
        id: `inv_${inv._id}`,
        date: new Date(inv.issueDate || inv.createdAt),
        type: 'Invoice',
        icon: Receipt,
        title: `Tax Invoice: #${inv.invoiceNumber}`,
        body: `Billed: ${fmtCurrency(inv.totalAmount)} | Balance: ${fmtCurrency(inv.balanceDue)}`,
        meta: `Status: ${inv.status}`,
        badgeColor: inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
      });
    });

    payments.forEach(p => {
      items.push({
        id: `payment_${p._id}`,
        date: new Date(p.paymentDate),
        type: 'Payment',
        icon: Wallet,
        title: `Payment Receipt: ${p.referenceNo ? '#' + p.referenceNo : 'Record'}`,
        body: `Received: ${fmtCurrency(p.amount)} via ${p.paymentMethod}`,
        meta: `Status: ${p.status}`,
        badgeColor: p.status === 'Confirmed' || p.status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
      });
    });

    return items.sort((a, b) => b.date - a.date);
  }, [activities, meetings, quotations, oas, invoices, payments]);

  if (loading) return <PageLoader />;
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] bg-canvas text-ink">
        <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
        <p className="text-sm font-medium">Customer account record not found</p>
        <Link to="/crm/contacts" className="text-xs text-brand hover:underline mt-2">Back to Contacts Directory</Link>
      </div>
    );
  }

  return (
    <div data-module="project" className="flex flex-col gap-4 max-w-7xl mx-auto text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── BREADCRUMB & HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/crm/contacts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition py-1.5 px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer">
          <ChevronLeft className="h-4 w-4" /> Back to Contacts Directory
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={fetchAllData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
            <RefreshCw className="h-4 w-4 text-ink-subtle" />
          </button>
        </div>
      </div>

      {/* ─── 360° CUSTOMER PROFILE COCKPIT ─── */}
      <div className="bg-surface rounded-tracker-xl border border-hairline p-6 shadow-card space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[24px] font-bold shadow-md">
              {(client.name?.[0] || "C").toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-bold text-ink leading-tight">{client.name}</h1>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${client.Status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {client.Status || 'Prospect'}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-surface-1 border border-hairline text-brand">
                  {financials.healthStatus}
                </span>
              </div>
              <p className="text-xs text-ink-subtle flex items-center gap-2 mt-1">
                <Building className="h-3.5 w-3.5" /> {client.businessType || "Enterprise Customer"}
                <span>•</span>
                <span>GST: {client.gstNumber || "Unregistered"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to={`/crm/opportunities?accountId=${client._id}`} className="tracker-btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
              <TrendingUp size={14} /> New Opportunity
            </Link>
            <Link to={`/crm/quotations/form?clientId=${client._id}`} className="tracker-btn-brand text-xs px-4 py-2 flex items-center gap-1.5">
              <Plus size={14} /> Create Quotation
            </Link>
          </div>
        </div>

        {/* ─── 360° FINANCIAL & DELIVERY KPI GRID ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-hairline">
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Contracted Value</p>
            <p className="text-sm font-bold text-ink mt-0.5">{fmtCurrency(financials.totalContracted)}</p>
          </div>
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Total Invoiced</p>
            <p className="text-sm font-bold text-blue-600 mt-0.5">{fmtCurrency(financials.totalInvoiced)}</p>
          </div>
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Total Collected</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">{fmtCurrency(financials.totalCollected)}</p>
          </div>
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Outstanding AR</p>
            <p className={`text-sm font-bold mt-0.5 ${financials.outstandingAR > 0 ? 'text-rose-600' : 'text-ink'}`}>
              {fmtCurrency(financials.outstandingAR)}
            </p>
          </div>
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Delivery Hours</p>
            <p className="text-sm font-bold text-purple-600 mt-0.5">{financials.totalHoursLogged} hrs</p>
          </div>
          <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft">
            <p className="text-[10px] font-bold text-ink-subtle uppercase">Gross Margin %</p>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">{financials.grossMarginPercent}%</p>
          </div>
        </div>
      </div>

      {/* ─── 360° NAVIGATION TABS ─── */}
      <div className="flex items-center gap-1 border-b border-hairline pb-1.5 flex-shrink-0">
        {[
          { id: "overview", label: "360° Overview", icon: Layers },
          { id: "opportunities", label: `Opportunities (${opportunities.length})`, icon: TrendingUp },
          { id: "quotations", label: `Quotations (${quotations.length})`, icon: FileText },
          { id: "contracts", label: `Contracts / OAs (${oas.length})`, icon: FileCheck },
          { id: "invoices", label: `Invoices (${invoices.length})`, icon: Receipt },
          { id: "timeline", label: "Unified Timeline", icon: Calendar }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-t-[8px] transition cursor-pointer border-b-2 -mb-[8px] ${activeTab === t.id
                ? "border-brand text-brand bg-surface font-bold"
                : "border-transparent text-ink-subtle hover:text-ink hover:bg-surface-1/50"
                }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: 360° OVERVIEW ─── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Account Details */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Account Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-ink-subtle">Account Manager:</span>
                  <p className="font-semibold text-ink mt-0.5">{client.ownerName || "Unassigned"}</p>
                </div>
                <div>
                  <span className="text-ink-subtle">Primary Email:</span>
                  <p className="font-semibold text-ink mt-0.5">{client.email || "—"}</p>
                </div>
                <div>
                  <span className="text-ink-subtle">Phone:</span>
                  <p className="font-semibold text-ink mt-0.5">{client.phone || "—"}</p>
                </div>
                <div>
                  <span className="text-ink-subtle">Registered State:</span>
                  <p className="font-semibold text-ink mt-0.5">{client.state || "—"}</p>
                </div>
              </div>
            </div>

            {/* Quick Activity Logger */}
            <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Log Communication / Note</h3>
              <form onSubmit={handleQuickLog} className="space-y-3">
                <div className="flex gap-2">
                  {['Note', 'Call', 'Meeting'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLogType(t)}
                      className={`px-3 py-1 text-xs font-semibold rounded-tracker-sm border transition ${logType === t ? 'bg-brand text-white border-brand' : 'bg-surface-1 border-hairline text-ink-subtle'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="Summarize client discussion, requirements, or next steps..."
                  className="lmx-input min-h-[80px]"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={submittingLog || !logContent.trim()} className="tracker-btn-brand text-xs px-4 py-1.5">
                    {submittingLog ? "Saving..." : "Log Activity"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Side Cockpit: Quick Schedule */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Schedule Next Engagement</h3>
            <form onSubmit={handleScheduleMeeting} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase">Meeting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scope Review"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="lmx-input mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="lmx-input mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase">Location / Link</label>
                <input
                  type="text"
                  placeholder="Google Meet / On-site"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  className="lmx-input mt-0.5"
                />
              </div>
              <button type="submit" disabled={submittingMeeting} className="w-full tracker-btn-brand py-2 mt-2">
                {submittingMeeting ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB 2: OPPORTUNITIES ─── */}
      {activeTab === "opportunities" && (
        <div className="bg-surface rounded-tracker-xl border border-hairline p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Commercial Deals & Opportunities</h3>
            <Link to="/crm/opportunities" className="text-xs text-brand font-semibold hover:underline">
              Open Full Pipeline Board →
            </Link>
          </div>
          {opportunities.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-xs">No active opportunities linked to this account.</div>
          ) : (
            <div className="divide-y divide-hairline-soft">
              {opportunities.map(opp => (
                <div key={opp._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-ink text-sm">{opp.name}</h4>
                    <p className="text-ink-subtle mt-0.5">Stage: <span className="font-semibold text-brand">{opp.stage}</span> ({opp.probability}% probability)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink text-sm">{fmtCurrency(opp.expectedValue)}</p>
                    <p className="text-ink-tertiary text-[10px] mt-0.5">Close: {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: QUOTATIONS ─── */}
      {activeTab === "quotations" && (
        <div className="bg-surface rounded-tracker-xl border border-hairline p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Price Proposals & Quotations</h3>
            <Link to={`/crm/quotations/form?clientId=${client._id}`} className="tracker-btn-brand text-xs px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> New Quotation
            </Link>
          </div>
          <div className="divide-y divide-hairline-soft">
            {quotations.map(q => (
              <div key={q._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-mono font-bold text-brand">{q.quotationNumber}</h4>
                  <p className="text-ink-subtle mt-0.5">Status: <span className="font-semibold">{q.status}</span> (Rev {q.revisionNumber || 0})</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink text-sm">{fmtCurrency(q.grandTotal || q.totalAmount)}</p>
                  <p className="text-ink-tertiary text-[10px] mt-0.5">{new Date(q.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: CONTRACTS (OAs) ─── */}
      {activeTab === "contracts" && (
        <div className="bg-surface rounded-tracker-xl border border-hairline p-4 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Approved Sales Orders & Contracts</h3>
          <div className="divide-y divide-hairline-soft">
            {oas.map(o => (
              <div key={o._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-mono font-bold text-brand">{o.orderNumber || o.oaNumber}</h4>
                  <p className="text-ink-subtle mt-0.5">Contract Status: <span className="font-semibold text-emerald-600">{o.status}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink text-sm">{fmtCurrency(o.totalOrderValue || o.committedPrice)}</p>
                  <p className="text-ink-tertiary text-[10px] mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: INVOICES & BILLING ─── */}
      {activeTab === "invoices" && (
        <div className="bg-surface rounded-tracker-xl border border-hairline p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Tax Invoices & AR Ledger Postings</h3>
            <Link to="/crm/invoices" className="text-xs text-brand font-semibold hover:underline">
              Manage All Invoices →
            </Link>
          </div>
          <div className="divide-y divide-hairline-soft">
            {invoices.map(inv => (
              <div key={inv._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-mono font-bold text-brand">{inv.invoiceNumber}</h4>
                  <p className="text-ink-subtle mt-0.5">Status: <span className="font-semibold">{inv.status}</span> (Due: {new Date(inv.dueDate).toLocaleDateString()})</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink text-sm">{fmtCurrency(inv.totalAmount)}</p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Due: {fmtCurrency(inv.balanceDue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: UNIFIED TIMELINE ─── */}
      {activeTab === "timeline" && (
        <div className="bg-surface rounded-tracker-xl border border-hairline p-5 shadow-card space-y-4">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Account Engagement History</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-hairline">
            {masterTimeline.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative group text-xs">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-surface border-2 border-brand flex items-center justify-center" />
                  <div className="p-3 bg-surface-1 rounded-tracker-md border border-hairline-soft space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${item.badgeColor}`}>
                        {item.type}
                      </span>
                      <span className="text-[10px] text-ink-tertiary">{new Date(item.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h5 className="font-bold text-ink mt-1">{item.title}</h5>
                    <p className="text-ink-muted">{item.body}</p>
                    {item.meta && <p className="text-[10px] text-ink-tertiary">{item.meta}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
