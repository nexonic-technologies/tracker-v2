import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import FloatingCard from "@components/Common/FloatingCard";
import FormRenderer from "@components/Common/FormRenderer";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────────────────────────
const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const ACCENT_COLORS = [
  "#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
];
const avatarColor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
};

const LEAD_STATUS_META = {
  New: { dot: "bg-blue-400", chip: "bg-blue-50   text-blue-700   border-blue-200" },
  Qualified: { dot: "bg-violet-400", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  Proposal: { dot: "bg-amber-400", chip: "bg-amber-50  text-amber-700  border-amber-200" },
  Negotiation: { dot: "bg-orange-400", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  "Closed Won": { dot: "bg-green-400", chip: "bg-green-50  text-green-700  border-green-200" },
  "Closed Lost": { dot: "bg-red-400", chip: "bg-red-50    text-red-700    border-red-200" },
};

const MILESTONE_STATUS_META = {
  Pending: "bg-gray-100   text-gray-600",
  "In Progress": "bg-blue-100   text-blue-700",
  Completed: "bg-green-100  text-green-700",
  "On Hold": "bg-amber-100  text-amber-700",
};

const getLeadScore = (client) => {
  let score = 0;
  if (client.leadStatus === 'Qualified') score += 20;
  if (client.leadStatus === 'Proposal') score += 40;
  if (client.leadStatus === 'Negotiation') score += 60;
  if (client.leadStatus === 'Closed Won') score += 100;
  score += Math.min((client.milestones?.length || 0) * 10, 30);
  return Math.min(score, 100);
};

// ── Avatar ─────────────────────────────────────────────────────
const Avatar = ({ name, size = 34 }) => (
  <span
    className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
    style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
  >
    {initials(name) || "?"}
  </span>
);

// ── Milestone slide-over ────────────────────────────────────────
const MilestoneSheet = ({ client, onClose, onSaved }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ milestoneId: "", status: "Pending", dueDate: "", notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    axiosInstance
      .post("/populate/read/milestones", { limit: 500, filters: { Status: "Active" } })
      .then((res) => setMilestones(res.data?.data || []))
      .catch(() => setError("Could not load milestones."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.milestoneId) { setError("Please select a milestone."); return; }
    setSaving(true); setError("");
    try {
      await axiosInstance.put(`/populate/update/clients/${client._id}`, {
        $push: { milestones: { milestoneId: form.milestoneId, status: form.status, dueDate: form.dueDate || undefined, notes: form.notes || undefined } },
      });
      onSaved(); onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add milestone.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: "var(--tracker-surface,#fff)", borderLeft: "1px solid var(--tracker-border,#e5e7eb)", animation: "slideInRight .22s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#0EA5E9)" }}>Add Milestone</p>
            <h2 className="text-lg font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>{client.name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: "var(--tracker-ink-muted)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--tracker-ink)" }}>Milestone <span className="text-red-500">*</span></label>
            {loading ? <div className="h-10 rounded-lg bg-gray-100 animate-pulse" /> : (
              <select value={form.milestoneId} onChange={(e) => setForm((f) => ({ ...f, milestoneId: e.target.value }))} className="lmx-input" required>
                <option value="">— Select milestone —</option>
                {milestones.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--tracker-ink)" }}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="lmx-input">
              {["Pending", "In Progress", "Completed", "On Hold"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--tracker-ink)" }}>Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="lmx-input" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--tracker-ink)" }}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="lmx-input resize-none" placeholder="Optional…" />
          </div>
        </form>
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <button type="button" onClick={onClose} className="tracker-btn-secondary" disabled={saving}>Cancel</button>
          <button type="submit" onClick={handleSubmit} className="tracker-btn-accent flex items-center gap-2" disabled={saving}>
            {saving ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</> : "Add Milestone"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
};

// ── Milestone detail slide-over ────────────────────────────────
const MilestoneDetailSheet = ({ client, onClose }) => {
  const milestones = client?.milestones || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: "var(--tracker-surface,#fff)", borderLeft: "1px solid var(--tracker-border,#e5e7eb)", animation: "slideInRight .22s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#0EA5E9)" }}>Milestones</p>
            <h2 className="text-lg font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>{client.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>{milestones.length} milestone{milestones.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: "var(--tracker-ink-muted)" }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {milestones.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">🎯</div><p className="font-medium">No milestones yet</p></div>
          ) : milestones.map((m, i) => (
            <div key={i} className="rounded-xl p-4 border" style={{ background: "var(--tracker-surface-1,#f9fafb)", borderColor: "var(--tracker-border,#e5e7eb)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--module-accent,#0EA5E9)20", color: "var(--module-accent,#0EA5E9)" }}>{i + 1}</span>
                  <span className="font-semibold text-sm truncate">{m.milestoneId?.name || m.milestoneId || "Milestone"}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.Pending}`}>{m.status}</span>
              </div>
              {m.dueDate && <p className="text-xs mt-2.5 ml-9" style={{ color: "var(--tracker-ink-muted)" }}>📅 {new Date(m.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
              {m.notes && <p className="text-xs mt-1.5 ml-9" style={{ color: "var(--tracker-ink-muted)" }}>{m.notes}</p>}
            </div>
          ))}
        </div>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      </div>
    </div>
  );
};

// ── Search bar ─────────────────────────────────────────────────
const SearchBar = ({ value, onChange }) => (
  <div className="relative flex-1 max-w-xs">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--tracker-ink-muted)" }}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search contacts…" className="lmx-input pl-9 py-2 text-sm" />
  </div>
);

// ── Main page ──────────────────────────────────────────────────
const CRMContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [historyFormOpen, setHistoryFormOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");

  const contactFields = [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text" },
    { name: "companyName", label: "Company Name", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "designation", label: "Designation", type: "text" },
    { name: "source", label: "Source", type: "text" },
    {
      name: "leadTypeId",
      label: "Lead Type",
      type: "AutoComplete",
      source: "/populate/read/lead_types"
    },
    {
      name: "referenceTypeId",
      label: "Reference Type",
      type: "AutoComplete",
      source: "/populate/read/reference_types"
    },
    { name: "notes", label: "Notes", type: "textarea" },
    {
      name: "assignedTo",
      label: "Assigned Sales Rep",
      type: "AutoComplete",
      source: "/populate/read/employees"
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "New", label: "New" },
        { value: "Contacted", label: "Contacted" },
        { value: "Qualified", label: "Qualified" },
        { value: "Converted", label: "Converted" },
        { value: "Lost", label: "Lost" }
      ],
      defaultValue: "New"
    }
  ];

  const historyFields = [
    {
      name: "method",
      label: "Contact Method",
      type: "select",
      options: [
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
        { value: "Meeting", label: "Meeting" },
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "Other", label: "Other" }
      ],
      required: true
    },
    {
      name: "outcome",
      label: "Outcome",
      type: "select",
      options: [
        { value: "Interested", label: "Interested" },
        { value: "Not Interested", label: "Not Interested" },
        { value: "Follow Up", label: "Follow Up" },
        { value: "No Response", label: "No Response" },
        { value: "Converted", label: "Converted" }
      ],
      required: true
    },
    { name: "notes", label: "Notes / Interaction Details", type: "textarea" }
  ];

  const fetchContacts = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/contacts", { limit: 1000 });
      setContacts(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchContacts();
    if (searchParams.get("create") === "true" || searchParams.get("new") === "true") {
      setSelectedContact(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const handleContactSubmit = async (formData) => {
    try {
      if (selectedContact) {
        await axiosInstance.put(`/populate/update/contacts/${selectedContact._id}`, formData);
        toast.success("Contact updated successfully");
      } else {
        await axiosInstance.post("/populate/create/contacts", formData);
        toast.success("Contact created successfully");
      }
      setFormOpen(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (err) {
      console.error("Error saving contact:", err);
    }
  };

  const handleHistorySubmit = async (formData) => {
    try {
      const updatedHistory = [...(selectedContact.contactHistory || []), formData];
      const updatePayload = { contactHistory: updatedHistory };

      // Auto update status to Converted if outcome is Converted
      if (formData.outcome === "Converted") {
        updatePayload.status = "Converted";
      } else if (selectedContact.status === "New") {
        updatePayload.status = "Contacted";
      }

      await axiosInstance.put(`/populate/update/contacts/${selectedContact._id}`, updatePayload);
      toast.success("Interaction logged successfully");
      setHistoryFormOpen(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (err) {
      console.error("Error logging interaction:", err);
    }
  };

  const handleConvert = async (contact) => {
    try {
      // 1. Create client account
      const clientPayload = {
        name: contact.companyName || `${contact.firstName} ${contact.lastName || ''}`.trim() || 'New Client Prospect',
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        leadStatus: 'Qualified',
        Status: 'Inactive',
        leadType: contact.leadType || 'Normal',
        referenceType: contact.referenceType || 'Direct'
      };

      const clientRes = await axiosInstance.post('/populate/create/clients', clientPayload);
      const createdClient = clientRes.data?.data;
      const createdClientId = createdClient?._id;

      // 2. Update contact with converted status and linked client
      await axiosInstance.put(`/populate/update/contacts/${contact._id}`, {
        status: "Converted",
        convertedClientId: createdClientId || undefined
      });

      // 3. Log CRM activity if client was created
      if (createdClientId) {
        try {
          await axiosInstance.post('/populate/create/crm_activities', {
            clientId: createdClientId,
            type: 'System',
            content: `Contact ${contact.firstName} ${contact.lastName || ''} converted into Client Account.`
          });
        } catch (actErr) {
          console.warn('Could not log conversion activity:', actErr.message);
        }
      }

      toast.success(`Contact successfully converted to Client Account!`);
      fetchContacts();
    } catch (err) {
      console.error("Error converting contact:", err);
      toast.error(err.response?.data?.message || "Failed to convert contact to client");
    }
  };

  const tableData = contacts.map(c => ({
    _id: c._id,
    name: `${c.firstName} ${c.lastName || ""}`.trim(),
    companyName: c.companyName || "N/A",
    email: c.email || "N/A",
    phone: c.phone || "N/A",
    designation: c.designation || "N/A",
    status: c.status,
    interactions: c.contactHistory?.length || 0,
    contactData: c
  }));

  const filtered = query.trim()
    ? tableData.filter((r) => [r.name, r.companyName, r.email, r.phone].some(
      (v) => v && v.toLowerCase().includes(query.toLowerCase())
    ))
    : tableData;

  const stats = [
    { label: "Total", value: tableData.length, color: "text-gray-750" },
    { label: "Converted", value: tableData.filter((r) => r.status === "Converted").length, color: "text-green-600" },
    { label: "New", value: tableData.filter((r) => r.status === "New").length, color: "text-blue-600" },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-3xl font-bold text-gray-800">CRM Contacts Manager</h3>
          <p className="text-xs text-gray-500 mt-1">Manage leads, log interactions, and track client conversions.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={query} onChange={setQuery} />
          <button
            onClick={() => {
              setSelectedContact(null);
              setFormOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition text-sm font-semibold"
          >
            Add New Contact
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <TableGenerator
        data={filtered}
        hiddenColumns={["_id", "contactData"]}
        customRender={{
          status: (row) => (
            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${row.status === "Converted"
              ? "bg-green-100 text-green-800"
              : row.status === "Qualified"
                ? "bg-purple-100 text-purple-800"
                : row.status === "Contacted"
                  ? "bg-blue-100 text-blue-800"
                  : row.status === "Lost"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}>
              {row.status}
            </span>
          ),
          interactions: (row) => (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                {row.interactions} Interactions
              </span>
              <button
                onClick={() => {
                  setSelectedContact(row.contactData);
                  setHistoryFormOpen(true);
                }}
                className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs hover:bg-indigo-100"
              >
                Log Interaction
              </button>
              {row.status !== "Converted" && (
                <button
                  onClick={() => handleConvert(row.contactData)}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 font-medium"
                >
                  Convert to Client
                </button>
              )}
            </div>
          )
        }}
        onEdit={(row) => {
          setSelectedContact(row.contactData);
          setFormOpen(true);
        }}
      />

      {formOpen && (
        <FloatingCard
          title={selectedContact ? `Edit Contact: ${selectedContact.firstName}` : "Add New Contact"}
          onClose={() => {
            setFormOpen(false);
            setSelectedContact(null);
          }}
        >
          <FormRenderer
            fields={contactFields}
            defaultValue={selectedContact}
            onSubmit={handleContactSubmit}
          />
        </FloatingCard>
      )}

      {historyFormOpen && (
        <FloatingCard
          title={`Log Interaction: ${selectedContact?.firstName}`}
          onClose={() => {
            setHistoryFormOpen(false);
            setSelectedContact(null);
          }}
        >
          <FormRenderer
            fields={historyFields}
            onSubmit={handleHistorySubmit}
          />
        </FloatingCard>
      )}
    </div>
  );
};

export default CRMContacts;