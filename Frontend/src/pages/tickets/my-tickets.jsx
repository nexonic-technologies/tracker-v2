import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import TableGenerator from "@components/Common/TableGenerator";
import FormRenderer from "@components/Common/FormRenderer";
import ProfileImage from "@components/Common/ProfileImage";
import { Plus, User, X, Pencil, Search, ChevronDown, SlidersHorizontal } from "lucide-react";

const PRIORITY_CLS = {
  Critical: "bg-[var(--tracker-danger-light)]  text-[var(--tracker-danger)]",
  High:     "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Medium:   "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  Low:      "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
};
const STATUS_CLS = {
  "Open":        "bg-[var(--tracker-info-light)]    text-[var(--tracker-info)]",
  "In Progress": "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]",
  "Review":      "bg-[var(--module-hr-light)]        text-[var(--module-hr)]",
  "Testing":     "bg-[var(--brand-teal-light)]       text-[var(--brand-teal)]",
  "Completed":   "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]",
  "Closed":      "bg-surface-2 text-ink-muted",
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 tracker-overlay z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-surface rounded-tracker-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      style={{ boxShadow: "var(--tracker-shadow-overlay)" }}>
      <div className="flex items-center justify-between px-6 py-5 text-white rounded-t-[16px]"
        style={{ background: "linear-gradient(135deg, #9F1239 0%, var(--module-ticket) 100%)" }}>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="relative">
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value || null)}
      className="appearance-none lmx-input py-1.5 pl-3 pr-7 text-[12px] cursor-pointer min-w-[120px]"
      style={value ? {
        borderColor: "var(--module-ticket)",
        color: "var(--module-ticket)",
        background: "var(--module-ticket-light)"
      } : {}}
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle" />
  </div>
);

const STATUSES   = ["Open", "In Progress", "Review", "Testing", "Completed", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];

const MyTickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [showFilters, setShowFilters]     = useState(false);

  const [search,    setSearch]    = useState("");
  const [fStatus,   setFStatus]   = useState(null);
  const [fPriority, setFPriority] = useState(null);

  useEffect(() => { fetchMyTickets(); }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/tickets", {
        filter: { $or: [{ createdBy: user.id }, { assignedTo: user.id }] },
        fields: "title,type,priority,status,dueDate,createdAt,updatedAt,assignedTo,createdBy",
      });
      setTickets(res.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async (formData) => {
    try {
      await axiosInstance.post("/populate/create/tickets", { ...formData, createdBy: user.id });
      fetchMyTickets(); setShowCreate(false);
    } catch (e) { console.error(e); throw e; }
  };

  const handleUpdate = async (formData) => {
    try {
      await axiosInstance.put(`/populate/update/tickets/${editingTicket._id}`, formData);
      fetchMyTickets(); setEditingTicket(null);
    } catch (e) { console.error(e); throw e; }
  };

  const ticketFormFields = [
    { name: "title",     label: "Title",       type: "text",     placeholder: "Brief description of the issue", gridClass: "col-span-2" },
    { name: "userStory", label: "Description", type: "textarea", placeholder: "Detailed description...", rows: 4, gridClass: "col-span-2" },
    { name: "product",   label: "Product",     type: "text",     placeholder: "Product name" },
    { name: "type",      label: "Type",        type: "AutoComplete", source: "", options: [
      { _id: "Bug", name: "Bug" }, { _id: "Feature", name: "Feature" },
      { _id: "Enhancement", name: "Enhancement" }, { _id: "Support", name: "Support" },
    ]},
    { name: "priority",  label: "Priority",    type: "AutoComplete", source: "", options: [
      { _id: "Low", name: "Low" }, { _id: "Medium", name: "Medium" },
      { _id: "High", name: "High" }, { _id: "Critical", name: "Critical" },
    ]},
    { name: "dueDate",   label: "Due Date",    type: "date" },
  ];

  const displayed = useMemo(() => {
    let d = tickets;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.userStory || "").toLowerCase().includes(q)
      );
    }
    if (fStatus)   d = d.filter(t => t.status === fStatus);
    if (fPriority) d = d.filter(t => t.priority === fPriority);
    return [...d].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [tickets, search, fStatus, fPriority]);

  const activeFilters = [fStatus, fPriority].filter(Boolean).length;
  const clearFilters  = () => { setSearch(""); setFStatus(null); setFPriority(null); };

  const createdByMe  = tickets.filter(t => t.createdBy?._id === user.id || t.createdBy === user.id).length;
  const assignedToMe = tickets.filter(t => t.assignedTo?.some(a => (a._id || a) === user.id)).length;
  const openCount    = tickets.filter(t => t.status === "Open").length;

  const customRender = {
    priority: (t) => (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tracker-sm text-[12px] font-semibold ${PRIORITY_CLS[t.priority] || PRIORITY_CLS.Medium}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {t.priority || "Medium"}
      </span>
    ),
    status: (t) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${STATUS_CLS[t.status] || "bg-surface-2 text-ink-muted"}`}>
        {t.status}
      </span>
    ),
    type: (t) => (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--module-ticket-light)] text-[var(--module-ticket)]">
        {t.type?.name || t.type || "Bug"}
      </span>
    ),
    title: (t) => (
      <span
        onClick={() => navigate(`/Tickets/${t._id}`)}
        className="max-w-[260px] truncate block font-medium text-[13px] text-ink hover:text-[var(--module-ticket)] cursor-pointer transition-colors"
        title={t.title}
      >
        {t.title || "-"}
      </span>
    ),
    __actions: (t) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => setEditingTicket(t)}
          className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-tracker-md bg-[var(--module-ticket-light)] text-[var(--module-ticket)] hover:bg-[var(--module-ticket)] hover:text-white transition-colors" title="Edit">
          <Pencil size={12} />
        </button>
      </div>
    ),
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--module-ticket)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6" data-module="ticket">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="lmx-page-eyebrow mb-1">SUPPORT TICKETS</p>
          <h1 className="text-[22px] font-semibold text-ink flex items-center gap-2 tracking-tight">
            <User size={18} style={{ color: "var(--module-ticket)" }} />
            My Tickets
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--module-ticket-light)] text-[var(--module-ticket)]">{createdByMe} Created</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--tracker-success-light)] text-[var(--tracker-success)]">{assignedToMe} Assigned</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--tracker-info-light)] text-[var(--tracker-info)]">{openCount} Open</span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 self-start">
          <Plus size={13} /> New Ticket
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="tracker-card-plain p-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search my tickets…"
              className="lmx-input pl-8 pr-8 py-1.5 text-[12px]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-ink-subtle" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold border transition-colors ${
              showFilters || activeFilters > 0
                ? "border-[var(--module-ticket)] bg-[var(--module-ticket-light)] text-[var(--module-ticket)]"
                : "border-hairline bg-surface text-ink-muted hover:text-ink"
            }`}>
            <SlidersHorizontal size={13} />
            Filters {activeFilters > 0 && (
              <span className="ml-0.5 bg-[var(--module-ticket)] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
          {activeFilters > 0 && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-tracker-md bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)]">
              <X size={10} /> Clear all
            </button>
          )}
          {(search || activeFilters > 0) && (
            <span className="ml-auto text-[12px] text-ink-muted font-medium">
              {displayed.length} / {tickets.length} shown
            </span>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-hairline-soft">
            <FilterSelect label="All Statuses"   value={fStatus}   onChange={setFStatus}   options={STATUSES.map(s => ({ value: s, label: s }))} />
            <FilterSelect label="All Priorities" value={fPriority} onChange={setFPriority} options={PRIORITIES.map(p => ({ value: p, label: p }))} />
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <TableGenerator
          title="My Ticket List"
          data={displayed}
          customRender={customRender}
          customColumns={["title", "type", "priority", "status", "dueDate", "createdAt"]}
          enableActions
          onEdit={t => setEditingTicket(t)}
        />
      </div>

      {showCreate && (
        <Modal title="Create New Ticket" onClose={() => setShowCreate(false)}>
          <FormRenderer fields={ticketFormFields} onSubmit={handleCreate}
            submitButton={{ text: "Create Ticket", color: "red" }} />
        </Modal>
      )}

      {editingTicket && (
        <Modal title="Edit Ticket" onClose={() => setEditingTicket(null)}>
          <FormRenderer fields={ticketFormFields} data={editingTicket} onSubmit={handleUpdate}
            submitButton={{ text: "Save Changes", color: "red" }} />
        </Modal>
      )}
    </div>
  );
};

export default MyTickets;
