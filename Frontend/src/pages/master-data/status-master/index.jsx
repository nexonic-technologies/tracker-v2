import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";
import {
  GitMerge, Plus, Trash2, Save, Check, ArrowRight,
  ToggleLeft, ToggleRight, ShieldCheck, Flag, Tag,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  "#6B7280", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
  "#F97316", "#6366F1",
];

const KNOWN_MODELS = [
  "tasks", "tickets", "leaves", "expenses", "regularizations",
  "payrolls", "payroll_runs", "attendances", "daily_activities",
];

// meta-status options with color + description
const META_STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "#10B981", desc: "Currently being worked on" },
  { value: "draft", label: "Draft", color: "#6B7280", desc: "Not started / awaiting action" },
  { value: "archive", label: "Archive", color: "#8B5CF6", desc: "Done, kept for reference" },
  { value: "deleted", label: "Deleted", color: "#EF4444", desc: "Soft-deleted / removed" },
];

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ─── Micro-components ─────────────────────────────────────────────────────────
const ColorDot = ({ color, selected, onClick }) => (
  <button onClick={onClick} title={color}
    className={`w-5 h-5 rounded-full border-2 transition-transform flex-shrink-0 ${selected ? "scale-125 border-ink" : "border-transparent hover:scale-110"}`}
    style={{ background: color }}
  />
);

const StatusChip = ({ label, color, size = "sm" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${size === "xs" ? "text-[11px]" : "text-[12px]"}`}
    style={{ background: color + "22", color }}>
    {label}
  </span>
);

const MetaBadge = ({ value }) => {
  const opt = META_STATUS_OPTIONS.find(o => o.value === value) || META_STATUS_OPTIONS[0];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: opt.color + "18", color: opt.color }}>
      <Tag size={9} />
      {opt.label}
    </span>
  );
};

const TerminalBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EF444420] text-[#EF4444]">
    <Flag size={9} /> Terminal
  </span>
);

// ─── Default Meta Statuses ───────────────────────────────────────────────────
const DEFAULT_META_STATUSES = [
  { key: "active", label: "Active", color: "#10B981", order: 0, isDefault: true },
  { key: "inactive", label: "Inactive", color: "#6B7280", order: 1 },
  { key: "draft", label: "Draft", color: "#3B82F6", order: 2 },
  { key: "archive", label: "Archive", color: "#8B5CF6", order: 3 },
  { key: "deleted", label: "Deleted", color: "#EF4444", order: 4 },
];

// ─── Status Config Panel ──────────────────────────────────────────────────────
const status_configsPanel = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [subTab, setSubTab] = useState("workflow"); // "workflow" | "meta"
  const [loading, setLoading] = useState(false);

  const BLANK_STATUS = { key: "", label: "", color: COLOR_PALETTE[0], isTerminal: false, isDefault: false };
  const [newStatus, setNewStatus] = useState(BLANK_STATUS);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/populate/read/status_configss", {});
      setConfigs(res.data.data || []);
    } catch { toast.error("Failed to load status configs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const selectModel = (modelName) => {
    setSelectedModel(modelName);
    const existing = configs.find(c => c.modelName === modelName);
    const meta = (existing?.metaStatuses && existing.metaStatuses.length > 0)
      ? existing.metaStatuses.map(s => ({ ...s }))
      : DEFAULT_META_STATUSES.map(s => ({ ...s }));
    const workflow = (existing?.workflowStatuses || []).map(s => ({ ...s }));

    setEditConfig({
      _id: existing?._id,
      modelName,
      label: existing?.label || (capitalize(modelName) + " Statuses"),
      metaStatuses: meta,
      workflowStatuses: workflow,
    });
    setNewStatus(BLANK_STATUS);
    setSubTab("workflow");
  };

  const updateMetaField = (idx, field, value) => {
    setEditConfig(prev => {
      let updated = prev.metaStatuses.map((s, i) => i === idx ? { ...s, [field]: value } : s);
      if (field === "isDefault" && value === true) {
        updated = updated.map((s, i) => i === idx ? s : { ...s, isDefault: false });
      }
      return { ...prev, metaStatuses: updated };
    });
  };

  const updateWorkflowField = (idx, field, value) => {
    setEditConfig(prev => {
      let updated = prev.workflowStatuses.map((s, i) => i === idx ? { ...s, [field]: value } : s);
      if (field === "isDefault" && value === true) {
        updated = updated.map((s, i) => i === idx ? s : { ...s, isDefault: false });
      }
      return { ...prev, workflowStatuses: updated };
    });
  };

  const addWorkflowStatus = () => {
    if (!newStatus.key.trim() || !newStatus.label.trim()) return toast.error("Key and label required");
    if (editConfig.workflowStatuses.some(s => s.key === newStatus.key)) return toast.error("Key already exists");
    setEditConfig(prev => {
      const isFirst = prev.workflowStatuses.length === 0;
      return {
        ...prev,
        workflowStatuses: [
          ...prev.workflowStatuses,
          { ...newStatus, isDefault: isFirst || newStatus.isDefault, order: prev.workflowStatuses.length }
        ],
      };
    });
    setNewStatus(BLANK_STATUS);
  };

  const removeWorkflowStatus = (idx) => {
    setEditConfig(prev => ({
      ...prev,
      workflowStatuses: prev.workflowStatuses.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })),
    }));
  };

  const save = async () => {
    try {
      const payload = { ...editConfig };
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;
      if (editConfig._id) {
        await axiosInstance.put(`/populate/update/status_configss/${editConfig._id}`, payload);
      } else {
        await axiosInstance.post("/populate/create/status_configss", payload);
      }
      toast.success("Saved successfully!");
      fetchConfigs();
    } catch { toast.error("Save failed"); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Model selector */}
      <div className="bg-surface border border-hairline rounded-tracker-card p-4">
        <h3 className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-3">Select Model</h3>
        <div className="space-y-1">
          {KNOWN_MODELS.map(m => {
            const has = configs.some(c => c.modelName === m);
            const cfg = configs.find(c => c.modelName === m);
            const workflowCount = cfg?.workflowStatuses?.length || 0;
            const terminals = cfg?.workflowStatuses?.filter(s => s.isTerminal).length || 0;
            return (
              <button key={m} onClick={() => selectModel(m)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-tracker-md text-sm transition-colors ${selectedModel === m ? "bg-[var(--tracker-accent-light)] text-[var(--tracker-accent)]" : "hover:bg-surface-1 text-ink"}`}
              >
                <span>{capitalize(m)}</span>
                <div className="flex items-center gap-1.5">
                  {terminals > 0 && <span className="text-[10px] text-[#EF4444]" title={`${terminals} terminal statuses`}><Flag size={10} /></span>}
                  {workflowCount > 0 && <span className="text-[10px] bg-surface-1 px-1.5 py-0.5 rounded text-ink-muted font-mono">{workflowCount}</span>}
                  {has && <Check size={12} className="text-[var(--tracker-success)]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status editor */}
      <div className="lg:col-span-2 bg-surface border border-hairline rounded-tracker-card p-4">
        {!editConfig ? (
          <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">
            ← Select a model to configure its statuses
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">{editConfig.label}</h3>
                <p className="text-[11px] text-ink-subtle mt-0.5">
                  Configure lifecycle and operational pipeline statuses
                </p>
              </div>
              <button onClick={save} className="tracker-btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                <Save size={13} /> Save Config
              </button>
            </div>

            {/* Sub-tab selection */}
            <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-tracker-md w-fit mb-4">
              <button onClick={() => setSubTab("workflow")}
                className={`px-4 py-1.5 rounded-tracker-sm text-xs font-semibold transition-colors ${subTab === "workflow" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
                Workflow Statuses
              </button>
              <button onClick={() => setSubTab("meta")}
                className={`px-4 py-1.5 rounded-tracker-sm text-xs font-semibold transition-colors ${subTab === "meta" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
                Meta Statuses
              </button>
            </div>

            {subTab === "workflow" ? (
              <div>
                {/* Column headers */}
                {editConfig.workflowStatuses.length > 0 && (
                  <div className="grid items-center gap-2 px-3 mb-1.5 text-[10px] font-semibold text-ink-subtle uppercase tracking-widest"
                    style={{ gridTemplateColumns: "10px 100px 1fr 60px 60px 16px" }}>
                    <span />
                    <span>Key</span>
                    <span>Label / Color Palette</span>
                    <span className="text-center">Default</span>
                    <span className="text-center">End</span>
                    <span />
                  </div>
                )}

                {/* Status rows */}
                <div className="space-y-1.5 mb-4">
                  {editConfig.workflowStatuses.length === 0 && (
                    <p className="text-ink-subtle text-sm text-center py-6">No workflow statuses yet. Add one below.</p>
                  )}
                  {editConfig.workflowStatuses.map((s, i) => (
                    <div key={i} className="grid items-center gap-2 px-3 py-2 bg-surface-1 rounded-tracker-md"
                      style={{ gridTemplateColumns: "10px 100px 1fr 60px 60px 16px" }}>

                      {/* Color dot */}
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />

                      {/* Key */}
                      <span className="text-[11px] font-mono text-ink-muted truncate" title={s.key}>{s.key}</span>

                      {/* Chip + color picker */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input value={s.label} onChange={e => updateWorkflowField(i, "label", e.target.value)}
                          className="px-2 py-0.5 text-xs bg-surface border border-hairline rounded-tracker-sm text-ink outline-none w-28 font-medium" />
                        <div className="flex items-center gap-0.5">
                          {COLOR_PALETTE.map(c => (
                            <ColorDot key={c} color={c} selected={s.color === c}
                              onClick={() => updateWorkflowField(i, "color", c)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Default Toggle */}
                      <div className="flex justify-center">
                        <button onClick={() => updateWorkflowField(i, "isDefault", !s.isDefault)}
                          className={`p-1 rounded transition-colors ${s.isDefault ? "text-[var(--tracker-success)]" : "text-ink-subtle hover:text-[var(--tracker-success)]"}`}
                        >
                          <Check size={14} className={s.isDefault ? "stroke-[3px]" : "opacity-30"} />
                        </button>
                      </div>

                      {/* Terminal toggle */}
                      <div className="flex justify-center">
                        <button onClick={() => updateWorkflowField(i, "isTerminal", !s.isTerminal)}
                          title={s.isTerminal ? "Terminal (Click to unset)" : "Not terminal (Click to set)"}
                          className={`p-1 rounded transition-colors ${s.isTerminal ? "text-[#EF4444]" : "text-ink-subtle hover:text-[#EF4444]"}`}
                        >
                          <Flag size={13} className={s.isTerminal ? "fill-current" : "opacity-30"} />
                        </button>
                      </div>

                      {/* Delete */}
                      <button onClick={() => removeWorkflowStatus(i)} className="text-[var(--tracker-danger)] hover:opacity-70 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ── Add new status ── */}
                <div className="border-t border-hairline-soft pt-4">
                  <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-2">Add Workflow Status</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-[11px] text-ink-subtle block mb-1">Key (internal)</label>
                      <input value={newStatus.key} onChange={e => setNewStatus(p => ({ ...p, key: e.target.value }))}
                        placeholder="e.g. In Review"
                        className="px-3 py-1.5 text-sm bg-surface border border-hairline rounded-tracker-md text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--tracker-border-focus)] w-32"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-subtle block mb-1">Label</label>
                      <input value={newStatus.label} onChange={e => setNewStatus(p => ({ ...p, label: e.target.value }))}
                        placeholder="e.g. In Review"
                        className="px-3 py-1.5 text-sm bg-surface border border-hairline rounded-tracker-md text-ink placeholder:text-ink-subtle outline-none focus:border-[var(--tracker-border-focus)] w-32"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-subtle block mb-1">Color</label>
                      <div className="flex items-center gap-0.5 pt-0.5">
                        {COLOR_PALETTE.map(c => (
                          <ColorDot key={c} color={c} selected={newStatus.color === c}
                            onClick={() => setNewStatus(p => ({ ...p, color: c }))}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-ink-subtle block mb-1">Terminal?</label>
                      <button onClick={() => setNewStatus(p => ({ ...p, isTerminal: !p.isTerminal }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md border text-xs font-medium transition-colors ${newStatus.isTerminal ? "border-[#EF4444] bg-[#EF444415] text-[#EF4444]" : "border-hairline bg-surface text-ink-muted"}`}
                      >
                        <Flag size={12} />
                        {newStatus.isTerminal ? "Yes — End of cycle" : "No"}
                      </button>
                    </div>
                    <button onClick={addWorkflowStatus} className="tracker-btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs self-end">
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div className="grid items-center gap-2 px-3 mb-1.5 text-[10px] font-semibold text-ink-subtle uppercase tracking-widest"
                  style={{ gridTemplateColumns: "10px 100px 1fr 60px" }}>
                  <span />
                  <span>System Key</span>
                  <span>Custom Label / Color Palette</span>
                  <span className="text-center">Default</span>
                </div>

                {/* Meta Status rows */}
                <div className="space-y-1.5 mb-4">
                  {editConfig.metaStatuses.map((s, i) => (
                    <div key={i} className="grid items-center gap-2 px-3 py-2 bg-surface-1 rounded-tracker-md"
                      style={{ gridTemplateColumns: "10px 100px 1fr 60px" }}>

                      {/* Color dot */}
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />

                      {/* Key */}
                      <span className="text-[11px] font-mono font-semibold text-ink truncate">{s.key}</span>

                      {/* Chip + color picker */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input value={s.label} onChange={e => updateMetaField(i, "label", e.target.value)}
                          className="px-2 py-0.5 text-xs bg-surface border border-hairline rounded-tracker-sm text-ink outline-none w-28 font-medium" />
                        <div className="flex items-center gap-0.5">
                          {COLOR_PALETTE.map(c => (
                            <ColorDot key={c} color={c} selected={s.color === c}
                              onClick={() => updateMetaField(i, "color", c)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Default Toggle */}
                      <div className="flex justify-center">
                        <button onClick={() => updateMetaField(i, "isDefault", !s.isDefault)}
                          className={`p-1 rounded transition-colors ${s.isDefault ? "text-[var(--tracker-success)]" : "text-ink-subtle hover:text-[var(--tracker-success)]"}`}
                        >
                          <Check size={14} className={s.isDefault ? "stroke-[3px]" : "opacity-30"} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend explanation for meta statuses */}
                <div className="bg-surface-1 p-3 rounded-tracker-md mt-4 border border-hairline-soft">
                  <h4 className="text-xs font-semibold text-ink mb-1.5">About Meta Status</h4>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    Meta Status represents the universal, low-level record lifecycle state. It applies to all records in a collection to manage general visibility (soft deletion, active list, drafts, archiving).
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Status Mapping Panel ─────────────────────────────────────────────────────
const status_mappingPanel = () => {
  const [mappings, setMappings] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editMapping, setEditMapping] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        axiosInstance.post("/populate/read/status_mappings", {}),
        axiosInstance.post("/populate/read/status_configss", {}),
      ]);
      setMappings(mRes.data.data || []);
      setConfigs(cRes.data.data || []);
    } catch { toast.error("Failed to load mappings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createNew = () => {
    setSelected("__new__");
    setEditMapping({ sourceModel: "tasks", targetModel: "tickets", linkField: "linkedTicketId", reverseLinkField: "linkedTaskId", mappings: [], isActive: true });
  };

  const selectMapping = (m) => { setSelected(m._id); setEditMapping({ ...m, mappings: [...m.mappings] }); };
  const getStatuses = (modelName) => configs.find(c => c.modelName === modelName)?.workflowStatuses || [];

  const setMappingEntry = (srcStatus, tgtStatus) => {
    setEditMapping(prev => {
      const exists = prev.mappings.findIndex(m => m.sourceStatus === srcStatus);
      if (tgtStatus === "") return { ...prev, mappings: prev.mappings.filter(m => m.sourceStatus !== srcStatus) };
      if (exists >= 0) {
        const updated = [...prev.mappings];
        updated[exists] = { sourceStatus: srcStatus, targetStatus: tgtStatus };
        return { ...prev, mappings: updated };
      }
      return { ...prev, mappings: [...prev.mappings, { sourceStatus: srcStatus, targetStatus: tgtStatus }] };
    });
  };

  const getMappedTarget = (srcStatus) => editMapping?.mappings?.find(m => m.sourceStatus === srcStatus)?.targetStatus || "";

  const save = async () => {
    try {
      const payload = { ...editMapping };
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;
      if (selected === "__new__") {
        await axiosInstance.post("/populate/create/status_mappings", payload);
      } else {
        await axiosInstance.put(`/populate/update/status_mappings/${selected}`, payload);
      }
      toast.success("Mapping saved!"); fetchAll();
    } catch { toast.error("Save failed"); }
  };

  const toggleActive = async (m) => {
    try {
      await axiosInstance.put(`/populate/update/status_mappings/${m._id}`, { isActive: !m.isActive });
      toast.success(m.isActive ? "Deactivated" : "Activated"); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const deleteMapping = async (id) => {
    if (!window.confirm("Delete this mapping?")) return;
    try {
      await axiosInstance.delete(`/populate/delete/status_mappings/${id}`);
      toast.success("Deleted");
      if (selected === id) { setSelected(null); setEditMapping(null); }
      fetchAll();
    } catch { toast.error("Delete failed"); }
  };

  const sourceStatuses = editMapping ? getStatuses(editMapping.sourceModel) : [];
  const targetStatuses = editMapping ? getStatuses(editMapping.targetModel) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Mapping list */}
      <div className="bg-surface border border-hairline rounded-tracker-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest">Mappings</h3>
          <button onClick={createNew} className="tracker-btn-accent inline-flex items-center gap-1 px-2 py-1 text-xs">
            <Plus size={11} /> New
          </button>
        </div>
        <div className="space-y-1.5">
          {mappings.length === 0 && <p className="text-ink-subtle text-sm text-center py-4">No mappings yet.</p>}
          {mappings.map(m => (
            <div key={m._id} onClick={() => selectMapping(m)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-tracker-md cursor-pointer transition-colors ${selected === m._id ? "bg-[var(--tracker-accent-light)]" : "hover:bg-surface-1"}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{capitalize(m.sourceModel)} → {capitalize(m.targetModel)}</p>
                <p className="text-[11px] text-ink-subtle">{m.mappings?.length || 0} rules</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); toggleActive(m); }}>
                  {m.isActive ? <ToggleRight size={16} className="text-[var(--tracker-success)]" /> : <ToggleLeft size={16} className="text-ink-subtle" />}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteMapping(m._id); }} className="text-[var(--tracker-danger)] hover:opacity-70">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mapping editor */}
      <div className="lg:col-span-2 bg-surface border border-hairline rounded-tracker-card p-4">
        {!editMapping ? (
          <div className="flex items-center justify-center h-48 text-ink-subtle text-sm">← Select a mapping or create a new one</div>
        ) : (
          <>
            {/* Model pickers */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <label className="text-[11px] text-ink-subtle block mb-1">Source Model</label>
                <select value={editMapping.sourceModel}
                  onChange={e => setEditMapping(p => ({ ...p, sourceModel: e.target.value, mappings: [] }))}
                  className="px-3 py-1.5 text-sm bg-surface border border-hairline rounded-tracker-md text-ink outline-none">
                  {KNOWN_MODELS.map(m => <option key={m} value={m}>{capitalize(m)}</option>)}
                </select>
              </div>
              <ArrowRight size={16} className="text-ink-subtle mt-4" />
              <div>
                <label className="text-[11px] text-ink-subtle block mb-1">Target Model</label>
                <select value={editMapping.targetModel}
                  onChange={e => setEditMapping(p => ({ ...p, targetModel: e.target.value, mappings: [] }))}
                  className="px-3 py-1.5 text-sm bg-surface border border-hairline rounded-tracker-md text-ink outline-none">
                  {KNOWN_MODELS.map(m => <option key={m} value={m}>{capitalize(m)}</option>)}
                </select>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setEditMapping(p => ({ ...p, isActive: !p.isActive }))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-xs font-medium transition-colors ${editMapping.isActive ? "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" : "bg-surface-1 text-ink-muted"}`}>
                  {editMapping.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {editMapping.isActive ? "Active" : "Inactive"}
                </button>
                <button onClick={save} className="tracker-btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                  <Save size={13} /> Save
                </button>
              </div>
            </div>

            {/* Link fields */}
            <div className="flex flex-wrap gap-4 mb-4 p-3 bg-surface-1 rounded-tracker-md">
              <div>
                <label className="text-[11px] text-ink-subtle block mb-1">Link Field (on source)</label>
                <input value={editMapping.linkField} onChange={e => setEditMapping(p => ({ ...p, linkField: e.target.value }))}
                  className="px-2.5 py-1 text-sm bg-surface border border-hairline rounded-tracker-md text-ink outline-none w-44"
                  placeholder="e.g. linkedTicketId" />
              </div>
              <div>
                <label className="text-[11px] text-ink-subtle block mb-1">Reverse Link Field (on target)</label>
                <input value={editMapping.reverseLinkField} onChange={e => setEditMapping(p => ({ ...p, reverseLinkField: e.target.value }))}
                  className="px-2.5 py-1 text-sm bg-surface border border-hairline rounded-tracker-md text-ink outline-none w-44"
                  placeholder="e.g. linkedTaskId" />
              </div>
            </div>

            {/* Mapping table */}
            {sourceStatuses.length === 0 ? (
              <div className="text-center py-6 text-ink-subtle text-sm">
                No statuses configured for <strong>{editMapping.sourceModel}</strong>.<br />
                Go to <strong>Status Config</strong> tab to add statuses first.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid gap-3 px-2 mb-1 text-[10px] font-semibold text-ink-subtle uppercase tracking-widest"
                  style={{ gridTemplateColumns: "1fr 16px 1fr" }}>
                  <span>{capitalize(editMapping.sourceModel)} Status</span>
                  <span />
                  <span>→ {capitalize(editMapping.targetModel)} Status</span>
                </div>
                {sourceStatuses.map(src => {
                  const mapped = getMappedTarget(src.key);
                  const tgtObj = targetStatuses.find(t => t.key === mapped);
                  return (
                    <div key={src.key} className="grid gap-3 items-center px-2 py-2 hover:bg-surface-1 rounded-tracker-md transition-colors"
                      style={{ gridTemplateColumns: "1fr 16px 1fr" }}>
                      {/* Source chip + badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusChip label={src.label} color={src.color} />
                        {src.isTerminal && <TerminalBadge />}
                      </div>
                      <ArrowRight size={13} className="text-ink-subtle" />
                      {/* Target picker */}
                      <div className="flex items-center gap-2">
                        <select value={mapped} onChange={e => setMappingEntry(src.key, e.target.value)}
                          className={`flex-1 px-2.5 py-1.5 text-sm border rounded-tracker-md outline-none transition-colors ${mapped ? "bg-surface border-hairline text-ink" : "bg-surface-1 border-hairline-soft text-ink-subtle"}`}>
                          <option value="">— No mapping —</option>
                          {targetStatuses.map(tgt => (
                            <option key={tgt.key} value={tgt.key}>
                              {tgt.label}{tgt.isTerminal ? " 🔚" : ""}
                            </option>
                          ))}
                        </select>
                        {tgtObj && <StatusChip label={tgtObj.label} color={tgtObj.color} size="xs" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const StatusMasterPage = () => {
  const [tab, setTab] = useState("config");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    axiosInstance.post("/config/seed-model-policies", {
      models: ["status_configss", "status_mappings"],
      permissions: { read: true, create: true, update: true, delete: true },
    }).catch(() => { });
  }, []);

  const handleManualSeed = async () => {
    setSeeding(true);
    try {
      const res = await axiosInstance.post("/config/seed-model-policies", {
        models: ["status_configss", "status_mappings"],
        permissions: { read: true, create: true, update: true, delete: true },
      });
      toast.success(res.data.message || "Permissions set up!");
    } catch (e) {
      toast.error("Setup failed: " + (e.response?.data?.message || e.message));
    } finally { setSeeding(false); }
  };

  return (
    <div className="space-y-6" data-module="master">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitMerge size={16} className="text-[var(--tracker-accent)]" />
          <div>
            <h1 className="text-[15px] font-semibold text-ink tracking-tight">Status Master</h1>
            <p className="text-[12px] text-ink-muted">
              Define statuses, lifecycle tags, and cross-model sync rules
            </p>
          </div>
        </div>
        <button onClick={handleManualSeed} disabled={seeding}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md bg-surface border border-hairline text-xs text-ink-muted hover:text-ink hover:border-[var(--tracker-accent)] transition-colors disabled:opacity-50"
          title="Setup or repair permissions for this module">
          <ShieldCheck size={13} className="text-[var(--tracker-success)]" />
          {seeding ? "Setting up..." : "Setup Permissions"}
        </button>
      </div>

      <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-tracker-md w-fit">
        {[{ key: "config", label: "Status Config" }, { key: "mapping", label: "Status Mapping" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-tracker-sm text-sm font-medium transition-colors ${tab === t.key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "config" && <status_configsPanel />}
      {tab === "mapping" && <status_mappingPanel />}
    </div>
  );
};

export default StatusMasterPage;
