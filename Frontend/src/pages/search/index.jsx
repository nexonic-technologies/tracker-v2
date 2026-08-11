import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import {
  Search, FileText, CheckSquare, Clock, AlertCircle,
  ArrowRight, Inbox, Tag, ShieldAlert
} from "lucide-react";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState({ tickets: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) return;

    const performSearch = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axiosInstance.get(`/search?q=${encodeURIComponent(query)}`);
        if (res.data?.success) {
          setResults(res.data.data);
        } else {
          setError("Failed to fetch search results");
        }
      } catch (err) {
        console.error("Search API error:", err);
        setError("Something went wrong while searching. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/form?id=${ticketId}`);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const getPriorityColor = (priority) => {
    const p = String(priority).toLowerCase();
    if (p === "critical" || p === "weekly priority") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (p === "high") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    if (p === "medium") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
  };

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    if (s === "open" || s === "todo" || s === "backlogs") return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
    if (s === "in progress" || s === "processing") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    if (s === "completed" || s === "paid" || s === "resolved") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
  };

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-canvas text-ink min-h-[80vh]">
      {/* Header */}
      <div>
        <p className="lmx-page-eyebrow mb-1">GLOBAL SEARCH</p>
        <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
          <Search className="h-6 w-6 text-accent" />
          Search Results
        </h1>
        {query ? (
          <p className="text-sm text-ink-muted mt-1">
            Showing results for <span className="font-semibold text-ink">"{query}"</span>
          </p>
        ) : (
          <p className="text-sm text-ink-muted mt-1">Enter a query in the top bar to search.</p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-tracker-lg flex items-center gap-3 text-red-800 dark:text-red-400">
          <ShieldAlert size={20} className="flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((col) => (
            <div key={col} className="space-y-4">
              <div className="h-6 bg-surface-1 rounded w-1/3 animate-pulse" />
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-surface border border-hairline p-5 rounded-tracker-card space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-surface-1 rounded w-1/4 animate-pulse" />
                    <div className="h-5 bg-surface-1 rounded w-16 animate-pulse" />
                  </div>
                  <div className="h-5 bg-surface-1 rounded w-3/4 animate-pulse" />
                  <div className="h-10 bg-surface-1 rounded w-full animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : !query ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-surface-1 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-ink-subtle" />
          </div>
          <h3 className="text-base font-semibold text-ink">Search the workspace</h3>
          <p className="text-sm text-ink-muted mt-1 max-w-xs">Use the search bar at the top of the screen to search across tickets and tasks.</p>
        </div>
      ) : results.tickets.length === 0 && results.tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-surface-1 flex items-center justify-center mb-4">
            <Inbox className="h-6 w-6 text-ink-subtle" />
          </div>
          <h3 className="text-base font-semibold text-ink">No results found</h3>
          <p className="text-sm text-ink-muted mt-1 max-w-xs">We couldn't find any tickets or tasks matching "{query}". Check your spelling or try another term.</p>
        </div>
      ) : (
        /* Results columns */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Tickets Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-indigo-500" />
                Tickets ({results.tickets.length})
              </h2>
            </div>

            <div className="space-y-3">
              {results.tickets.length === 0 ? (
                <div className="bg-surface/50 border border-dashed border-hairline p-8 text-center rounded-tracker-card text-ink-subtle text-sm">
                  No matching tickets.
                </div>
              ) : (
                results.tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => handleTicketClick(ticket._id)}
                    className="bg-surface border border-hairline hover:border-accent hover:shadow-[var(--tracker-shadow-raised)] p-5 rounded-tracker-card transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <span className="text-[11px] font-bold text-ink-subtle flex items-center gap-1">
                        <Tag size={12} className="text-indigo-400" />
                        {ticket.ticketId || "TIC-CODE"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-[14px] font-semibold text-ink group-hover:text-accent leading-snug mb-1">
                      {ticket.title}
                    </h3>

                    <p className="text-[12px] text-ink-muted line-clamp-2 leading-relaxed mb-3">
                      {ticket.description || ticket.userStory || "No description provided."}
                    </p>

                    <div className="flex items-center justify-end text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      View Ticket <ArrowRight size={12} className="ml-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tasks Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                Tasks ({results.tasks.length})
              </h2>
            </div>

            <div className="space-y-3">
              {results.tasks.length === 0 ? (
                <div className="bg-surface/50 border border-dashed border-hairline p-8 text-center rounded-tracker-card text-ink-subtle text-sm">
                  No matching tasks.
                </div>
              ) : (
                results.tasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => handleTaskClick(task._id)}
                    className="bg-surface border border-hairline hover:border-accent hover:shadow-[var(--tracker-shadow-raised)] p-5 rounded-tracker-card transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <span className="text-[11px] font-bold text-ink-subtle flex items-center gap-1">
                        <Clock size={12} className="text-emerald-400" />
                        Task Record
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getPriorityColor(task.priorityLevel)}`}>
                          {task.priorityLevel}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-[14px] font-semibold text-ink group-hover:text-accent leading-snug mb-1">
                      {task.title}
                    </h3>

                    <p className="text-[12px] text-ink-muted line-clamp-2 leading-relaxed mb-3">
                      {task.userStory || "No user story or description provided."}
                    </p>

                    <div className="flex items-center justify-end text-[11px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      View Task <ArrowRight size={12} className="ml-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
