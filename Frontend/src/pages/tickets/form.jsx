import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import toast from "react-hot-toast";
import FileViewerModal from "@components/Common/FileViewerModal";
import { generateTicketWithAI } from "@services/ticketAI";
import JarvisTicketAssist from "../../components/Jarvis/JarvisTicketAssist.jsx";
import {
  ChevronLeft, Paperclip, X, Upload, FileIcon, FileText,
  FileSpreadsheet, FileArchive, PlayCircle, Music, ImageIcon,
  Loader2, Save, Sparkles, CheckCircle2,
  Calendar, Trash2, Eye
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

  const load = useCallback(async () => {
    if (loaded || !source) return;
    try {
      const res = await axiosInstance.post(source);
      setOptions(res.data?.data || []);
      setLoaded(true);
    } catch (e) { console.error(e); }
  }, [loaded, source]);

  // If value is passed as string ID and options not loaded, load options to find name
  useEffect(() => {
    if (source && !loaded && value && (typeof value === "string" || !value.name)) {
      load();
    }
  }, [source, loaded, value, load]);

  const getName = (opt) => {
    if (!opt) return "";
    if (typeof opt === "string") {
      const found = options.find(o => o._id === opt);
      if (found) return getName(found);
      return opt;
    }
    return opt.name || opt.title || `${opt?.basicInfo?.firstName || ""} ${opt?.basicInfo?.lastName || ""}`.trim() || "";
  };

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
          <div className="flex items-center justify-between w-full">
            <span className="text-[13px] text-[var(--tracker-ink)] font-medium">{displayLabel}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="cursor-pointer text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-colors p-0.5 rounded"
              title="Clear selection"
            >
              <X size={12} />
            </span>
          </div>
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
    assignedTo: null,
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
  const dateInputRef = useRef(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [deletingAttId, setDeletingAttId] = useState(null);

  // ── AI generation state ────────────────────────────────────────────────────
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEngine, setAiEngine] = useState(null); // which engine was used

  // ── Load record for edit ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.post(`/populate/read/tickets/${editId}`, {
          populateFields: {
            clientId: "name",
            productId: "name",
            type: "name,icon,color",
            assignedTo: "basicInfo.firstName,basicInfo.lastName",
            attachments: "filename,originalName,mimetype,size,path",
          }
        });
        const d = res.data?.data || {};

        let safeDueDate = "";
        if (d.dueDate) {
          const parsed = new Date(d.dueDate);
          if (!isNaN(parsed.getTime())) {
            safeDueDate = parsed.toISOString().split("T")[0];
          }
        }

        setForm({
          clientId: d.clientId || null,
          product: d.productId || d.product || null,
          title: d.title || "",
          userStory: d.userStory || "",
          type: d.type || null,
          priority: d.priority ? { _id: d.priority, name: d.priority } : null,
          dueDate: safeDueDate,
          assignedTo: Array.isArray(d.assignedTo) ? (d.assignedTo[0] || null) : (d.assignedTo || null),
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

  // ── File handling & Clipboard Paste ────────────────────────────────────────
  const addFiles = useCallback((files) => {
    const newFiles = Array.from(files).filter(
      f => !pendingFiles.some(p => p.name === f.name && p.size === f.size)
    );
    if (newFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
  }, [pendingFiles]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  // Global clipboard paste listener for screenshots / copied files
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            const fileName = file.name && file.name !== "image.png"
              ? file.name
              : `screenshot_${Date.now()}_${i + 1}.png`;
            pastedFiles.push(new File([file], fileName, { type: file.type || "image/png" }));
          }
        }
      }
      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
        toast.success(`${pastedFiles.length} file${pastedFiles.length > 1 ? "s" : ""} pasted from clipboard`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles]);

  // ── Delete Existing Attachment ─────────────────────────────────────────────
  const handleDeleteExistingAttachment = async (attId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this attachment?")) return;
    try {
      setDeletingAttId(attId);
      await axiosInstance.delete(`/populate/delete/ticket_attachments/${attId}`);
      setExistingAttachments(prev => prev.filter(a => a._id !== attId));
      toast.success("Attachment removed");
    } catch (err) {
      console.error("Attachment deletion failed:", err);
      toast.error(err.response?.data?.message || "Failed to remove attachment");
    } finally {
      setDeletingAttId(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (form.dueDate) {
      const parsedDate = new Date(form.dueDate);
      if (isNaN(parsedDate.getTime())) {
        toast.error("Invalid Due Date format");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Build payload — resolve IDs from autocomplete objects
      const payload = {
        clientId: form.clientId?._id || form.clientId || undefined,
        productId: form.product?._id || form.product || undefined,
        product: form.product?._id || form.product || undefined,
        title: form.title.trim(),
        userStory: form.userStory || undefined,
        type: form.type?._id || form.type || undefined,
        priority: form.priority?._id || form.priority?.name || form.priority || undefined,
        dueDate: form.dueDate || undefined,
        assignedTo: form.assignedTo ? [form.assignedTo?._id || form.assignedTo] : [],
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

  // ── AI ticket generation ───────────────────────────────────────────────────
  const handleAIGenerate = useCallback(async () => {
    if (!form.title?.trim()) {
      toast.error("Enter a title first so AI has context to work with.");
      return;
    }
    setAiGenerating(true);
    setAiEngine(null);
    try {
      const clientName = form.clientId?.name || form.clientId?.title || '';
      const productName = form.product?.name || form.product?.title || '';
      const result = await generateTicketWithAI({
        title: form.title,
        clientName,
        productName
      });
      setForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        userStory: result.userStory || prev.userStory,
        impactAnalysis: result.impactAnalysis || prev.impactAnalysis,
        acceptanceCriteria: result.acceptanceCriteria || prev.acceptanceCriteria,
        description: result.description || prev.description,
        priority: result.priority ? { _id: result.priority, name: result.priority } : prev.priority,
        dueDate: result.suggestedDueDate || prev.dueDate,
      }));
      setAiEngine(result.engine);
      toast.success(`AI filled all fields via ${result.engine}`);
    } catch (err) {
      toast.error(err.message || "AI generation failed. Try again.");
    } finally {
      setAiGenerating(false);
    }
  }, [form.title, form.clientId, form.product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tracker-canvas)] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-[var(--module-ticket)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tracker-canvas)]" data-module="ticket">

      {/* ── Top Header Bar ── */}
      <div className="bg-[var(--tracker-surface)] border-b border-[var(--tracker-border)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/Tickets")}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                Tickets
              </button>
              <span className="text-[var(--tracker-border)]">/</span>
              <h1 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                {isEdit ? "Edit Ticket" : "New Ticket"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: 2-Column Responsive Layout (Main Input on left, Metadata on right) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── LEFT COLUMN (Main content / User Input): 8 cols ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Core Issue Section */}
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider">
                  Ticket Content
                </h2>
                <div className="flex items-center gap-2">
                  {aiEngine && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                      <CheckCircle2 size={9} /> Filled by {aiEngine}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={aiGenerating}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-bold border transition-all duration-150 cursor-pointer ${aiGenerating
                      ? 'border-violet-300 bg-violet-50 text-violet-400 cursor-wait'
                      : 'border-violet-400/50 bg-violet-500/8 text-violet-600 hover:bg-violet-500/15 hover:border-violet-500/60'
                      }`}
                  >
                    {aiGenerating
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Sparkles size={12} className="animate-[pulse_2s_ease-in-out_infinite]" />}
                    {aiGenerating ? 'Generating…' : 'Fill with AI'}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wide mb-1.5">
                  Title <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => { set("title", e.target.value); setAiEngine(null); }}
                  placeholder="Enter a brief descriptive title…"
                  className={inputCls}
                />

                <JarvisTicketAssist
                  title={form.title}
                  description={form.userStory || form.description}
                  priority={form.priority?.name || form.priority}
                  client={form.clientId?.name || form.clientId}
                  category={form.category?.name || form.category}
                  onApply={({ title: refinedTitle, description: refinedDesc, priority: refinedPriority, type: refinedType }) => {
                    if (refinedTitle) set("title", refinedTitle);
                    if (refinedDesc) set("userStory", refinedDesc);
                    if (refinedPriority) set("priority", { _id: refinedPriority, name: refinedPriority });
                    if (refinedType) set("type", { _id: refinedType, name: refinedType });
                    toast.success("Applied J.A.R.V.I.S. ticket proposal!");
                  }}
                />
              </div>

              {/* User Story / Description with embedded attachments & clipboard paste */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wide">
                    User Story / Description
                  </label>
                  <span className="text-[10.5px] text-[var(--tracker-ink-tertiary)] flex items-center gap-1">
                    <Sparkles size={11} className="text-[var(--module-ticket)]" />
                    Ctrl+V to paste screenshot
                  </span>
                </div>
                <div
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    const pastedFiles = [];
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      if (item.kind === "file") {
                        const file = item.getAsFile();
                        if (file) {
                          const fileName = file.name && file.name !== "image.png"
                            ? file.name
                            : `screenshot_${Date.now()}_${i + 1}.png`;
                          pastedFiles.push(new File([file], fileName, { type: file.type || "image/png" }));
                        }
                      }
                    }
                    if (pastedFiles.length > 0) {
                      addFiles(pastedFiles);
                      toast.success(`${pastedFiles.length} file${pastedFiles.length > 1 ? "s" : ""} attached from clipboard`);
                    }
                  }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`rounded-xl border transition-all overflow-hidden ${isDragging
                    ? "border-[var(--module-ticket)] bg-[var(--module-ticket-light)]/20"
                    : "border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] focus-within:border-[var(--module-ticket)] focus-within:bg-[var(--tracker-surface)]"
                    }`}
                >
                  <textarea
                    rows={5}
                    value={form.userStory}
                    onChange={e => set("userStory", e.target.value)}
                    placeholder="Describe the issue from a user's perspective (or paste screenshots with Ctrl+V)…"
                    className="w-full px-3.5 py-2.5 text-[13px] bg-transparent border-0 outline-none text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] resize-none"
                  />

                  {/* Existing attachments chips (edit mode) */}
                  {isEdit && existingAttachments.length > 0 && (
                    <div className="px-3.5 py-2 border-t border-[var(--tracker-border-soft)] bg-[var(--tracker-surface)]/50 flex flex-wrap gap-2">
                      {existingAttachments.map((att, idx) => (
                        <div key={att._id || idx} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] text-[11.5px] max-w-full">
                          {att.mimetype?.startsWith("image/") && att.path ? (
                            <div className="w-5 h-5 rounded overflow-hidden shrink-0">
                              <img src={att.path} alt={att.originalName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                          ) : (
                            getFileIcon(att.mimetype)
                          )}
                          <span className="font-medium text-[var(--tracker-ink)] truncate max-w-[140px]">{att.originalName}</span>
                          <span className="text-[10px] text-[var(--tracker-ink-subtle)]">({formatBytes(att.size)})</span>
                          <button
                            type="button"
                            onClick={() => setViewerFile(att)}
                            className="text-[var(--module-ticket)] hover:underline text-[11px] font-semibold cursor-pointer ml-1"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            disabled={deletingAttId === att._id}
                            onClick={(e) => handleDeleteExistingAttachment(att._id, e)}
                            title="Remove attachment"
                            className="text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-colors p-0.5 cursor-pointer disabled:opacity-50"
                          >
                            {deletingAttId === att._id ? <Loader2 size={10} className="animate-spin" /> : <X size={11} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staged pending files chips */}
                  {pendingFiles.length > 0 && (
                    <div className="px-3.5 py-2 border-t border-[var(--tracker-border-soft)] bg-[var(--tracker-surface)]/50 flex flex-wrap gap-2">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--module-ticket)]/30 bg-[var(--module-ticket-light)]/40 text-[11.5px] max-w-full">
                          {getFileIcon(file.type)}
                          <span className="font-medium text-[var(--tracker-ink)] truncate max-w-[140px]">{file.name}</span>
                          <span className="text-[10px] text-[var(--tracker-ink-subtle)]">({formatBytes(file.size)})</span>
                          <button
                            type="button"
                            onClick={() => setViewerFile(file)}
                            className="text-[var(--module-ticket)] hover:underline text-[11px] font-semibold cursor-pointer ml-0.5"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            title="Remove file"
                            className="text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-colors p-0.5 cursor-pointer ml-0.5"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom toolbar inside User Story container */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--tracker-border-soft)] bg-[var(--tracker-surface-2)]/40">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer"
                        title="Attach files or screenshots"
                      >
                        <Paperclip size={13} className="text-[var(--module-ticket)]" />
                        <span>Attach File</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => { addFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      />
                      <span className="text-[10.5px] text-[var(--tracker-ink-tertiary)] hidden sm:inline">
                        Paste screenshot (Ctrl+V) or drag & drop
                      </span>
                    </div>

                    {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
                      <span className="text-[10.5px] font-medium text-[var(--tracker-ink-muted)]">
                        {existingAttachments.length + pendingFiles.length} file{existingAttachments.length + pendingFiles.length > 1 ? "s" : ""} attached
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications Card */}
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5 sm:p-6 space-y-4 shadow-sm">
              <h2 className="text-[12px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider">
                Specifications & Context
              </h2>

              <Field label="Acceptance Criteria">
                <textarea
                  rows={3}
                  value={form.acceptanceCriteria}
                  onChange={e => set("acceptanceCriteria", e.target.value)}
                  placeholder="What conditions must be met for this ticket to be resolved?"
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Impact Analysis">
                  <textarea
                    rows={2}
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
              </div>

              <Field label="Internal Description / Notes">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Internal notes (team only, not visible to client)…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Metadata / Classification & Actions): 4 cols ── */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

            {/* Metadata Card */}
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-5 space-y-4 shadow-sm">
              <h2 className="text-[12px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider">
                Properties
              </h2>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
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

              <Field label="Due Date">
                <div className="relative flex items-center">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={form.dueDate}
                    onChange={e => set("dueDate", e.target.value)}
                    onClick={(e) => {
                      if (typeof e.target.showPicker === "function") {
                        try {
                          e.target.showPicker();
                        } catch (err) {
                          console.debug("Date picker unsupported:", err);
                        }
                      }
                    }}
                    className={`${inputCls} pr-9 cursor-pointer`}
                  />
                  <div className="absolute right-2.5 flex items-center gap-1">
                    {form.dueDate && (
                      <button
                        type="button"
                        onClick={() => set("dueDate", "")}
                        title="Clear date"
                        className="text-[var(--tracker-ink-subtle)] hover:text-red-500 p-0.5 rounded transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (dateInputRef.current && typeof dateInputRef.current.showPicker === "function") {
                          try {
                            dateInputRef.current.showPicker();
                          } catch (err) {
                            console.debug("Date picker unsupported:", err);
                          }
                        } else {
                          dateInputRef.current?.focus();
                        }
                      }}
                      className="text-[var(--tracker-ink-muted)] hover:text-[var(--module-ticket)] transition-colors p-0.5"
                    >
                      <Calendar size={14} />
                    </button>
                  </div>
                </div>
              </Field>

              <AutoCompleteField
                label="Assignee"
                source="/populate/read/employees"
                value={form.assignedTo}
                onChange={v => set("assignedTo", v)}
                placeholder="Assign team member"
              />
            </div>

            {/* Actions Card */}
            <div className="bg-[var(--tracker-surface)] rounded-2xl border border-[var(--tracker-border)] p-4 shadow-sm flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/Tickets")}
                className="px-4 py-2 rounded-xl text-[12.5px] font-medium text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--module-ticket)] text-white text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {submitting
                  ? (pendingFiles.length > 0 ? "Saving & uploading…" : "Saving…")
                  : (isEdit ? "Update Ticket" : "Create Ticket")}
              </button>
            </div>

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
