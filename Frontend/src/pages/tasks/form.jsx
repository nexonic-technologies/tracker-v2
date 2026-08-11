import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@providers/AuthProvider";
import axiosInstance from "@api/axiosInstance";
import EntityFormPage from "@components/Forms/EntityFormPage";
import {
  TASK_CREATE_TABS,
  buildTaskCreateFields,
} from "../../constants/taskCreateForm";
import { enqueueFormSubmit } from "@services/formSubmitQueue";
import { formDraftKey } from "@utils/formDrafts";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Paperclip,
  Mic,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  X,
  CheckSquare,
  Building2,
  Package,
  UserCheck,
  Users,
  Calendar,
  Zap,
  Tag,
  Scale,
  Milestone,
  Check,
  ChevronDown,
  ChevronUp,
  Search
} from "lucide-react";

/**
 * Custom Searchable Multi-Select Popover for Assignees & Followers
 */
const SearchableMultiSelect = ({ label, icon: Icon, required, items = [], selected = [], onChange, placeholder = "Select..." }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter(item => {
    const name = typeof item === 'string' ? item : (item.name || `${item.basicInfo?.firstName || ''} ${item.basicInfo?.lastName || ''}`);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleItem = (id) => {
    const updated = selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id];
    onChange(updated);
  };

  const getSelectedNames = () => {
    if (selected.length === 0) return null;
    return items
      .filter(item => selected.includes(item._id))
      .map(item => item.name || `${item.basicInfo?.firstName || ''} ${item.basicInfo?.lastName || ''}`.trim())
      .join(", ");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div
        onClick={() => setOpen(!open)}
        className="w-full min-h-[38px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white flex items-center justify-between cursor-pointer shadow-2xs hover:border-indigo-400 transition-colors"
      >
        <span className={`truncate ${selected.length === 0 ? "text-slate-400 font-normal" : "text-slate-900 dark:text-white"}`}>
          {getSelectedNames() || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {selected.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            {filteredItems.length === 0 ? (
              <p className="p-2 text-xs text-slate-400 text-center">No options found</p>
            ) : (
              filteredItems.map(item => {
                const isSelected = selected.includes(item._id);
                const name = typeof item === 'string' ? item : (item.name || `${item.basicInfo?.firstName || ''} ${item.basicInfo?.lastName || ''}`.trim());
                return (
                  <div
                    key={item._id}
                    onClick={() => toggleItem(item._id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer select-none transition-colors ${isSelected
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    <span className="truncate">{name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const selectedClientFromState = location.state?.selectedClient;

  // Master Data States
  const [clients, setClients] = useState([]);
  const [project_types, setproject_types] = useState([]);
  const [task_types, settask_types] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [globalMilestones, setGlobalMilestones] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [checklistExpanded, setChecklistExpanded] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    userStory: "",
    observation: "",
    impacts: "",
    referenceUrl: "",
    clientId: selectedClientFromState?._id || "",
    projectTypeId: "",
    taskTypeId: "",
    assignedTo: [],
    followers: [user?.id].filter(Boolean),
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    priorityLevel: "Low",
    weightage: "Low",
    milestoneId: "",
  });

  // Attachments State: array of { id, file, name, size, type, previewUrl }
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Checklist State: array of { id, item, completed }
  const [checklist, setChecklist] = useState([]);

  const fileInputRef = useRef(null);

  // Load Master Data from existing API endpoints
  useEffect(() => {
    let isMounted = true;
    const fetchMasterData = async () => {
      try {
        setLoadingData(true);
        const [cRes, ptRes, ttRes, eRes, mRes] = await Promise.all([
          axiosInstance.post("/populate/read/clients", { fields: "name,project_types,milestones,Status" }),
          axiosInstance.post("/populate/read/project_types", { fields: "name" }),
          axiosInstance.post("/populate/read/task_types", { fields: "name" }),
          axiosInstance.post("/populate/read/employees", { fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage" }),
          axiosInstance.post("/populate/read/milestones", { fields: "name,Status" }).catch(() => ({ data: { data: [] } })),
        ]);

        if (isMounted) {
          const activeClients = (cRes.data?.data || []).filter(c => c.Status === "Active");
          setClients(activeClients);
          setproject_types(ptRes.data?.data || []);
          settask_types(ttRes.data?.data || []);
          setEmployees(eRes.data?.data || []);
          setGlobalMilestones((mRes.data?.data || []).filter(m => m.Status !== "Inactive"));
        }
      } catch (err) {
        console.error("Error loading master data:", err);
        toast.error("Failed to load metadata dropdowns");
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchMasterData();
    return () => { isMounted = false; };
  }, []);

  // Restore Draft if available
  useEffect(() => {
    const key = formDraftKey("tasks", "new");
    const draft = loadFormDraft(key);
    if (draft?.data?.formData) {
      setFormData(prev => ({ ...prev, ...draft.data.formData }));
    }
  }, []);

  // Clipboard Paste Handler for Ctrl+V images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
            addFiles([file]);
            toast.success("Image pasted from clipboard!");
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Add files to attachments
  const addFiles = (fileList) => {
    const validTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv", "text/plain"
    ];

    const newAttachments = [];
    Array.from(fileList).forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isAllowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(ext);

      if (!validTypes.includes(file.type) && !isAllowedExt) {
        toast.error(`File "${file.name}" format is not supported. Please upload Image, Doc, Excel, or PDF.`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds maximum allowed size (50MB).`);
        return;
      }

      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      newAttachments.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || ext,
        previewUrl
      });
    });

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => {
      const target = prev.find(a => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get file type badge/icon
  const getFileBadge = (att) => {
    const ext = att.name.split(".").pop()?.toLowerCase();
    if (att.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return { icon: <FileImage className="w-4 h-4 text-emerald-500" />, label: "IMAGE", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (att.type === "application/pdf" || ext === "pdf") {
      return { icon: <FileCode className="w-4 h-4 text-rose-500" />, label: "PDF", color: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (["doc", "docx"].includes(ext) || att.type.includes("word")) {
      return { icon: <FileText className="w-4 h-4 text-blue-500" />, label: "DOC", color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (["xls", "xlsx", "csv"].includes(ext) || att.type.includes("excel") || att.type.includes("sheet")) {
      return { icon: <FileSpreadsheet className="w-4 h-4 text-amber-500" />, label: "EXCEL", color: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    return { icon: <Paperclip className="w-4 h-4 text-slate-500" />, label: "FILE", color: "bg-slate-50 text-slate-700 border-slate-200" };
  };

  // Checklist handlers
  const handleAddChecklistItem = () => {
    setChecklist(prev => [...prev, { id: Date.now(), item: "", completed: false }]);
  };

  const handleChecklistChange = (id, text) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, item: text } : c));
  };

  const handleToggleChecklist = (id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, completed: !c.completed } : c));
  };

  const handleRemoveChecklistItem = (id) => {
    setChecklist(prev => prev.filter(c => c.id !== id));
  };

  // Selected client object
  const currentClient = clients.find(c => c._id === formData.clientId);

  // Available product types for selected client
  const availableproject_types = currentClient?.project_types?.length
    ? project_types.filter(pt => currentClient.project_types.some(id => (id._id || id).toString() === pt._id.toString()))
    : project_types;

  // Combine client specific milestones and global milestones
  const clientMilestonesFormatted = (currentClient?.milestones || []).map(m => ({
    _id: m.milestoneId || m._id,
    name: m.notes || m.title || `Milestone ${m.milestoneId}`
  }));

  const allAvailableMilestones = [
    ...clientMilestonesFormatted,
    ...globalMilestones.filter(gm => !clientMilestonesFormatted.some(cm => cm._id === gm._id))
  ];

  // Submit Handler adapting to standard tasks collection schema
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!formData.clientId) {
      toast.error("Please select a Client");
      return;
    }

    if (!formData.projectTypeId) {
      toast.error("Please select a Product Type");
      return;
    }

    if (!formData.taskTypeId) {
      toast.error("Please select a Task Type / Category");
      return;
    }

    try {
      setSubmitting(true);

      const cleanedChecklist = checklist
        .filter(c => c.item.trim().length > 0)
        .map(c => ({ item: c.item.trim(), completed: c.completed }));

      const payload = {
        title: formData.title.trim(),
        userStory: formData.userStory,
        observation: formData.observation,
        impacts: formData.impacts,
        referenceUrl: formData.referenceUrl,
        clientId: formData.clientId,
        projectTypeId: formData.projectTypeId,
        taskTypeId: formData.taskTypeId,
        assignedTo: formData.assignedTo,
        followers: formData.followers,
        startDate: formData.startDate || new Date().toISOString(),
        dueDate: formData.dueDate || undefined,
        endDate: formData.dueDate || undefined,
        priorityLevel: formData.priorityLevel,
        complexity: formData.weightage, // Model uses 'complexity'
        milestoneId: formData.milestoneId || undefined,
        checklist: cleanedChecklist,
        createdBy: user?.id,
        status: "Backlogs",
      };

      if (attachments.length > 0) {
        const fd = new FormData();

        Object.entries(payload).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            if (Array.isArray(val)) {
              val.forEach(item => {
                if (typeof item === 'object') {
                  fd.append(key, JSON.stringify(item));
                } else {
                  fd.append(key, item);
                }
              });
            } else if (typeof val === 'object') {
              fd.append(key, JSON.stringify(val));
            } else {
              fd.append(key, val);
            }
          }
        });

        attachments.forEach(att => {
          fd.append("attachments", att.file);
        });

        await axiosInstance.post("/populate/create/tasks", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await axiosInstance.post("/populate/create/tasks", payload);
      }

      clearFormDraft(formDraftKey("tasks", "new"));
      toast.success("Task created successfully!");
      navigate("/tasks");
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-slate-800 dark:text-slate-100 min-h-screen pb-12">
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between py-3 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            title="Back to Tasks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
            <Plus className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Task</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fill in the details to create a task</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN CONTENT ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
        {/* ── LEFT COLUMN (Main Form Fields) ── */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">

            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {/* Description & Attachments Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Description & Attachments <span className="text-rose-500">*</span>
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border rounded-lg transition-all ${isDragging
                  ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  }`}
              >
                <textarea
                  rows={4}
                  value={formData.observation}
                  onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
                  placeholder="Describe the task and paste screenshots directly here (Ctrl+V)..."
                  className="w-full p-3.5 text-sm text-slate-900 dark:text-white bg-transparent placeholder-slate-400 focus:outline-none resize-y min-h-[100px]"
                />

                {/* File Attachment Dropzone Toolbar */}
                <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success("Voice recording initialized. Speak clearly into your mic.")}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                      title="Voice Description"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      title="Attach documents, images, excel or PDF"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span className="font-medium text-xs text-slate-600 dark:text-slate-300">Attach File</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      onChange={e => e.target.files && addFiles(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Supports Image, DOC, XLS, PDF (Max 50MB)
                  </span>
                </div>
              </div>

              {/* Uploaded Attachments Chips/Cards */}
              {attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map(att => {
                    const badge = getFileBadge(att);
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-lg group text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {att.previewUrl ? (
                            <img src={att.previewUrl} alt="preview" className="w-9 h-9 object-cover rounded-md flex-shrink-0 border border-slate-200" />
                          ) : (
                            <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${badge.color}`}>
                              {badge.icon}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(att.size)} · {badge.label}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors flex-shrink-0 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Story */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                User Story <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={formData.userStory}
                onChange={e => setFormData(prev => ({ ...prev, userStory: e.target.value }))}
                placeholder="As a [user], I want to [goal]..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Observation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Observation
              </label>
              <textarea
                rows={2}
                value={formData.observation}
                onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
                placeholder="Steps to reproduce or observations..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Impact Analysis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Impact Analysis
              </label>
              <textarea
                rows={2}
                value={formData.impacts}
                onChange={e => setFormData(prev => ({ ...prev, impacts: e.target.value }))}
                placeholder="Describe the impact of this task..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Pre Checklist Section */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div
                onClick={() => setChecklistExpanded(!checklistExpanded)}
                className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/70 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  {checklistExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Pre Checklist
                  </span>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                  {checklist.length} items
                </span>
              </div>

              {checklistExpanded && (
                <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {checklist.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleChecklist(item.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${item.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                          }`}
                      >
                        {item.completed && <Check className="w-3 h-3" />}
                      </button>

                      <input
                        type="text"
                        value={item.item}
                        onChange={e => handleChecklistChange(item.id, e.target.value)}
                        placeholder={`Checklist item ${idx + 1}...`}
                        className={`flex-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 ${item.completed ? "line-through text-slate-400" : ""
                          }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 mt-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN (Metadata Sidebar Panel) ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">

            {/* CLIENT */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Client <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.clientId}
                onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value, projectTypeId: "", milestoneId: "" }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                required
              >
                <option value="">Select a client...</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* PRODUCT TYPE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Product <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.projectTypeId}
                onChange={e => setFormData(prev => ({ ...prev, projectTypeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                required
              >
                <option value="">Select Product</option>
                {availableproject_types.map(pt => (
                  <option key={pt._id} value={pt._id}>{pt.name}</option>
                ))}
              </select>
            </div>

            {/* ASSIGNEE - Searchable Multi-Select */}
            <SearchableMultiSelect
              label="Assignee"
              icon={UserCheck}
              required
              items={employees}
              selected={formData.assignedTo}
              onChange={val => setFormData(prev => ({ ...prev, assignedTo: val }))}
              placeholder="Select Assignee..."
            />

            {/* FOLLOWERS - Searchable Multi-Select */}
            <SearchableMultiSelect
              label="Followers"
              icon={Users}
              items={employees}
              selected={formData.followers}
              onChange={val => setFormData(prev => ({ ...prev, followers: val }))}
              placeholder="Add followers..."
            />

            {/* EST. DUE DATE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Est. Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>

            {/* PRIORITY */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.priorityLevel}
                onChange={e => setFormData(prev => ({ ...prev, priorityLevel: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Weekly Priority">Weekly Priority</option>
              </select>
            </div>

            {/* CATEGORY / TASK TYPE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.taskTypeId}
                onChange={e => setFormData(prev => ({ ...prev, taskTypeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                required
              >
                <option value="">Select Category</option>
                {task_types.map(tt => (
                  <option key={tt._id} value={tt._id}>{tt.name}</option>
                ))}
              </select>
            </div>

            {/* WEIGHTAGE / COMPLEXITY */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" /> Weightage
              </label>
              <select
                value={formData.weightage}
                onChange={e => setFormData(prev => ({ ...prev, weightage: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* MILESTONE - Always visible */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                <Milestone className="w-3.5 h-3.5" /> Milestone
              </label>
              <select
                value={formData.milestoneId}
                onChange={e => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Select Milestone</option>
                {allAvailableMilestones.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};

export default TaskFormPage;
