import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, AlertCircle, CheckCircle2, Inbox, ArrowRight } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/authProvider";

export default function PriorityTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchPriorityTasks = async () => {
      try {
        const filter = {
          assignedTo: user._id,
          status: { $ne: "Completed" }
        };

        const res = await axiosInstance.get(
          `/populate/read/tasks?filter=${encodeURIComponent(
            JSON.stringify(filter)
          )}&limit=5&sort={"createdAt":1}`
        );

        setTasks(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch priority tasks", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriorityTasks();
  }, [user]);

  // Color mapping based on priority
  const getPriorityClasses = (priority = "medium") => {
    const val = priority.toLowerCase();
    if (val === "high") {
      return {
        border: "border-l-rose-500",
        badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
        dot: "bg-rose-500"
      };
    }
    if (val === "medium") {
      return {
        border: "border-l-amber-500",
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
        dot: "bg-amber-500"
      };
    }
    return {
      border: "border-l-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      dot: "bg-emerald-500"
    };
  };

  // Color mapping based on status
  const getStatusBadge = (status = "Todo") => {
    const val = status.toLowerCase();
    if (val === "completed") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    }
    if (val === "in progress" || val === "in-progress") {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Priority Tasks</h3>
        </div>
        <Link 
          to="/tasks/my-tasks" 
          className="group flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-xl">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/3" />
              </div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400 mb-3">
            <Inbox className="w-8 h-8" />
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-0.5">All tasks caught up!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending priority tasks assigned to you. 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const pClasses = getPriorityClasses(task.priorityLevel);
            const dateVal = task.dueDate || task.endDate || task.createdAt;
            return (
              <div 
                key={task._id}
                className={`group flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 hover:bg-white dark:bg-zinc-800/20 dark:hover:bg-zinc-800/40 border border-gray-100 hover:border-blue-100 dark:border-zinc-800 dark:hover:border-zinc-700 border-l-4 ${pClasses.border} rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5`}
              >
                <div className="flex-1 mb-2 md:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${pClasses.badge}`}>
                      <span className={`w-1 h-1 rounded-full ${pClasses.dot} mr-1`} />
                      {task.priorityLevel || "Medium"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateVal ? new Date(dateVal).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }) : "No due date"}
                    </span>
                    {task.taskId && (
                      <span className="text-gray-400">#{task.taskId}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}