import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/authProvider";
import { Calendar, Plus, X, FolderKanban, CheckSquare, Square, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SprintScheduler({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("2-weeks"); // 1-day, 1-week, 2-weeks, 1-month
  const [clientId, setClientId] = useState("");
  const [projectTypeId, setProjectTypeId] = useState("");
  const [clients, setClients] = useState([]);
  const [project_types, setproject_types] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch clients, project types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, ptRes] = await Promise.all([
          axiosInstance.post("/populate/read/clients", { fields: "name" }),
          axiosInstance.post("/populate/read/project_types", { fields: "name" })
        ]);
        setClients(cRes.data.data || []);
        setproject_types(ptRes.data.data || []);
      } catch (err) {
        console.error("Error fetching options", err);
      }
    };
    fetchData();
  }, []);

  // Fetch backlogged tasks matching client and project type
  useEffect(() => {
    const fetchTasks = async () => {
      if (!clientId) {
        setAvailableTasks([]);
        return;
      }
      try {
        const filter = {
          clientId,
          status: { $in: ["Backlogs", "To Do"] }
        };
        if (projectTypeId) {
          filter.projectTypeId = projectTypeId;
        }
        const res = await axiosInstance.post("/populate/read/tasks", {
          filter,
          limit: 100
        });
        // Filter out tasks already in other active/upcoming sprints
        const tasks = res.data.data || [];
        setAvailableTasks(tasks);
      } catch (err) {
        console.error("Error fetching tasks", err);
      }
    };
    fetchTasks();
  }, [clientId, projectTypeId]);

  // Compute end date based on startDate and duration preset
  const getEndDate = () => {
    if (!startDate) return "";
    const start = new Date(startDate);
    let end = new Date(startDate);
    if (duration === "1-day") {
      end.setDate(start.getDate());
    } else if (duration === "1-week") {
      end.setDate(start.getDate() + 7);
    } else if (duration === "2-weeks") {
      end.setDate(start.getDate() + 14);
    } else if (duration === "1-month") {
      end.setMonth(start.getMonth() + 1);
    }
    return end.toISOString().split("T")[0];
  };

  const handleToggleTask = (taskId) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Sprint name is required");
    if (!clientId) return toast.error("Client collection is required");
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: new Date(getEndDate()),
        status: "Upcoming",
        clientId,
        createdBy: user.id,
        tasks: Array.from(selectedTasks)
      };
      if (projectTypeId) {
        payload.projectTypeId = projectTypeId;
      }

      await axiosInstance.post("/populate/create/sprints", payload);
      toast.success("Sprint created successfully!");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create sprint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-text">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FolderKanban size={16} />
            </div>
            <div>
              <h2 className="text-md font-bold text-slate-800">Schedule Sprint / Cohort</h2>
              <p className="text-[11px] text-slate-400 font-medium">Batch and schedule tasks in dynamic timelines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sprint Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Sprint Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Release Sprint 1"
              className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
            />
          </div>

          {/* Collection Scope Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Client / Collection</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Project Type (Optional)</label>
              <select
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">All project types</option>
                {project_types.map((pt) => (
                  <option key={pt._id} value={pt._id}>{pt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date & Presets */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Calculated End Date</label>
                <div className="px-3 py-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400" />
                  <span className="font-semibold">{getEndDate() || "Pick a start date"}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sprint Duration Preset</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "1-day", label: "1 Day" },
                  { key: "1-week", label: "1 Week" },
                  { key: "2-weeks", label: "2 Weeks" },
                  { key: "1-month", label: "1 Month" }
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setDuration(p.key)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${duration === p.key
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100 flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add Tasks to Sprint</label>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                {selectedTasks.size} selected
              </span>
            </div>

            {availableTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-6 text-center text-slate-400">
                <CheckSquare size={20} className="stroke-[1.5] mb-1.5 opacity-60" />
                <p className="text-[11px] font-medium">No backlogged tasks found for this client collection.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                {availableTasks.map((t) => {
                  const active = selectedTasks.has(t._id);
                  return (
                    <div
                      key={t._id}
                      onClick={() => handleToggleTask(t._id)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/50 cursor-pointer select-none transition-colors"
                    >
                      <button type="button" className="text-slate-400 hover:text-indigo-600 transition-colors">
                        {active ? (
                          <CheckSquare size={15} className="text-indigo-600 fill-indigo-50" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{t.title}</p>
                        {t.assignedTo?.[0] && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                            Assignee: {t.assignedTo[0].basicInfo?.firstName} {t.assignedTo[0].basicInfo?.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? "Scheduling..." : "Schedule Sprint"}
          </button>
        </div>
      </div>
    </div>
  );
}
