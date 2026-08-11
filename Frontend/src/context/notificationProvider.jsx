/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./authProvider.jsx";
import axiosInstance from "../api/axiosInstance";
import { AlertTriangle, X, UserMinus, Clock, Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activeSlaAlert, setActiveSlaAlert] = useState(null);
  const { user } = useAuth();

  // 1️⃣ Establish socket connection
  useEffect(() => {
    if (!user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const isDev = import.meta.env.DEV;
    const socketUrl = isDev ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      socketInstance.emit("join", user.id);
    });

    // Receive live notifications & intercept SLA Alerts
    socketInstance.on("notification", (data) => {
      setNotifications((prev) => [data, ...prev]);

      // If it is a live SLA alert, pop up the warning dashboard modal for managers
      if (data.type === 'leave' && data.title?.includes('SLA Alert')) {
        // Extract metaId which holds the OperationalEvent ID
        const eventId = data.meta?.modelId;
        if (eventId) {
          // Fetch event details to render actions
          axiosInstance.post(`/populate/read/operational_events/${eventId}`)
            .then(res => {
              if (res.data?.data) {
                setActiveSlaAlert(res.data.data);
              }
            })
            .catch(() => { });
        }
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [user?.id]);

  // 2️⃣ Fetch saved notifications from backend when user logs in
  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifications = async () => {
      try {
        const filter = { recipient: user.id };
        const res = await axiosInstance.post('/populate/read/notifications', {
          filter,
          populateFields: { "sender": "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage" }
        });
        const data = res.data?.data || [];
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    fetchNotifications();
  }, [user?.id]);

  const unReadCount = notifications.filter((notif) => !(notif.isRead || notif.read)).length;

  const markAsRead = async (notificationId) => {
    try {
      const res = await axiosInstance.put(
        `/populate/update/notifications/${notificationId}`,
        { isRead: true }
      );

      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, isRead: true, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const res = await axiosInstance.put(
        `/populate/update/notifications/${notificationId}`,
        { isDeleted: true }
      );
      if (res.data.success) {
        setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const clearAll = async () => {
    try {
      await Promise.all(
        notifications.map((notif) =>
          axiosInstance.put(`/populate/update/notifications/${notif._id}`, { isDeleted: true })
        )
      );
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{ socket, notifications, markAsRead, unReadCount, deleteNotification, clearAll }}
    >
      {children}
      {activeSlaAlert && (
        <SlaAlertModal
          alert={activeSlaAlert}
          onClose={() => setActiveSlaAlert(null)}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Hook to access notifications anywhere
export const useNotification = () => useContext(NotificationContext);

// ── Actionable SLA Alert Modal Component ──────────────────────────────────────
const SlaAlertModal = ({ alert, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [queueTasks, setQueueTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load employee's active queue tasks
  useEffect(() => {
    if (!alert.employeeId) return;
    setLoading(true);
    axiosInstance.get(`/employees/${alert.employeeId}/gantt-queue`)
      .then(res => {
        setQueueTasks(res.data?.data?.entries || []);
      })
      .catch(() => {
        toast.error("Failed to load queue tasks");
      })
      .finally(() => setLoading(false));
  }, [alert.employeeId]);

  // Load candidate recommendations when task is selected
  const selectTask = (task) => {
    setSelectedTask(task);
    setLoadingSuggestions(true);
    setOverrideDate("");
    axiosInstance.get(`/tasks/${task.taskId}/reassign-suggestions`)
      .then(res => {
        setSuggestions(res.data?.data || []);
      })
      .catch(() => {
        toast.error("Failed to load suggestions");
      })
      .finally(() => setLoadingSuggestions(false));
  };

  // Action 1: Reassign Developer
  const handleReassign = async (targetEmployeeId) => {
    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/tasks/${selectedTask.taskId}`, {
        assignedTo: [targetEmployeeId]
      });
      toast.success("Task reassigned successfully");

      // Update local state
      setQueueTasks(prev => prev.filter(t => t.taskId !== selectedTask.taskId));
      setSelectedTask(null);

      // Recalculate ETAs dynamically
      await axiosInstance.post(`/tickets/${selectedTask.linkedTicketId}/recalculate-eta`);
    } catch {
      toast.error("Reassignment failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Action 2: Override ETA
  const handleOverrideETA = async () => {
    if (!overrideDate) return;
    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/tickets/${selectedTask.linkedTicketId}`, {
        etaEstimatedDelivery: new Date(overrideDate),
        delayReason: 'CAPACITY_DELAY',
        rootCause: 'DEPENDENCY_BLOCKED'
      });
      toast.success("Ticket ETA updated successfully");
      setSelectedTask(null);
    } catch {
      toast.error("Failed to update ETA");
    } finally {
      setSubmitting(false);
    }
  };

  // Action 3: Defer (de-sprint) Task
  const handleDeferTask = async () => {
    setSubmitting(true);
    try {
      await axiosInstance.put(`/populate/update/tasks/${selectedTask.taskId}`, {
        sprintId: null
      });
      toast.success("Task shifted out of Sprint (Deferred)");

      // Update local task
      setQueueTasks(prev => prev.map(t => t.taskId === selectedTask.taskId ? { ...t, sprintId: null } : t));
      setSelectedTask(null);

      // Recalculate queue ETAs
      await axiosInstance.post(`/tickets/${selectedTask.linkedTicketId}/recalculate-eta`);
    } catch {
      toast.error("Failed to defer task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--tracker-border-soft)] bg-red-50/50 dark:bg-red-950/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--tracker-ink)]">SLA Warning: Operational Absence</h3>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
                Delay Detected due to {alert.rootCause === 'PLANNED_LEAVE' ? 'Planned Leave' : 'Employee Absence'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-subtle)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 border-dashed rounded-xl flex gap-3">
            <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--tracker-ink-muted)] leading-relaxed">
              <strong>{alert.metadata?.affectedTasks || 0} tasks</strong> are affected by this absence today.
              Recalculated queue timelines predict the furthest completion delay to be <strong>{alert.metadata?.latestETA ? new Date(alert.metadata.latestETA).toLocaleDateString() : '—'}</strong>.
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-[var(--module-ticket)] h-8 w-8 mb-2" />
              <p className="text-xs text-[var(--tracker-ink-subtle)]">Loading affected queue timeline...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Left Column: Affected Tasks */}
              <div>
                <h4 className="text-[11px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-2.5">
                  Affected Tasks
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {queueTasks.map(task => (
                    <button
                      key={task.taskId}
                      onClick={() => selectTask(task)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${selectedTask?.taskId === task.taskId
                          ? "bg-[var(--tracker-surface-2)] border-[var(--tracker-border-focus)] shadow-xs"
                          : "bg-[var(--tracker-surface-1)] border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)]"
                        }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-[var(--tracker-ink)] truncate group-hover:text-[var(--module-ticket)]">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-[var(--tracker-ink-subtle)] mt-1">
                          Est: {task.estimatedHours || 2}h · ETA: {new Date(task.projectedEnd).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {selectedTask?.taskId === task.taskId && (
                        <Check size={13} className="text-[var(--module-ticket)] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Decisions Panel */}
              <div className="border-l border-[var(--tracker-border-soft)] pl-0 md:pl-5">
                {selectedTask ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-1">
                        SLA Control Center
                      </h4>
                      <p className="text-[10px] text-[var(--tracker-ink-subtle)]">
                        Active Task: <span className="font-semibold text-[var(--tracker-ink)]">{selectedTask.title}</span>
                      </p>
                    </div>

                    <div className="border-t border-[var(--tracker-border-soft)] pt-3 space-y-3">
                      {/* Suggestion Reassignments */}
                      <div>
                        <span className="text-[10.5px] font-bold text-[var(--tracker-ink-muted)] block mb-2">
                          Suggested Reassignments
                        </span>
                        {loadingSuggestions ? (
                          <div className="py-4 flex justify-center">
                            <Loader2 className="animate-spin text-[var(--tracker-ink-subtle)]" size={16} />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {suggestions.map(cand => (
                              <button
                                key={cand.employeeId}
                                disabled={submitting}
                                onClick={() => handleReassign(cand.employeeId)}
                                className="w-full flex items-center justify-between p-2 rounded-lg border border-[var(--tracker-border)] bg-[var(--tracker-surface)] hover:bg-[var(--tracker-surface-2)] transition-colors text-left cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-[var(--tracker-ink)] block truncate">{cand.name}</span>
                                  <span className="text-[9px] text-[var(--tracker-ink-subtle)]">
                                    Queue: {cand.queueHours}h {cand.matchesDept && "· Same Team"}
                                  </span>
                                </div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600">
                                  Score: {Math.round(cand.score)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Manual ETA override */}
                      <div className="border-t border-[var(--tracker-border-soft)] pt-3">
                        <label className="text-[10.5px] font-bold text-[var(--tracker-ink-muted)] block mb-1.5">
                          Override ETA / Target Date
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="datetime-local"
                            value={overrideDate}
                            onChange={e => setOverrideDate(e.target.value)}
                            className="lmx-input text-xs flex-1 py-1.5"
                          />
                          <button
                            disabled={submitting || !overrideDate}
                            onClick={handleOverrideETA}
                            className="px-3 py-1.5 bg-[var(--module-ticket)] text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-40"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      {/* Defer Task */}
                      <div className="border-t border-[var(--tracker-border-soft)] pt-3 flex gap-2">
                        <button
                          disabled={submitting}
                          onClick={handleDeferTask}
                          className="flex-1 py-2 border border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] font-bold text-xs rounded-xl transition-all"
                        >
                          Defer (De-sprint)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <UserMinus className="text-[var(--tracker-ink-tertiary)] opacity-55 mb-2" size={32} />
                    <p className="text-xs text-[var(--tracker-ink-subtle)] max-w-[180px]">
                      Select an affected task from the list to trigger reassignments or ETA overrides.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--tracker-border-soft)] bg-[var(--tracker-surface-1)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] font-bold text-xs rounded-xl transition-all"
          >
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
};
