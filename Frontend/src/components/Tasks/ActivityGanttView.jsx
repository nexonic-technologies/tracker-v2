import { useState, useEffect, useMemo, useRef } from "react";
import { format, differenceInMinutes, startOfDay, addHours, isToday } from "date-fns";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/authProvider";
import { RefreshCw, Clock, Users, ListOrdered, ArrowUp, ArrowDown, UserMinus, Plus, ShieldAlert, Check, X } from "lucide-react";
import toast from "react-hot-toast";

export default function ActivityGanttView({ date = new Date(), filterUserId, filterTaskId }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [queues, setQueues] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Employee context for queue drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const containerRef = useRef(null);

  const HOUR_WIDTH = 80; // pixels per hour
  const ROW_HEIGHT = 50;
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const dayStart = startOfDay(date);

  const isUserManager = useMemo(() => {
    const roleName = (user?.roleName || "").toLowerCase();
    return roleName.includes("manager") || roleName.includes("admin") || user?.isSuperAdmin;
  }, [user]);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [sRes, qRes, eRes, tRes] = await Promise.all([
        axiosInstance.post("/populate/list/time_tracker_sessions", {
          filter: { startTime: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() } },
          sort: { startTime: 1 },
          limit: 300,
          populateFields: {
            jobTypeId: "name,icon,color,categoryId",
            userId: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage",
            taskId: "title,estimatedHours"
          }
        }),
        axiosInstance.post("/populate/read/employee_task_queues", {
          populateFields: { "queue.taskId": "title,estimatedHours,status,assignedTo,priorityLevel" }
        }),
        axiosInstance.post("/populate/read/employees", {
          fields: "basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage,professionalInfo.department"
        }),
        axiosInstance.post("/populate/read/tasks", {
          filter: { status: { $in: ["Backlogs", "To Do", "In Progress"] } }
        })
      ]);

      setSessions(sRes.data?.data || []);
      setQueues(qRes.data?.data || []);
      setEmployees(eRes.data?.data || []);
      setAllTasks(tRes.data?.data || []);
    } catch (err) {
      console.error("[ActivityGantt] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date, filterUserId, filterTaskId]);

  // Group everything by employee
  const employeeData = useMemo(() => {
    return employees.map((emp) => {
      const empId = emp._id;
      const empName = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim();

      // Filter sessions for this employee
      const empSessions = sessions.filter(s => {
        const uid = typeof s.userId === "object" ? s.userId._id : s.userId;
        return uid === empId;
      });

      // Get active session
      const activeSession = empSessions.find(s => s.status === "active");

      // Filter queue for this employee
      const empQueueDoc = queues.find(q => q.employeeId === empId);
      const rawQueue = empQueueDoc?.queue || [];
      // Filter out completed tasks from the queue
      const activeQueue = rawQueue
        .filter(qItem => qItem.taskId && !["Completed", "Approved"].includes(qItem.taskId.status))
        .sort((a, b) => a.order - b.order);

      // Compute sequential timelines for the upcoming queue
      let currentTimelineTime = new Date();
      if (activeSession) {
        const estHours = activeSession.taskId?.estimatedHours || 1;
        currentTimelineTime = new Date(new Date(activeSession.startTime).getTime() + estHours * 3600 * 1000);
      } else if (!isToday(date)) {
        // For non-today, default start sequential layout at 9:00 AM
        currentTimelineTime = new Date(dayStart);
        currentTimelineTime.setHours(9, 0, 0, 0);
      }

      const sequentialQueue = activeQueue.map((qItem) => {
        const task = qItem.taskId;
        const estHours = task.estimatedHours || 2; // Default estimation to 2h if empty
        const startTime = new Date(currentTimelineTime);
        const endTime = new Date(startTime.getTime() + estHours * 3600 * 1000);

        // Advance current pointer for next task
        currentTimelineTime = endTime;

        return {
          taskId: task._id,
          title: task.title,
          estimatedHours: estHours,
          startTime,
          endTime,
          priorityLevel: task.priorityLevel
        };
      });

      return {
        employee: emp,
        name: empName,
        sessions: empSessions,
        activeSession,
        queue: activeQueue,
        sequentialQueue
      };
    });
  }, [employees, sessions, queues, date]);

  // Calculate style for real tracker session bars
  const getSessionBarStyle = (session) => {
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const startMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = Math.max(10, differenceInMinutes(end, start));

    const left = (startMinutes / 60) * HOUR_WIDTH;
    const width = (durationMinutes / 60) * HOUR_WIDTH;
    const color = typeof session.jobTypeId === "object" ? session.jobTypeId.color : "#6B7280";

    return { left, width, color };
  };

  // Calculate style for upcoming queued task bars
  const getTaskBarStyle = (task) => {
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    const startMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);

    const left = (startMinutes / 60) * HOUR_WIDTH;
    const width = (durationMinutes / 60) * HOUR_WIDTH;

    return { left, width };
  };

  const nowPosition = useMemo(() => {
    if (!isToday(date)) return null;
    const now = new Date();
    return ((now.getHours() + now.getMinutes() / 60) * HOUR_WIDTH);
  }, [date]);

  // Open drawer
  const handleOpenQueue = (empData) => {
    setSelectedEmployee(empData);
    setShowDrawer(true);
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setSelectedEmployee(null);
    setShowDrawer(false);
  };

  // Reorder queue tasks
  const handleMoveQueueItem = async (direction, index) => {
    if (!selectedEmployee) return;
    const updatedQueue = [...selectedEmployee.queue];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updatedQueue.length) return;

    // Swap
    const temp = updatedQueue[index];
    updatedQueue[index] = updatedQueue[targetIdx];
    updatedQueue[targetIdx] = temp;

    // Reassign order keys
    updatedQueue.forEach((item, idx) => {
      item.order = idx;
    });

    const queueBody = updatedQueue.map((item) => ({
      taskId: item.taskId._id,
      order: item.order
    }));

    try {
      if (isUserManager) {
        // Managers update directly
        const queueDoc = queues.find(q => q.employeeId === selectedEmployee.employee._id);
        if (queueDoc) {
          await axiosInstance.put(`/populate/update/employee_task_queues/${queueDoc._id}`, {
            queue: queueBody
          });
        } else {
          await axiosInstance.post("/populate/create/employee_task_queues", {
            employeeId: selectedEmployee.employee._id,
            queue: queueBody
          });
        }
        toast.success("Work queue updated successfully!");
        fetchData();
        // Update local drawer state
        setSelectedEmployee(prev => ({
          ...prev,
          queue: updatedQueue
        }));
      } else {
        // Regular employees submit an approval request
        await axiosInstance.post("/populate/create/employee_task_queue_requests", {
          employeeId: selectedEmployee.employee._id,
          requestedQueue: queueBody
        });
        toast.success("Queue change request submitted for approval!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update queue order");
    }
  };

  // Assign task to employee queue
  const handleAssignTask = async (taskId) => {
    if (!selectedEmployee) return;
    try {
      // 1. Update task assignees first
      const task = allTasks.find(t => t._id === taskId);
      const currentAssignees = task.assignedTo || [];
      if (!currentAssignees.includes(selectedEmployee.employee._id)) {
        await axiosInstance.put(`/populate/update/tasks/${taskId}`, {
          assignedTo: [...currentAssignees, selectedEmployee.employee._id]
        });
      }

      toast.success("Task assigned and added to queue!");
      fetchData();
      handleCloseDrawer();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign task");
    }
  };

  // Remove task from employee queue
  const handleRemoveTask = async (taskId) => {
    if (!selectedEmployee) return;
    try {
      const task = allTasks.find(t => t._id === taskId);
      const remainingAssignees = (task.assignedTo || []).filter(id => id !== selectedEmployee.employee._id);
      await axiosInstance.put(`/populate/update/tasks/${taskId}`, {
        assignedTo: remainingAssignees
      });
      toast.success("Task removed from employee queue");
      fetchData();
      handleCloseDrawer();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove task");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-indigo-500" />
          <h3 className="font-bold text-slate-800 text-sm">Gantt Work Activity Timeline</h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Session</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-500" /> Finished Session</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded border border-dashed border-indigo-400 bg-indigo-50/40" /> Planned Queue</div>
          <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
            <RefreshCw size={13} className={`text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Timeline Grid ── */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div style={{ minWidth: `${24 * HOUR_WIDTH + 200}px` }} className="relative select-none">

          {/* Header Hour Rows */}
          <div className="flex h-8 bg-slate-50/50 border-b border-slate-100 sticky top-0 z-20">
            <div className="w-48 flex-shrink-0 bg-slate-50/80 border-r border-slate-100 sticky left-0 z-30 flex items-center px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</span>
            </div>
            <div className="flex flex-1">
              {HOURS.map(h => (
                <div key={h} className="flex-shrink-0 border-r border-slate-100 text-[10px] font-bold text-slate-400 flex items-center justify-center" style={{ width: HOUR_WIDTH }}>
                  {h.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative divide-y divide-slate-100">
            {/* Now line indicator */}
            {nowPosition && (
              <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: 192 + nowPosition }}>
                <div className="w-[1.5px] h-full bg-rose-500/60" />
                <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-rose-500" />
              </div>
            )}

            {employeeData.map((empData, idx) => (
              <div key={empData.employee._id || idx} className="flex group hover:bg-slate-50/30 transition-colors" style={{ height: ROW_HEIGHT }}>
                {/* Employee Info Sidebar */}
                <div
                  onClick={() => handleOpenQueue(empData)}
                  className="w-48 flex-shrink-0 bg-white group-hover:bg-slate-50/30 border-r border-slate-100 sticky left-0 z-20 flex items-center gap-2.5 px-4 cursor-pointer transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {empData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{empData.name}</p>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-0.5">
                      <ListOrdered size={9} /> Queue ({empData.queue.length})
                    </p>
                  </div>
                </div>

                {/* Timeline row */}
                <div className="flex-1 relative bg-stripes bg-slate-50/10">
                  {/* Hour background column borders */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {HOURS.map(h => (
                      <div key={h} className="h-full border-r border-slate-100/50" style={{ width: HOUR_WIDTH }} />
                    ))}
                  </div>

                  {/* Completed / Active Tracker Sessions */}
                  {empData.sessions.map((session, sIdx) => {
                    const style = getSessionBarStyle(session);
                    const jobName = typeof session.jobTypeId === "object" ? session.jobTypeId.name : "Session";
                    const isLive = session.status === "active";
                    const taskTitle = session.taskId?.title ? ` — ${session.taskId.title}` : "";

                    return (
                      <div
                        key={sIdx}
                        className={`absolute top-2 rounded-lg flex items-center gap-1.5 px-2 text-white text-[10px] font-bold overflow-hidden cursor-pointer shadow-xs ${isLive ? "animate-pulse border border-white/20" : ""
                          }`}
                        style={{
                          left: style.left,
                          width: Math.max(style.width, 24),
                          height: ROW_HEIGHT - 16,
                          backgroundColor: style.color
                        }}
                        title={`${jobName}${taskTitle}\n${format(new Date(session.startTime), "HH:mm")} - ${session.endTime ? format(new Date(session.endTime), "HH:mm") : "Now"
                          }`}
                      >
                        <span className="truncate">{jobName}</span>
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto flex-shrink-0 animate-ping" />}
                      </div>
                    );
                  })}

                  {/* Planned Sequential Task Queues */}
                  {empData.sequentialQueue.map((t, tIdx) => {
                    const style = getTaskBarStyle(t);
                    return (
                      <div
                        key={tIdx}
                        className="absolute top-2 rounded-lg border border-dashed border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 text-indigo-700 text-[9px] font-bold flex items-center px-2 cursor-pointer transition-colors shadow-2xs"
                        style={{
                          left: style.left,
                          width: Math.max(style.width, 24),
                          height: ROW_HEIGHT - 16
                        }}
                        title={`Queue Task: ${t.title}\nEst: ${t.estimatedHours}h\nPlanned: ${format(t.startTime, "HH:mm")} - ${format(t.endTime, "HH:mm")}`}
                        onClick={() => handleOpenQueue(empData)}
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded ml-auto flex-shrink-0">
                          {t.estimatedHours}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Employee Work Queue Slide Drawer ── */}
      {showDrawer && selectedEmployee && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-text">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {selectedEmployee.name}'s Work Queue
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Re-order sequence, add or reassign tasks</p>
            </div>
            <button onClick={handleCloseDrawer} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Active Task (If any) */}
            {selectedEmployee.activeSession && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Currently Active Task
                </span>
                <h4 className="text-xs font-bold text-slate-800">
                  {selectedEmployee.activeSession.taskId?.title || "Real-time untracked session"}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock size={11} /> Start Time: {format(new Date(selectedEmployee.activeSession.startTime), "HH:mm")} · Estimated: {selectedEmployee.activeSession.taskId?.estimatedHours || 1}h
                </p>
              </div>
            )}

            {/* Tasks Queue List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Upcoming Queued Tasks</h4>

              {selectedEmployee.queue.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-100/50 rounded-xl p-4 text-center">
                  No upcoming tasks scheduled in queue.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEmployee.queue.map((item, idx) => (
                    <div key={item._id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-slate-300 transition-colors">
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.taskId.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                            {item.taskId.estimatedHours || 2}h est.
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            Priority: {item.taskId.priorityLevel}
                          </span>
                        </div>
                      </div>

                      {/* Controls (Move up/down/remove) */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveQueueItem("up", idx)}
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => handleMoveQueueItem("down", idx)}
                          disabled={idx === selectedEmployee.queue.length - 1}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => handleRemoveTask(item.taskId._id)}
                          className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove from queue"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Task to Queue Section */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add / Assign Backlog Task</h4>
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => e.target.value && handleAssignTask(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="">Choose a task to assign and schedule...</option>
                  {allTasks
                    .filter((t) => !(selectedEmployee.queue.some(q => q.taskId._id === t._id)))
                    .map((t) => (
                      <option key={t._id} value={t._id}>{t.title} ({t.estimatedHours || 2}h)</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* Non-manager Warning Badge */}
            {!isUserManager && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs font-semibold select-none leading-relaxed">
                <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  You are viewing this queue in **Employee Mode**. Drag/move updates will submit a request to your reporting manager for approval before taking effect.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
