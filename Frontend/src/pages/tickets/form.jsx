import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import toast from "react-hot-toast";
import FileViewerModal from "@components/Common/FileViewerModal";
import {
  ChevronLeft, Paperclip, X, Upload, FileIcon, FileText,
  FileSpreadsheet, FileArchive, PlayCircle, Music, ImageIcon,
  Loader2, Save, Plus, AlertCircle
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (type = "") => {
  const t = type.toLowerCase();
  if (t.startsWith("image")) return <ImageIcon size={18} className="text-pink-500 shrink-0" />;
  if (t.includes("pdf")) return <FileText size={18} className="text-red-500 shrink-0" />;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("sheet"))
    return <FileSpreadsheet size={18} className="text-green-500 shrink-0" />;
  if (t.includes("zip") || t.includes("rar"))
    return <FileArchive size={18} className="text-yellow-600 shrink-0" />;
  if (t.startsWith("video")) return <PlayCircle size={18} className="text-purple-500 shrink-0" />;
  if (t.startsWith("audio")) return <Music size={18} className="text-blue-500 shrink-0" />;
  return <FileIcon size={18} className="text-[var(--tracker-ink-subtle)] shrink-0" />;
};

// ── AutoComplete field ───────────────────────────────────────────────────────

const AutoCompleteField = ({ label, required, source, options: staticOpts, value, onChange, multiple, placeholder }) => {
  const [options, setOptions] = useState(staticOpts || []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(Boolean(staticOpts));
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const load = async () => {
    if (loaded || !source) return;
    try {
      const res = await axiosInstance.post(source);
      setOptions(res.data?.data || []);
      setLoaded(true);
    } catch (e) { console.error(e); }
  };

  const getName = (opt) => opt?.name || opt?.title || `${opt?.basicInfo?.firstName || ""} ${opt?.basicInfo?.lastName || ""}`.trim() || "";

  const filtered = options.filter(o => getName(o).toLowerCase().includes(search.toLowerCase()));

  const isSelected = (opt) => {
    if (multiple) return (value || []).some(v => (v?._id || v) === (opt?._id || opt));
    return (value?._id || value) === (opt?._id || opt);
  };

  const select = (opt) => {
    if (multiple) {
      const cur = value || [];
      const exists = cur.some(v => (v?._id || v) === (opt?._id || opt));
      onChange(exists ? cur.filter(v => (v?._id || v) !== (opt?._id || opt)) : [...cur, opt]);
    } else {
      onChange(opt);
      setOpen(false);
      setSearch("");
    }
  };

  const remove = (opt, e) => {
    e.stopPropagation();
    onChange((value || []).filter(v => (v?._id || v) !== (opt?._id || opt)));
  };

  const displayLabel = multiple
    ? null
    : value ? getName(value) : null;

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        onClick={() => { load(); setOpen(!open); }}
        className={`min-h-[42px] w-full px-3 py-2 rounded-xl border cursor-pointer flex items-center flex-wrap gap-1.5 bg-[var(--tracker-surface)] transition-all ${open ? "border-[var(--tracker-border-focus)] ring-1 ring-[var(--tracker-border-focus)]" : "border-[var(--tracker-border)] hover:border-[var(--tracker-ink-muted)]"
          }`}
      >
        {multiple && (value || []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--tracker-surface-2)] text-[12px] font-medium text-[var(--tracker-ink)]">
            {getName(v)}
            <span onClick={(e) => remove(v, e)} className="cursor-pointer text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-colors">
              <X size={11} />
            </span>
          </span>
        ))}
        {!multiple && displayLabel && (
          <span className="text-[13px] text-[var(--tracker-ink)]">{displayLabel}</span>
        )}
        {!displayLabel && !multiple && (
          <span className="text-[13px] text-[var(--tracker-ink-tertiary)]">{placeholder || `Select ${label}`}</span>
        )}
        {multiple && (value || []).length === 0 && (
          <span className="text-[13px] text-[var(--tracker-ink-tertiary)]">{placeholder || `Select ${label}`}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-xl shadow-xl overflow-hidden">
          {options.length > 5 && (
            <div className="p-2 border-b border-[var(--tracker-border-soft)]">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full px-3 py-1.5 text-[12.5px] rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] text-[var(--tracker-ink)] outline-none focus:border-[var(--tracker-border-focus)]"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--tracker-ink-subtle)]">No results</div>
            ) : filtered.map((opt, idx) => (
              <div
                key={opt?._id || idx}
                onClick={() => select(opt)}
                className={`px-3.5 py-2.5 text-[12.5px] cursor-pointer flex items-center justify-between transition-colors ${isSelected(opt)
                    ? "bg-[var(--module-ticket-light)] text-[var(--module-ticket)] font-semibold"
                    : "text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)]"
                  }`}
              >
                {getName(opt)}
                {isSelected(opt) && <span className="w-1.5 h-1.5 rounded-full bg-[var(--module-ticket)]" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Field wrapper ────────────────────────────────────────────────────────────

const Field = ({ label, required, children, className = "" }) => (
  <div className={className}>
    <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = `w-full px-3 py-2.5 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[13px] text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-tertiary)] outline-none focus:border-[var(--tracker-border-focus)] focus:ring-1 focus:ring-[var(--tracker-border-focus)] transition-all`;

// ── PRIORITY options ─────────────────────────────────────────────────────────

const PRIORITY_OPTS = [
  { _id: "Low", name: "Low" },
  { _id: "Medium", name: "Medium" },
  { _id: "High", name: "High" },
  { _id: "Critical", name: "Critical" },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN FORM PAGE
// ══════════════════════════════════════════════════════════════════════════════

const TicketsFormPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = Boolean(editId);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    clientId: null,
    product: null,
    title: "",
    userStory: "",
    type: null,
    priority: null,
    dueDate: "",
    assignedTo: [],
    impactAnalysis: "",
    url: "",
    acceptanceCriteria: "",
    description: "",
  });

  // ── Attachments ────────────────────────────────────────────────────────────
  const [pendingFiles, setPendingFiles] = useState([]);   // File objects staged for upload
  const [existingAttachments, setExistingAttachments] = useState([]); // loaded from edit record
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [viewerFile, setViewerFile] = useState(null);

  // ── Load record for edit ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.post(`/populate/read/tickets/${editId}`, {
          populateFields: {
            clientId: "name",
            type: "name,icon,color",
            assignedTo: "basicInfo.firstName,basicInfo.lastName",
            attachments: "filename,originalName,mimetype,size,path",
          }
        });
        const d = res.data?.data || {};
        setForm({
          clientId: d.clientId || null,
          product: d.product || null,
          title: d.title || "",
          userStory: d.userStory || "",
          type: d.type || null,
          priority: d.priority ? { _id: d.priority, name: d.priority } : null,
          dueDate: d.dueDate ? d.dueDate.split("T")[0] : "",
          assignedTo: d.assignedTo || [],
          impactAnalysis: d.impactAnalysis || "",
          url: d.url || "",
          acceptanceCriteria: d.acceptanceCriteria || "",
          description: d.description || "",
        });
        setExistingAttachments(d.attachments || []);
      } catch (e) {
        toast.error("Failed to load ticket");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, isEdit]);

  // ── File handling ──────────────────────────────────────────────────────────
  const addFiles = (files) => {
    const newFiles = Array.from(files).filter(
      f => !pendingFiles.some(p => p.name === f.name && p.size === f.size)
    );
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      // Build payload — resolve IDs from autocomplete objects
      const payload = {
        clientId: form.clientId?._id || form.clientId || undefined,
        product: form.product?._id || form.product || undefined,
        title: form.title,
        userStory: form.userStory || undefined,
        type: form.type?._id || form.type || undefined,
        priority: form.priority?._id || form.priority || undefined,
        dueDate: form.dueDate || undefined,
        assignedTo: (form.assignedTo || []).map(a => a?._id || a),
        impactAnalysis: form.impactAnalysis || undefined,
        url: form.url || undefined,
        acceptanceCriteria: form.acceptanceCriteria || undefined,
        description: form.description || undefined,
      };

      let ticketId = editId;

      if (isEdit) {
        await axiosInstance.put(`/populate/update/tickets/${editId}`, payload);
        toast.success("Ticket updated");
      } else {
        const res = await axiosInstance.post("/populate/create/tickets", payload);
        ticketId = res.data?.data?._id;
        toast.success("Ticket created");
      }

      // Upload each pending attachment linked to the ticket
      if (pendingFiles.length > 0 && ticketId) {
        let uploaded = 0;
        for (const file of pendingFiles) {
          try {
            const fd = new FormData();
            fd.append("ticketId", ticketId);
            fd.append("attachments", file);
            await axiosInstance.post("/populate/create/ticket_attachments", fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            uploaded++;
          } catch (err) {
            console.error("Attachment upload failed:", err);
            toast.error(`Failed to upload: ${file.name}`);
          }
        }
        if (uploaded > 0) toast.success(`${uploaded} attachment${uploaded > 1 ? "s" : ""} uploaded`);
      }

      navigate(isEdit ? `/Tickets/${ticketId}` : "/Tickets");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Tab definitions ────────────────────────────────────────────────────────
  const TABS = [
    { id: "details", label: "Details" },
    { id: "spec", label: "Specification" },
    { id: "attachments", label: `Attachments${pendingFiles.length > 0 ? ` (${pendingFiles.length})` : ""}` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tracker-canvas)] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[var(--module-ticket)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tracker-canvas)]" data-module="ticket">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-[var(--tracker-surface)] border-b border-[var(--tracker-border)] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/Tickets")}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors"
              >
                <ChevronLeft size={14} />
                Tickets
              </button>
              <span className="text-[var(--tracker-border)]">/</span>
              <h1 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                {isEdit ? "Edit Ticket" : "New Ticket"}
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--module-ticket)] text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isEdit ? "Update Ticket" : "Create Ticket"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Tab bar */}
          <div className="flex border-b border-[var(--tracker-border)]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-[12.5px] font-semibold transition-all border-b-2 -mb-px ${activeTab === tab.id
                    ? "border-[var(--module-ticket)] text-[var(--module-ticket)]"
                    : "border-transparent text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── DETAILS TAB ─────────────────────────────────────────────────── */}
          {activeTab === "details" && (
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5 sm:p-6 space-y-5">

              {/* Client + Product */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AutoCompleteField
                  label="Client" required
                  source="/populate/read/clients"
                  value={form.clientId}
                  onChange={v => set("clientId", v)}
                  placeholder="Select client"
                />
                <AutoCompleteField
                  label="Product" required
                  source="/populate/read/products"
                  value={form.product}
                  onChange={v => set("product", v)}
                  placeholder="Select product"
                />
              </div>

              {/* Title */}
              <Field label="Title" required className="col-span-2">
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="Brief description of the issue"
                  className={inputCls}
                />
              </Field>

              {/* User Story */}
              <Field label="User Story" className="col-span-2">
                <textarea
                  rows={4}
                  value={form.userStory}
                  onChange={e => set("userStory", e.target.value)}
                  placeholder="Describe the issue from a user's perspective…"
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {/* Type + Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AutoCompleteField
                  label="Type"
                  source="/populate/read/task_types"
                  value={form.type}
                  onChange={v => set("type", v)}
                  placeholder="Ticket type"
                />
                <AutoCompleteField
                  label="Priority"
                  options={PRIORITY_OPTS}
                  value={form.priority}
                  onChange={v => set("priority", v)}
                  placeholder="Select priority"
                />
              </div>

              {/* Due Date + Assignees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Due Date">
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => set("dueDate", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <AutoCompleteField
                  label="Assignees"
                  source="/populate/read/employees"
                  value={form.assignedTo}
                  onChange={v => set("assignedTo", v)}
                  multiple
                  placeholder="Assign team members"
                />
              </div>
            </div>
          )}

          {/* ── SPECIFICATION TAB ───────────────────────────────────────────── */}
          {activeTab === "spec" && (
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5 sm:p-6 space-y-5">

              <Field label="Impact Analysis">
                <textarea
                  rows={3}
                  value={form.impactAnalysis}
                  onChange={e => set("impactAnalysis", e.target.value)}
                  placeholder="What areas does this issue affect?"
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field label="Related URL">
                <input
                  type="url"
                  value={form.url}
                  onChange={e => set("url", e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                />
              </Field>

              <Field label="Acceptance Criteria">
                <textarea
                  rows={3}
                  value={form.acceptanceCriteria}
                  onChange={e => set("acceptanceCriteria", e.target.value)}
                  placeholder="What conditions must be met for this ticket to be resolved?"
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field label="Internal Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Internal notes (not visible to client)…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}

          {/* ── ATTACHMENTS TAB ─────────────────────────────────────────────── */}
          {activeTab === "attachments" && (
            <div className="space-y-4">

              {/* Existing attachments (edit mode) */}
              {isEdit && existingAttachments.length > 0 && (
                <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5">
                  <p className="text-[11px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wide mb-3">
                    Current Attachments ({existingAttachments.length})
                  </p>
                  <div className="space-y-2">
                    {existingAttachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)]">
                        {getFileIcon(att.mimetype)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--tracker-ink)] truncate">{att.originalName}</p>
                          <p className="text-[11px] text-[var(--tracker-ink-subtle)]">{formatBytes(att.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewerFile(att)}
                          className="text-[12px] font-medium text-[var(--module-ticket)] hover:underline shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragging
                    ? "border-[var(--module-ticket)] bg-[var(--module-ticket-light)]"
                    : "border-[var(--tracker-border)] bg-[var(--tracker-surface)] hover:border-[var(--tracker-ink-muted)] hover:bg-[var(--tracker-surface-1)]"
                  }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDragging ? "bg-[var(--module-ticket-light)]" : "bg-[var(--tracker-surface-2)]"
                  }`}>
                  <Upload size={24} className={isDragging ? "text-[var(--module-ticket)]" : "text-[var(--tracker-ink-subtle)]"} />
                </div>
                <div className="text-center">
                  <p className="text-[13.5px] font-semibold text-[var(--tracker-ink)]">
                    {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
                  </p>
                  <p className="text-[12px] text-[var(--tracker-ink-subtle)] mt-1">
                    Any file type accepted — PDFs, images, documents, archives
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => { addFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                />
              </div>

              {/* Note for new tickets */}
              {!isEdit && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                  <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-blue-700 leading-snug">
                    Attachments will be uploaded automatically after the ticket is created.
                  </p>
                </div>
              )}

              {/* Staged files list */}
              {pendingFiles.length > 0 && (
                <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold text-[var(--tracker-ink-subtle)] uppercase tracking-wide">
                      Files to Upload ({pendingFiles.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setPendingFiles([])}
                      className="text-[11px] text-red-500 hover:underline font-medium"
                    >
                      Remove all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {pendingFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] group">
                        <button
                          type="button"
                          onClick={() => setViewerFile(file)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-85 cursor-pointer"
                        >
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--tracker-ink)] truncate">{file.name}</p>
                            <p className="text-[11px] text-[var(--tracker-ink-subtle)]">{formatBytes(file.size)}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="opacity-0 group-hover:opacity-100 text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingFiles.length === 0 && (!isEdit || existingAttachments.length === 0) && (
                <div className="text-center py-4 text-[12px] text-[var(--tracker-ink-subtle)]">
                  No files staged yet. Use the drop zone above to add attachments.
                </div>
              )}
            </div>
          )}

          {/* ── Submit footer ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => navigate("/Tickets")}
              className="text-[12.5px] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[var(--module-ticket)] text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {submitting
                ? (pendingFiles.length > 0 ? "Saving & uploading…" : "Saving…")
                : (isEdit ? "Update Ticket" : "Create Ticket")}
            </button>
          </div>

        </form>
      </div>
      {viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  );
};

export default TicketsFormPage;
