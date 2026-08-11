import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGenericAPI } from "@hooks/useGenericAPI";
import PageLoader from "@components/Common/PageLoader";
import {
  ChevronLeft, Building, User, Mail, Phone, MapPin,
  DollarSign, FileText, Calendar, Plus, RefreshCw,
  Send, PhoneCall, Award, MessageSquare, AlertCircle, CheckCircle,
  FileCheck, Wallet, ChevronRight
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
  const { readDetailed, create, update } = useGenericAPI();

  const [client, setClient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [oas, setOas] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick activity log states
  const [logType, setLogType] = useState("Note");
  const [logContent, setLogContent] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  // Quick schedule meeting states
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60"); // minutes
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
      const [clientRes, activitiesRes, meetingsRes, quotationsRes, oasRes, paymentsRes] = await Promise.all([
        readDetailed("clients", { id }),
        readDetailed("crm_activities", { filter: { clientId: id }, sort: { timestamp: -1 }, limit: 100 }),
        readDetailed("crm_meetings", { filter: { clientId: id }, sort: { scheduledTime: -1 }, limit: 100 }),
        readDetailed("quotations", { filter: { clientId: id }, sort: { createdAt: -1 }, limit: 100 }),
        readDetailed("orderacknowledgments", { filter: { clientId: id }, sort: { createdAt: -1 }, limit: 100 }),
        readDetailed("payments", { filter: { clientId: id }, sort: { paymentDate: -1 }, limit: 100 })
      ]);

      if (clientRes?.data) {
        setClient(clientRes.data);
      }
      setActivities(activitiesRes?.data || []);
      setMeetings(meetingsRes?.data || []);
      setQuotations(quotationsRes?.data || []);
      setOas(oasRes?.data || []);
      setPayments(paymentsRes?.data || []);
    } catch (e) {
      console.error("Error fetching client details:", e);
      toast.error("Failed to load client information");
    } finally {
      setLoading(false);
    }
  }, [id, readDetailed, navigate]);

  useEffect(() => {
    if (id) {
      fetchAllData();
    }
  }, [id, fetchAllData]);

  // Handle lead status transition update
  const handleStatusChange = async (newStatus) => {
    if (!client) return;
    try {
      await update("clients", client._id, { leadStatus: newStatus }, `Lead status updated to ${newStatus}`);
      await fetchAllData();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update lead status");
    }
  };

  // Log activity
  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!logContent.trim()) return;
    setSubmittingLog(true);
    try {
      await create("crm_activities", {
        clientId: id,
        type: logType,
        content: logContent,
        timestamp: new Date()
      }, "Activity logged successfully!");
      setLogContent("");
      await fetchAllData();
    } catch (err) {
      toast.error("Failed to log activity");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Schedule a meeting
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
      await create("crm_meetings", {
        clientId: id,
        title: meetingTitle,
        scheduledTime: scheduled,
        endTime: end,
        location: meetingLocation || "Online",
        description: meetingNotes || ""
      }, "Meeting scheduled successfully!");

      // Reset form
      setMeetingTitle("");
      setMeetingTime("");
      setMeetingLocation("");
      setMeetingNotes("");

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
      // OA creation payload
      const oaPayload = {
        quotationId: quotation._id,
        clientId: client._id,
        clientName: client.name,
        committedPrice: quotation.totalAmount,
        subtotal: quotation.subtotal,
        taxTotal: quotation.taxAmount || 0,
        status: "Draft",
        notes: quotation.notes || `Converted from Quotation #${quotation.quotationNumber}`,
        items: quotation.items.map(item => ({
          productName: item.productName || "Product",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tax: item.tax || 0,
          taxAmount: item.taxAmount || 0,
          total: item.total
        }))
      };

      await create("orderacknowledgments", oaPayload, "Order Acknowledgment created!");

      // Update quotation status
      await update("quotations", quotation._id, { status: "Accepted" });

      await fetchAllData();
    } catch (err) {
      toast.error("Failed to convert quotation to OA");
    }
  };

  // Combined sorted activity list for master timeline
  const masterTimeline = useMemo(() => {
    const items = [];

    // Add CRM Activities
    activities.forEach(a => {
      items.push({
        id: `activity_${a._id}`,
        date: new Date(a.timestamp),
        type: a.type,
        icon: a.type === 'Call' ? PhoneCall : a.type === 'System' ? Send : MessageSquare,
        title: a.type === 'System' ? 'System Notification' : `${a.type} logged`,
        body: a.content,
        meta: a.performedBy ? `Logged by: ${a.performedBy}` : '',
        badgeColor: a.type === 'Call' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200'
      });
    });

    // Add Meetings
    meetings.forEach(m => {
      items.push({
        id: `meeting_${m._id}`,
        date: new Date(m.scheduledTime),
        type: 'Meeting',
        icon: Calendar,
        title: `Meeting: ${m.title}`,
        body: m.description || 'No description provided.',
        meta: `Status: ${m.status} | Location: ${m.location || 'Not Specified'}`,
        badgeColor: m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      });
    });

    // Add Quotations
    quotations.forEach(q => {
      items.push({
        id: `quotation_${q._id}`,
        date: new Date(q.createdAt),
        type: 'Quotation',
        icon: FileText,
        title: `Quotation: #${q.quotationNumber}`,
        body: `Total Amount: ${fmtCurrency(q.totalAmount)}`,
        meta: `Status: ${q.status}`,
        badgeColor: q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200',
        action: q.status === 'Draft' ? () => handleConvertToOA(q) : null,
        actionLabel: 'Convert to OA'
      });
    });

    // Add Order Acknowledgments
    oas.forEach(o => {
      items.push({
        id: `oa_${o._id}`,
        date: new Date(o.createdAt),
        type: 'OA',
        icon: FileCheck,
        title: `Order Acknowledgment: #${o.oaNumber}`,
        body: `Committed Price: ${fmtCurrency(o.committedPrice)}`,
        meta: `Status: ${o.status}`,
        badgeColor: o.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      });
    });

    // Add Payments
    payments.forEach(p => {
      items.push({
        id: `payment_${p._id}`,
        date: new Date(p.paymentDate),
        type: 'Payment',
        icon: Wallet,
        title: `Payment: ${p.referenceNo ? '#' + p.referenceNo : 'Record'}`,
        body: `Received: ${fmtCurrency(p.amount)} via ${p.paymentMethod}`,
        meta: `Status: ${p.status}`,
        badgeColor: p.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
      });
    });

    // Sort descending by date
    return items.sort((a, b) => b.date - a.date);
  }, [activities, meetings, quotations, oas, payments]);

  // Lead score calculation
  const leadScore = useMemo(() => {
    let score = 0;
    // Status weight
    if (client?.leadStatus === 'Qualified') score += 20;
    if (client?.leadStatus === 'Proposal') score += 40;
    if (client?.leadStatus === 'Negotiation') score += 60;
    if (client?.leadStatus === 'Closed Won') score += 100;

    // Interactions weight
    score += Math.min(activities.length * 5, 25);
    score += Math.min(meetings.length * 10, 30);
    score += Math.min(quotations.length * 10, 25);
    score += Math.min(oas.length * 15, 20);

    return Math.min(score, 100);
  }, [client, activities, meetings, quotations, oas]);

  // Statistics summaries
  const statsSummary = useMemo(() => {
    const totalQuotationsVal = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);
    const totalOAsVal = oas.filter(o => o.status === 'Approved').reduce((s, o) => s + (o.committedPrice || 0), 0);
    const totalPaymentsVal = payments.filter(p => p.status === 'Confirmed').reduce((s, p) => s + (p.amount || 0), 0);

    return {
      totalQuotationsVal,
      totalOAsVal,
      totalPaymentsVal,
      activeMeetingsCount: meetings.filter(m => m.status === 'Scheduled' || m.status === 'Started').length
    };
  }, [meetings, quotations, oas, payments]);

  if (loading) return <PageLoader />;
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] bg-canvas text-ink">
        <AlertCircle className="h-8 w-8 text-tracker-danger mb-2" />
        <p className="text-sm font-medium">Client record not found</p>
        <Link to="/crm/contacts" className="text-xs text-[var(--module-accent)] hover:underline mt-2">Back to Contacts</Link>
      </div>
    );
  }

  return (
    <div data-module="project" className="flex flex-col gap-4 max-w-7xl mx-auto text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/crm/contacts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition py-1.5 px-3 rounded-[8px] border border-hairline bg-surface cursor-pointer">
          <ChevronLeft className="h-4 w-4" /> Back to Contacts
        </Link>
        <button onClick={fetchAllData} className="p-2 hover:bg-surface-1 rounded-full transition cursor-pointer">
          <RefreshCw className="h-4 w-4 text-ink-subtle" />
        </button>
      </div>

      {/* ─── CLIENT INFO CARD ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Profile Card */}
        <div className="lg:col-span-2 bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-[22px] font-bold">
                {(client.name?.[0] || "").toUpperCase()}
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-ink leading-tight">{client.name}</h1>
                <p className="text-[12px] text-ink-subtle flex items-center gap-1 mt-0.5">
                  <Building className="h-3 w-3" /> {client.businessType || "Company"}
                </p>
              </div>
            </div>

            {/* Transition Controls */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-ink-tertiary uppercase">Pipeline Status</span>
              <select
                value={client.leadStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-[8px] border outline-none cursor-pointer ${LEAD_STATUS_META[client.leadStatus]?.bg || ''}`}
              >
                {LEAD_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt} disabled={opt === 'Closed Won' && client.leadStatus !== 'Closed Won'}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-hairline-soft text-[13px]">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-ink-tertiary" />
              <span className="text-ink-subtle">Owner:</span>
              <span className="font-medium text-ink">{client.ownerName || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-ink-tertiary" />
              <span className="text-ink-subtle">Email:</span>
              <a href={`mailto:${client.email}`} className="text-[var(--module-accent)] hover:underline">{client.email || "—"}</a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-ink-tertiary" />
              <span className="text-ink-subtle">Phone:</span>
              <a href={`tel:${client.phone}`} className="text-ink font-medium">{client.phone || "—"}</a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-ink-tertiary" />
              <span className="text-ink-subtle">GST:</span>
              <span className="font-semibold text-ink uppercase">{client.gstIN || "—"}</span>
            </div>
          </div>
        </div>

        {/* Lead Score & Financials Card */}
        <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[13px] font-semibold text-ink-subtle uppercase">Lead Health Score</h3>
              <span className="text-[16px] font-bold text-purple-600 dark:text-purple-400">{leadScore}/100</span>
            </div>
            <div className="w-full h-2.5 bg-surface-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: `${leadScore}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-tertiary leading-normal">Score computes client activity weight, quotation amounts, and active pipeline phase.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-hairline-soft text-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-tertiary uppercase">Quotes</span>
              <span className="text-[13px] font-bold text-ink truncate mt-0.5">{fmtCurrency(statsSummary.totalQuotationsVal)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-tertiary uppercase">Won (OA)</span>
              <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">{fmtCurrency(statsSummary.totalOAsVal)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-tertiary uppercase">Collected</span>
              <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5">{fmtCurrency(statsSummary.totalPaymentsVal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TIMELINE & ACTION CENTER ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left/Middle Column: Timeline */}
        <div className="lg:col-span-2 space-y-4">

          {/* Timeline Feed */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-4">
            <h2 className="text-[14px] font-semibold text-ink border-b border-hairline-soft pb-2">Client Relationship Timeline</h2>

            <div className="relative border-l border-hairline pl-5 ml-2.5 space-y-6 py-2">
              {masterTimeline.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="relative group">
                    {/* Circle Dot with Icon */}
                    <div className="absolute -left-[32px] top-1 h-6 w-6 rounded-full border border-hairline bg-surface flex items-center justify-center text-ink-subtle group-hover:text-ink transition-colors shadow-sm">
                      <Icon className="h-3 w-3" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-[13px] font-semibold text-ink">{item.title}</h4>
                        <span className="text-[10px] text-ink-tertiary">{new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      <p className="text-[12px] text-ink-subtle leading-relaxed">{item.body}</p>

                      <div className="flex items-center justify-between gap-4">
                        {item.meta && <span className="text-[10px] text-ink-tertiary">{item.meta}</span>}
                        {item.action && (
                          <button
                            onClick={item.action}
                            className="text-[10px] font-bold text-[var(--module-accent)] hover:underline cursor-pointer"
                          >
                            {item.actionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {masterTimeline.length === 0 && (
                <div className="text-center py-10 text-ink-tertiary">
                  <MessageSquare className="h-8 w-8 mx-auto opacity-40 mb-2" />
                  <p className="text-[12px]">No activity logs found for this client.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions (Log Call, Schedule Meeting) */}
        <div className="space-y-4">

          {/* Action Log form */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
            <h3 className="text-[13px] font-semibold text-ink border-b border-hairline-soft pb-2">Log Interaction</h3>
            <form onSubmit={handleLogActivity} className="space-y-3">
              <div className="grid grid-cols-3 gap-1 bg-surface-1 p-0.5 rounded-[8px]">
                {['Note', 'Call', 'Email'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLogType(t)}
                    className={`py-1 text-[11px] font-semibold rounded-[6px] transition cursor-pointer ${logType === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <textarea
                value={logContent}
                onChange={e => setLogContent(e.target.value)}
                placeholder={`Write notes here regarding ${logType.toLowerCase()}...`}
                rows={3}
                className="w-full text-[12px] p-2 bg-surface border border-hairline rounded-[8px] text-ink placeholder:text-ink-tertiary outline-none focus:border-accent resize-none transition"
                required
              />
              <button
                type="submit"
                disabled={submittingLog}
                className="w-full py-1.5 tracker-btn-accent text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Log Interaction
              </button>
            </form>
          </div>

          {/* Schedule Meeting form */}
          <div className="bg-surface rounded-tracker-card border border-hairline p-5 shadow-sm space-y-3">
            <h3 className="text-[13px] font-semibold text-ink border-b border-hairline-soft pb-2">Schedule Meeting</h3>
            <form onSubmit={handleScheduleMeeting} className="space-y-3 text-[12px]">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-subtle">Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="Requirement discussion..."
                  className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-subtle">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-subtle">Duration (mins)</label>
                  <select
                    value={meetingDuration}
                    onChange={e => setMeetingDuration(e.target.value)}
                    className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition cursor-pointer"
                  >
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-subtle">Location / Link</label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={e => setMeetingLocation(e.target.value)}
                  placeholder="Google Meet or Office Room..."
                  className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-subtle">Agenda / Description</label>
                <textarea
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  placeholder="Meeting agenda items..."
                  rows={2}
                  className="w-full p-2 bg-surface border border-hairline rounded-[8px] text-ink outline-none focus:border-accent resize-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={submittingMeeting}
                className="w-full py-1.5 tracker-btn-accent font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Calendar className="h-3.5 w-3.5" /> Schedule Event
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
