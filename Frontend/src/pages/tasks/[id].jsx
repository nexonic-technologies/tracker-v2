import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import { useAuth } from "@providers/AuthProvider";
import {
  FileText, CheckCircle, AlertCircle, Trash2,
  Plus, X, Upload, MoreHorizontal, UserPlus,
  Check, MessageSquare, Info, ExternalLink, ChevronDown, ListTodo, Paperclip, Send
} from "lucide-react";
import toast from "react-hot-toast";
import JobSessionTimer from "@components/Tasks/JobSessionTimer";
import DeliveryStageBadge from "@components/Tasks/DeliveryStageBadge";
import SessionHistory from "@components/Tasks/SessionHistory";

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inline edits state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [estHoursInput, setEstHoursInput] = useState("");

  // UI state
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Checklist State
  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem(`task_checklist_${id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const assignRef = useRef(null);
  const moreRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (id) {
      fetchTask();
      fetchEmployees();
    }
    const handler = (e) => {
      if (assignRef.current && !assignRef.current.contains(e.target)) setShowAssignDropdown(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`task_checklist_${id}`, JSON.stringify(checklist));
    }
  }, [checklist, id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const populateFields = {
        clientId: "name",
        projectTypeId: "name",
        taskTypeId: "name",
        createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        linkedTicketId: "ticketId,title",
      };
      const res = await axiosInstance.post(`/populate/read/tasks/${id}`, {
        populateFields
      });
      const taskData = res.data.data;
      setTask(taskData);
      setTitleInput(taskData.title || "");
      setDescInput(taskData.userStory || "");
      setEstHoursInput(taskData.estimatedHours != null ? String(taskData.estimatedHours) : "");
      if (taskData.commentsThread) fetchComments(taskData.commentsThread);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh — re-fetches task without triggering loading spinner
  const silentRefreshTask = async () => {
    try {
      const populateFields = {
        clientId: "name",
        projectTypeId: "name",
        taskTypeId: "name",
        createdBy: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        assignedTo: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
        linkedTicketId: "ticketId,title",
      };
      const res = await axiosInstance.post(`/populate/read/tasks/${id}`, { populateFields });
      const taskData = res.data.data;
      setTask(taskData);
    } catch (e) {
      console.error('[silentRefreshTask]', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/employees", {
        fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
      });
      setEmployees(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchComments = async (thread) => {
    const threadId = typeof thread === "object" ? thread._id : thread;
    if (!threadId) return;
    try {
      const populateFields = { "comments.commentedBy": "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage" };
      const res = await axiosInstance.post(`/populate/read/comments_threads/${threadId}`, {
        populateFields
      });
      setComments(res.data.data?.comments || []);
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (field, value) => {
    try {
      await axiosInstance.put(`/populate/update/tasks/${id}`, { [field]: value });
      setTask((prev) => ({ ...prev, [field]: value }));
      toast.success("Task updated");
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    }
  };

  const saveEstHours = async () => {
    const val = estHoursInput.trim() === "" ? null : parseFloat(estHoursInput);
    if (val !== (task?.estimatedHours ?? null)) {
      await handleUpdate("estimatedHours", val);
    }
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (titleInput.trim() && titleInput !== task.title) {
      await handleUpdate("title", titleInput.trim());
    }
  };

  const saveDesc = async () => {
    setEditingDesc(false);
    if (descInput !== task.userStory) {
      await handleUpdate("userStory", descInput);
    }
  };

  const handleAssignUser = async (empId) => {
    const current = task.assignedTo || [];
    if (current.some((a) => (a._id || a) === empId)) return;
    const updated = [...current.map((a) => a._id || a), empId];
    await handleUpdate("assignedTo", updated);
    fetchTask();
  };

  const handleUnassignUser = async (empId) => {
    const updated = (task.assignedTo || [])
      .map((a) => a._id || a)
      .filter((a) => a !== empId);
    await handleUpdate("assignedTo", updated);
    fetchTask();
  };

  const addComment = async () => {
    if (!newComment.trim() || !task.commentsThread) return;
    setSubmitting(true);
    try {
      const threadId = typeof task.commentsThread === "object" ? task.commentsThread._id : task.commentsThread;
      await axiosInstance.put(`/populate/update/comments_threads/${threadId}`, {
        $push: { comments: { commentedBy: user.id, message: newComment, mentions: [] } },
      });
      setNewComment("");
      setShowCommentBox(false);
      fetchComments(task.commentsThread);
      toast.success("Comment added");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Task URL copied to clipboard!");
    setShowMoreDropdown(false);
  };

  const handleDuplicate = async () => {
    try {
      const { _id, createdAt, updatedAt, commentsThread, ...duplicateBody } = task;
      duplicateBody.title = `${duplicateBody.title} (Copy)`;

      if (duplicateBody.clientId?._id) duplicateBody.clientId = duplicateBody.clientId._id;
      if (duplicateBody.projectTypeId?._id) duplicateBody.projectTypeId = duplicateBody.projectTypeId._id;
      if (duplicateBody.taskTypeId?._id) duplicateBody.taskTypeId = duplicateBody.taskTypeId._id;
      if (duplicateBody.createdBy?._id) duplicateBody.createdBy = duplicateBody.createdBy._id;
      if (duplicateBody.assignedTo) duplicateBody.assignedTo = duplicateBody.assignedTo.map(a => a._id || a);
      if (duplicateBody.linkedTicketId?._id) duplicateBody.linkedTicketId = duplicateBody.linkedTicketId._id;

      const res = await axiosInstance.post('/populate/create/tasks', duplicateBody);
      if (res.data?.success) {
        toast.success("Task duplicated!");
        navigate(`/tasks/${res.data.data._id}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to duplicate task");
    }
    setShowMoreDropdown(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axiosInstance.delete(`/populate/delete/tasks/${id}`);
      toast.success("Task deleted!");
      navigate(-1);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete task");
    }
    setShowMoreDropdown(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("attachments", file);

    try {
      toast.loading("Uploading file...", { id: "upload" });
      const res = await axiosInstance.put(`/populate/update/tasks/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.success) {
        fetchTask();
        toast.success("File uploaded successfully!", { id: "upload" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: "upload" });
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const updatedTags = [...(task.tags || []), newTagInput.trim()];
    await handleUpdate("tags", updatedTags);
    setNewTagInput("");
    setShowTagInput(false);
  };

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = (task.tags || []).filter(t => t !== tagToRemove);
    await handleUpdate("tags", updatedTags);
  };

  // Checklist Actions
  const addChecklistItem = () => {
    setChecklist(prev => [...prev, { id: Date.now(), text: "New checklist item", done: false }]);
  };

  const toggleChecklistItem = (itemId) => {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, done: !item.done } : item));
  };

  const removeChecklistItem = (itemId) => {
    setChecklist(prev => prev.filter(item => item.id !== itemId));
  };

  const updateChecklistItemText = (itemId, text) => {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, text } : item));
  };

  const isAssigned = (empId) =>
    (task.assignedTo || []).some((a) => (a._id || a) === empId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--module-accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-canvas text-ink-muted">
        <AlertCircle size={40} className="text-ink-subtle mb-2" />
        <p className="text-sm font-semibold">Task not found</p>
      </div>
    );
  }

  const getEmployeeName = (empId) => {
    if (!empId) return "User";
    const idStr = typeof empId === "object" ? empId._id || empId : empId;
    const emp = employees.find(e => e._id === idStr);
    return emp ? `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim() : "User";
  };

  // Unified activity list
  const unifiedActivities = [
    {
      type: "created",
      title: `${task.createdBy?.basicInfo?.firstName || "System"} ${task.createdBy?.basicInfo?.lastName || ""} has created the task.`,
      date: new Date(task.createdAt),
      icon: <CheckCircle size={14} className="text-emerald-500" />
    },
    ...comments.map(c => {
      const authorName = typeof c.commentedBy === 'object' && c.commentedBy?.basicInfo
        ? `${c.commentedBy.basicInfo.firstName} ${c.commentedBy.basicInfo.lastName}`
        : getEmployeeName(c.commentedBy);
      return {
        type: "comment",
        title: `${authorName} has commented:`,
        message: c.message,
        date: new Date(c.createdAt),
        icon: <MessageSquare size={14} className="text-blue-500" />
      };
    })
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="bg-canvas">
      <div className="w-full max-w-6xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">

        {/* ─── Header Section ─── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Complete Task Button */}
            {task.status !== "Completed" ? (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleUpdate("status", "Completed"); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-tracker-md text-xs transition-all shadow-sm cursor-pointer"
              >
                <Check size={14} /> Complete Task
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-tracker-md text-xs">
                <CheckCircle size={14} /> Completed
              </div>
            )}

            {/* Members Assignee Selector */}
            <div className="relative" ref={assignRef}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowAssignDropdown(!showAssignDropdown); }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-tracker-md text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Assigned to {task.assignedTo?.length || 0} Members</span>
                <ChevronDown size={12} />
              </button>

              {showAssignDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-hairline rounded-tracker-md shadow-lg py-1.5 z-30 max-h-64 overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider px-3 py-1.5 border-b border-hairline-soft mb-1">Assign Members</h4>
                  {employees.map((emp) => {
                    const assigned = isAssigned(emp._id);
                    return (
                      <button
                        key={emp._id}
                        onClick={() => assigned ? handleUnassignUser(emp._id) : handleAssignUser(emp._id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-canvas-muted cursor-pointer text-left transition-colors text-xs font-medium text-ink"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {emp.basicInfo?.profileImage ? (
                            <img src={emp.basicInfo.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                              {emp.basicInfo?.firstName?.charAt(0)}
                            </div>
                          )}
                          <span className="truncate">{emp.basicInfo?.firstName} {emp.basicInfo?.lastName}</span>
                        </div>
                        {assigned && <Check size={14} className="text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* More actions dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowMoreDropdown(!showMoreDropdown); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-tracker-md hover:text-slate-900 transition-all cursor-pointer text-slate-700"
              >
                <MoreHorizontal size={14} />
              </button>

              {showMoreDropdown && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-hairline rounded-tracker-md shadow-lg py-1 z-30">
                  <button
                    onClick={handleCopyUrl}
                    className="w-full text-left px-4 py-2 hover:bg-canvas-muted text-xs text-ink cursor-pointer font-medium"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => { handleUpdate("status", "Completed"); setShowMoreDropdown(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-canvas-muted text-xs text-ink cursor-pointer font-medium"
                  >
                    Complete Task
                  </button>
                  <button
                    onClick={() => {
                      const nextMeta = task.metaStatus === 'archived' ? 'active' : 'archived';
                      handleUpdate("metaStatus", nextMeta);
                      setShowMoreDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-canvas-muted text-xs text-ink cursor-pointer font-medium"
                  >
                    {task.metaStatus === 'archived' ? 'Unarchive Task' : 'Archive Task'}
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full text-left px-4 py-2 hover:bg-canvas-muted text-xs text-ink cursor-pointer font-medium"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 hover:bg-canvas-muted text-xs text-rose-600 font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); navigate(-1); }}
              className="p-2 hover:bg-slate-200 border border-slate-100 rounded-tracker-md text-slate-700 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ─── Body Section ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[600px]">

          {/* Left Column (Seamless Main Content Panel) */}
          <div className="lg:col-span-3 p-8 space-y-8 bg-white select-text">

            {/* Title & Notes (Seamless Flat Typography) */}
            <div className="space-y-4">
              {editingTitle ? (
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  autoFocus
                  className="w-full text-2xl font-bold text-ink tracking-tight bg-transparent border-b border-indigo-500 focus:outline-none pb-1"
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="text-2xl font-bold text-ink tracking-tight cursor-pointer hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
                >
                  {task.title || "Untitled Task"}
                </h1>
              )}

              {editingDesc ? (
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={saveDesc}
                  autoFocus
                  className="w-full text-xs text-ink-muted leading-relaxed bg-transparent border border-indigo-400 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                />
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className={`text-xs leading-relaxed cursor-pointer hover:bg-slate-50 rounded px-1 -ml-1 py-1 transition-colors ${task.userStory ? "text-ink-muted" : "text-ink-subtle italic"
                    }`}
                >
                  {task.userStory || "Add task notes..."}
                </p>
              )}
            </div>

            {/* Checklist Section (Seamless inline) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <ListTodo size={14} className="text-indigo-500" /> Checklist
                </h3>
                <button
                  onClick={addChecklistItem}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus size={10} /> Add Checklist
                </button>
              </div>

              {checklist.length === 0 ? (
                <p className="text-xs text-ink-muted italic py-1">No checklist items. Click 'Add Checklist' to start.</p>
              ) : (
                <div className="space-y-2 max-w-xl">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5 group">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                        className={`flex-1 text-xs text-ink bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none py-0.5 ${item.done ? "line-through text-ink-muted" : ""
                          }`}
                      />
                      <button
                        onClick={() => removeChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments Section (Seamless inline) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip size={14} className="text-indigo-500" /> Attachments
              </h3>

              <div className="flex flex-wrap gap-4 items-center">
                {/* List Attachments */}
                {task.attachments && task.attachments.filter(Boolean).map((fileUrl, idx) => {
                  const filename = fileUrl.split("/").pop() || `File-${idx}`;
                  return (
                    <a
                      key={idx}
                      href={`/api/files/${fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-tracker-md text-xs font-semibold text-ink transition-all shadow-xs"
                    >
                      <FileText size={14} className="text-indigo-500" />
                      <span className="truncate max-w-[150px]">{filename}</span>
                      <ExternalLink size={12} className="text-ink-muted" />
                    </a>
                  );
                })}

                {/* Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-tracker-md text-slate-500 hover:text-indigo-600 transition-all cursor-pointer text-xs font-bold uppercase tracking-wider"
                >
                  <Upload size={14} />
                  <span>Upload File</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Ticket Context Reference (Seamless accordion wrapper if linked) */}
            {task.linkedTicketId && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Ticket Context</h3>
                  <button
                    onClick={() => navigate(`/Tickets/${task.linkedTicketId._id || task.linkedTicketId}`)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 cursor-pointer transition-colors flex items-center gap-0.5"
                  >
                    {task.linkedTicketId.ticketId}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1">Observation</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-ink-muted min-h-[40px]">
                      {task.observation || "-"}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1">Acceptance Criteria</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-ink-muted min-h-[40px]">
                      {task.acceptanceCreteria || "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activities Timeline (Seamless inline) */}
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-indigo-500" /> Activities
                </h3>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowCommentBox(!showCommentBox); }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <MessageSquare size={12} /> Comment
                </button>
              </div>

              {/* Toggle Comment Input */}
              {showCommentBox && (
                <div className="flex gap-2 bg-slate-50 p-2.5 rounded-tracker-md border border-slate-200 max-w-xl animate-fadeIn">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !submitting && addComment()}
                    placeholder="Write a comment..."
                    className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-ink placeholder-slate-400"
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || submitting}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-tracker-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Send size={12} />
                  </button>
                </div>
              )}

              {/* Vertical Timeline */}
              <div className="relative border-l border-slate-200 pl-6 space-y-6 max-w-2xl">
                {unifiedActivities.map((act, idx) => (
                  <div key={idx} className="relative flex gap-3 items-start">
                    <div className="absolute -left-[31px] top-0 bg-white p-1 rounded-full border border-slate-200 shadow-xs">
                      {act.icon}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">{act.title}</span>
                        <span className="text-[10px] text-ink-muted">
                          {act.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {act.message && (
                        <p className="text-xs text-ink-muted bg-slate-50 rounded-tracker-md border border-slate-100 p-3 mt-1 leading-relaxed">
                          {act.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Sidebar parameters) */}
          <div className="lg:col-span-1 p-6 bg-slate-50 border-l border-slate-200 space-y-6">

            {/* ── Activity Timer (Job Session) ── */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Activity Timer</label>
              <JobSessionTimer
                taskId={id}
                userId={user?.id}
                onSessionChange={silentRefreshTask}
              />
            </div>

            {/* ── Delivery Stage ── */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Delivery Stage</label>
              <DeliveryStageBadge
                stage={task.deliveryStage}
                editable={true}
                onChange={(stage) => handleUpdate('deliveryStage', stage)}
              />
            </div>

            {/* ── Estimated Hours & Complexity ── */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Estimated Hours</span>
                {estHoursInput.trim() !== String(task?.estimatedHours ?? '') && (
                  <span className="text-[9px] font-bold text-brand uppercase animate-pulse">Unsaved</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estHoursInput}
                    onChange={(e) => setEstHoursInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEstHours();
                    }}
                    placeholder="e.g. 4"
                    className="w-full bg-white hover:bg-slate-100 border border-slate-200 rounded-tracker-md pl-3 pr-8 py-2 text-xs font-bold text-ink focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ink-subtle pointer-events-none">
                    hrs
                  </span>
                </div>

                <button
                  type="button"
                  onClick={saveEstHours}
                  className={`px-3 py-2 rounded-tracker-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs border ${estHoursInput.trim() !== String(task?.estimatedHours ?? '')
                      ? 'bg-brand text-white border-brand hover:bg-brand-dark'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                  title="Save Estimated Hours"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Complexity</label>
              <div className="relative">
                <select
                  value={task.complexity || ''}
                  onChange={(e) => handleUpdate('complexity', e.target.value || null)}
                  className="w-full appearance-none bg-white hover:bg-slate-100 border border-slate-200 rounded-tracker-md px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value="">— Select —</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              </div>
            </div>

            {/* ── Actual Hours ── */}
            {task.actualHours > 0 && (
              <div>
                <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1 block">Logged Hours</label>
                <span className="text-lg font-bold text-slate-800">{task.actualHours.toFixed(1)}h</span>
                {task.estimatedHours > 0 && (
                  <span className="text-xs text-slate-400 ml-1">/ {task.estimatedHours}h est.</span>
                )}
              </div>
            )}

            <div className="border-b border-slate-200" />

            {/* Priority Select */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Priority</label>
              <div className="relative">
                <select
                  value={task.priorityLevel || "Low"}
                  onChange={(e) => handleUpdate("priorityLevel", e.target.value)}
                  className="w-full appearance-none bg-white hover:bg-slate-100 border border-slate-200 rounded-tracker-md px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Weekly Priority">Weekly Priority</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              </div>
            </div>

            {/* Status Select */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Status</label>
              <div className="relative">
                <select
                  value={task.status || "Backlogs"}
                  onChange={(e) => handleUpdate("status", e.target.value)}
                  className="w-full appearance-none bg-white hover:bg-slate-100 border border-slate-200 rounded-tracker-md px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value="Backlogs">Backlogs</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Completed">Completed</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              </div>
            </div>

            {/* Tags Section */}
            <div>
              <label className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {(task.tags || []).map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-indigo-900 font-bold ml-0.5 cursor-pointer text-xs"
                    >
                      &times;
                    </button>
                  </span>
                ))}

                {showTagInput ? (
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    onBlur={handleAddTag}
                    autoFocus
                    placeholder="Add..."
                    className="px-2 py-0.5 border border-slate-200 rounded text-[10px] font-semibold text-ink w-16 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center justify-center p-1 border border-dashed border-slate-300 hover:border-indigo-500 rounded-full text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
            </div>

            <div className="border-b border-slate-200" />

            {/* About the Task Meta Info */}
            <div className="space-y-4 select-text">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} className="text-slate-400" /> About the task
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider block">Created By</label>
                  <span className="text-xs font-semibold text-slate-800">
                    {task.createdBy?.basicInfo?.firstName} {task.createdBy?.basicInfo?.lastName}
                  </span>
                </div>

                {task.clientId && (
                  <div>
                    <label className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider block">Client / Board</label>
                    <span className="text-xs font-semibold text-slate-800">
                      {task.clientId.name}
                    </span>
                  </div>
                )}

                {task.projectTypeId && (
                  <div>
                    <label className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider block">Project Type</label>
                    <span className="text-xs font-semibold text-slate-800">
                      {task.projectTypeId.name}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider block">Created On</label>
                  <span className="text-xs font-semibold text-slate-800">
                    {new Date(task.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Session History */}
            <SessionHistory taskId={id} />

          </div>

        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
