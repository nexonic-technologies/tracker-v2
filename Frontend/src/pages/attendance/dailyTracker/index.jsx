import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../context/authProvider.jsx";
import useGenericAPI from "../../../components/useGenericAPI";
import { generateDailyWorkSummary } from "../../../services/aiSummarizer.js";
import toast, { Toaster } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Briefcase,
  FolderKanban,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  GitCommit,
  CheckCircle2,
  PieChart,
  Layers,
  ArrowRight
} from "lucide-react";

const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Generates Mon to Sun days for the week of a given reference date
const getWeekDays = (refDate = new Date()) => {
  const curr = new Date(refDate);
  const day = curr.getDay();
  // Adjust so Monday is 0, Sunday is 6
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

const DailyTracker = () => {
  const { user } = useAuth();
  const { read, create, remove, update, loading } = useGenericAPI();

  // State: Active selected date
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekRefDate, setWeekRefDate] = useState(new Date());

  // State: Data collections
  const [activities, setActivities] = useState([]);
  const [weekActivities, setWeekActivities] = useState([]);
  const [clients, setClients] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);

  // State: Quick Inline Form
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState("");
  const [selectedTaskType, setSelectedTaskType] = useState("");
  const [activityText, setActivityText] = useState("");
  const [activityHours, setActivityHours] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // State: Git Quick-Input
  const [gitInput, setGitInput] = useState("");
  const [gitCommitsList, setGitCommitsList] = useState([]);
  const [showGitDrawer, setShowGitDrawer] = useState(false);

  // State: AI Standup Summary
  const [aiSummary, setAiSummary] = useState("");
  const [aiEngine, setAiEngine] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate week days for navigator
  const weekDays = useMemo(() => getWeekDays(weekRefDate), [weekRefDate]);

  // 1. Fetch Lookups (Clients, Project Types, Task Types)
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [cRes, pRes, tRes] = await Promise.all([
          read("clients", { limit: 100 }),
          read("project_types", { limit: 100 }),
          read("task_types", { limit: 100 })
        ]);
        setClients(cRes?.data || []);
        setProjectTypes(pRes?.data || []);
        setTaskTypes(tRes?.data || []);
      } catch (err) {
        console.error("Failed to load metadata lookups:", err);
      }
    };
    fetchLookups();
  }, [user?.id]);

  // 2. Fetch Activities for Selected Date and the Current Week
  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;
    try {
      const selectedStr = getLocalDateString(selectedDate);
      const weekStartStr = getLocalDateString(weekDays[0]);
      const weekEndStr = getLocalDateString(weekDays[6]);

      const [dayRes, weekRes] = await Promise.all([
        read("daily_activities", {
          filter: {
            $or: [{ user: user.id }, { employee: user.id }, { employeeId: user.id }],
            date: {
              $gte: `${selectedStr}T00:00:00.000Z`,
              $lte: `${selectedStr}T23:59:59.999Z`
            }
          },
          populateFields: {
            client: "name,clientName",
            projectType: "name,title",
            taskType: "name,title"
          },
          sort: { createdAt: 1 },
          limit: 50
        }),
        read("daily_activities", {
          filter: {
            $or: [{ user: user.id }, { employee: user.id }, { employeeId: user.id }],
            date: {
              $gte: `${weekStartStr}T00:00:00.000Z`,
              $lte: `${weekEndStr}T23:59:59.999Z`
            }
          },
          populateFields: { client: "name" },
          limit: 200
        })
      ]);

      setActivities(dayRes?.data || []);
      setWeekActivities(weekRes?.data || []);
    } catch (err) {
      console.error("Failed to load daily activities:", err);
    }
  }, [user?.id, selectedDate, weekDays]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // 3. Computed Metrics
  const todayTotalHours = useMemo(() => {
    return activities.reduce((sum, a) => sum + (Number(a.hours) || 1), 0);
  }, [activities]);

  const weekTotalHours = useMemo(() => {
    return weekActivities.reduce((sum, a) => sum + (Number(a.hours) || 1), 0);
  }, [weekActivities]);

  const activeClientsCount = useMemo(() => {
    const set = new Set();
    activities.forEach((a) => {
      const cId = a.client?._id || a.client || a.clientName;
      if (cId) set.add(cId.toString());
    });
    return set.size;
  }, [activities]);

  // Client Effort Breakdown
  const clientBreakdown = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      const name = a.client?.name || a.clientName || "General / Internal";
      const hrs = Number(a.hours) || 1;
      map[name] = (map[name] || 0) + hrs;
    });

    const total = todayTotalHours || 1;
    return Object.entries(map).map(([name, hrs]) => ({
      name,
      hours: hrs,
      pct: Math.round((hrs / total) * 100)
    }));
  }, [activities, todayTotalHours]);

  // Task Type Breakdown
  const taskBreakdown = useMemo(() => {
    const map = {};
    activities.forEach((a) => {
      const name = a.taskType?.name || a.taskTypeName || "General Task";
      const hrs = Number(a.hours) || 1;
      map[name] = (map[name] || 0) + hrs;
    });
    return Object.entries(map).map(([name, hrs]) => ({ name, hours: hrs }));
  }, [activities]);

  // 4. Save Activity Handler (Create or Update)
  const handleSaveActivity = async (e) => {
    e?.preventDefault();
    if (!activityText.trim()) {
      toast.error("Please enter a description for this activity");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user: user.id,
        employee: user.id,
        employeeId: user.id,
        date: selectedDate,
        client: selectedClient || null,
        projectType: selectedProjectType || null,
        taskType: selectedTaskType || null,
        activity: activityText.trim(),
        hours: Number(activityHours) || 1,
        status: "Completed"
      };

      if (editingId) {
        await update("daily_activities", editingId, payload, "Activity updated successfully!");
        setEditingId(null);
      } else {
        await create("daily_activities", payload, "Activity logged to your daily summary!");
      }

      setActivityText("");
      setActivityHours(1);
      fetchActivities();
    } catch (err) {
      console.error("Save activity error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Delete Activity Handler
  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity log?")) return;
    try {
      await remove("daily_activities", id, "Activity removed");
      fetchActivities();
    } catch (err) {
      console.error("Failed to delete activity:", err);
    }
  };

  // 6. Edit Activity Trigger
  const handleStartEdit = (act) => {
    setEditingId(act._id);
    setSelectedClient(act.client?._id || act.client || "");
    setSelectedProjectType(act.projectType?._id || act.projectType || "");
    setSelectedTaskType(act.taskType?._id || act.taskType || "");
    setActivityText(act.activity || act.description || "");
    setActivityHours(act.hours || 1);
  };

  // 7. Git Quick-Import parser
  const handleImportGitCommit = (message) => {
    setActivityText((prev) => (prev ? `${prev}\n• ${message}` : `• ${message}`));
    toast.success("Git commit imported into activity description!");
  };

  const handleParsePastedGit = () => {
    if (!gitInput.trim()) return;
    const lines = gitInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((msg, idx) => ({
      hash: `git-${idx + 1}`,
      message: msg.replace(/^[*\-•\d.]+\s*/, "")
    }));
    setGitCommitsList(parsed);
    setGitInput("");
    toast.success(`Loaded ${parsed.length} commit(s) for quick import`);
  };

  // 8. AI Standup Summarization Trigger
  const handleGenerateSummary = async () => {
    if (activities.length === 0 && gitCommitsList.length === 0) {
      toast.error("Please log at least one activity or commit to generate a summary.");
      return;
    }

    setGeneratingAi(true);
    try {
      const employeeName = `${user?.basicInfo?.firstName || ""} ${user?.basicInfo?.lastName || ""}`.trim() || user?.email || "Team Member";

      const res = await generateDailyWorkSummary({
        employeeName,
        date: selectedDate,
        activities,
        gitCommits: gitCommitsList
      });

      if (res.success && res.summary) {
        setAiSummary(res.summary);
        setAiEngine(res.engine);
        toast.success(`Summary generated via ${res.engine}!`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate AI summary");
    } finally {
      setGeneratingAi(false);
    }
  };

  // 9. Copy Standup Summary to Clipboard
  const handleCopySummary = () => {
    if (!aiSummary) {
      // Fallback: Generate quick plain-text summary from activities
      const plainText = `*Daily Standup Summary (${new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })})*\n\n` +
        activities.map((a) => `• [${a.client?.name || "General"}] ${a.activity || a.description} (${a.hours || 1}h)`).join("\n") +
        `\n\n*Total Hours:* ${todayTotalHours}h`;

      navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Standup summary copied to clipboard!");
      return;
    }

    navigator.clipboard.writeText(aiSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("AI Standup Summary copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[var(--tracker-surface-1)]/30 text-[var(--tracker-ink)] pb-12">
      <Toaster position="top-right" />

      {/* Top Header Hub */}
      <div className="bg-[var(--tracker-surface)] border-b border-[var(--tracker-border)] sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--brand-solid)]">
                Workhub Productivity
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--brand-solid)]/10 text-[var(--brand-solid)]">
                2026 Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--tracker-ink)] mt-0.5">
              Daily Work & AI Summary Hub
            </h1>
          </div>

          {/* Header Action Strip */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] hover:bg-[var(--tracker-surface-1)] text-[12px] font-medium transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[var(--tracker-ink-muted)]" />}
              <span>{copied ? "Copied!" : "Copy Standup"}</span>
            </button>

            <button
              onClick={handleGenerateSummary}
              disabled={generatingAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--tracker-radius-md)] bg-[var(--brand-solid)] hover:opacity-90 text-white text-[12px] font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generatingAi ? "animate-spin" : ""}`} />
              <span>{generatingAi ? "Generating..." : "AI Standup"}</span>
            </button>

            <button
              onClick={fetchActivities}
              className="p-1.5 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* Metric Cards Banner (4 Density Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider block">
                Today's Effort
              </span>
              <span className="text-xl font-bold font-mono text-[var(--tracker-ink)]">
                {todayTotalHours}h{" "}
                <span className="text-[12px] font-normal text-[var(--tracker-ink-muted)]">
                  / 8.0h
                </span>
              </span>
            </div>
            <div className="h-9 w-9 rounded-[var(--tracker-radius-md)] bg-[var(--brand-solid)]/10 text-[var(--brand-solid)] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider block">
                Weekly Total
              </span>
              <span className="text-xl font-bold font-mono text-[var(--tracker-ink)]">
                {weekTotalHours}h{" "}
                <span className="text-[12px] font-normal text-[var(--tracker-ink-muted)]">
                  / 40h
                </span>
              </span>
            </div>
            <div className="h-9 w-9 rounded-[var(--tracker-radius-md)] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider block">
                Engaged Clients
              </span>
              <span className="text-xl font-bold font-mono text-[var(--tracker-ink)]">
                {activeClientsCount}{" "}
                <span className="text-[12px] font-normal text-[var(--tracker-ink-muted)]">
                  active
                </span>
              </span>
            </div>
            <div className="h-9 w-9 rounded-[var(--tracker-radius-md)] bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider block">
                Logged Activities
              </span>
              <span className="text-xl font-bold font-mono text-[var(--tracker-ink)]">
                {activities.length}{" "}
                <span className="text-[12px] font-normal text-[var(--tracker-ink-muted)]">
                  tasks
                </span>
              </span>
            </div>
            <div className="h-9 w-9 rounded-[var(--tracker-radius-md)] bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Weekly Interactive Day Switcher Strip */}
        <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-3 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
          <button
            onClick={() => {
              const prevWeek = new Date(weekRefDate);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setWeekRefDate(prevWeek);
            }}
            className="p-1.5 rounded-[var(--tracker-radius-md)] hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 flex-1 justify-around">
            {weekDays.map((d, i) => {
              const dStr = getLocalDateString(d);
              const selStr = getLocalDateString(selectedDate);
              const isSelected = dStr === selStr;
              const isToday = dStr === getLocalDateString(new Date());

              // Calculate total hours logged on this specific day in the week
              const dayHours = weekActivities
                .filter((a) => a.date && a.date.startsWith(dStr))
                .reduce((s, a) => s + (Number(a.hours) || 1), 0);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-[var(--tracker-radius-md)] border text-center transition-all cursor-pointer min-w-[64px] ${
                    isSelected
                      ? "bg-[var(--brand-solid)] text-white border-[var(--brand-solid)] shadow-xs"
                      : "bg-[var(--tracker-surface-1)]/40 border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-2)]/60 text-[var(--tracker-ink)]"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-white/80" : "text-[var(--tracker-ink-muted)]"}`}>
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-[14px] font-bold mt-0.5">
                    {d.getDate()}
                  </span>
                  <span className={`text-[10px] font-mono mt-0.5 px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white font-bold"
                      : dayHours > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "text-[var(--tracker-ink-muted)]"
                  }`}>
                    {dayHours > 0 ? `${dayHours}h` : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const nextWeek = new Date(weekRefDate);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setWeekRefDate(nextWeek);
            }}
            className="p-1.5 rounded-[var(--tracker-radius-md)] hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (65%): Inline Logger & Timeline */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Inline Logger Card */}
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    {editingId ? "Edit Work Activity" : `Log Work for ${selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGitDrawer(!showGitDrawer)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-solid)] hover:underline cursor-pointer"
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  <span>{showGitDrawer ? "Hide Git Commits" : "Paste / Import Commits"}</span>
                </button>
              </div>

              {/* Git Commit Quick-Import Box (Collapsible) */}
              {showGitDrawer && (
                <div className="p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)] space-y-2">
                  <span className="text-[11px] font-bold text-[var(--tracker-ink-muted)] uppercase tracking-wider block">
                    Paste Recent Git Commits / Terminal Log
                  </span>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={gitInput}
                      onChange={(e) => setGitInput(e.target.value)}
                      placeholder="Paste git commit messages (one per line, e.g. 'feat: implement leave resolver')..."
                      className="flex-1 text-[12px] p-2 rounded border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)]"
                    />
                    <button
                      type="button"
                      onClick={handleParsePastedGit}
                      className="px-3 py-1 bg-[var(--brand-solid)] text-white text-[11px] font-bold rounded cursor-pointer self-end"
                    >
                      Parse
                    </button>
                  </div>

                  {gitCommitsList.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-[var(--tracker-ink-muted)] block">Click to import into activity description:</span>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {gitCommitsList.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleImportGitCommit(c.message)}
                            className="p-1.5 rounded bg-[var(--tracker-surface)] border border-[var(--tracker-border)] hover:border-[var(--brand-solid)] text-[11px] flex items-center justify-between cursor-pointer transition-all"
                          >
                            <span className="font-mono text-[var(--tracker-ink)] truncate mr-2">
                              {c.message}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--brand-solid)] flex-shrink-0">
                              + Import
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleSaveActivity} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] block mb-1">
                      Client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full text-[12px] p-2 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)]"
                    >
                      <option value="">General / Internal</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name || c.clientName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] block mb-1">
                      Project Type
                    </label>
                    <select
                      value={selectedProjectType}
                      onChange={(e) => setSelectedProjectType(e.target.value)}
                      className="w-full text-[12px] p-2 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)]"
                    >
                      <option value="">Core Development</option>
                      {projectTypes.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name || p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] block mb-1">
                      Task Type
                    </label>
                    <select
                      value={selectedTaskType}
                      onChange={(e) => setSelectedTaskType(e.target.value)}
                      className="w-full text-[12px] p-2 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)]"
                    >
                      <option value="">Feature / Task</option>
                      {taskTypes.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name || t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--tracker-ink-muted)] block mb-1">
                    Activity Description & Accomplishments *
                  </label>
                  <textarea
                    rows={3}
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    placeholder="Describe what you shipped, bugs resolved, client meetings, or deliverables..."
                    className="w-full text-[12px] p-2.5 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)] placeholder:text-[var(--tracker-ink-muted)]/50"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-[var(--tracker-ink-muted)]">
                      Hours Spent:
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      value={activityHours}
                      onChange={(e) => setActivityHours(e.target.value)}
                      className="w-20 text-[12px] p-1.5 text-center font-mono font-bold rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setActivityText("");
                          setActivityHours(1);
                        }}
                        className="px-3 py-1.5 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] text-[12px] font-medium hover:bg-[var(--tracker-surface-1)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 rounded-[var(--tracker-radius-md)] bg-[var(--brand-solid)] text-white text-[12px] font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : editingId ? "Update Activity" : "+ Add Activity"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Timeline of Logged Activities */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[13px] font-bold text-[var(--tracker-ink)] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--brand-solid)]" />
                  <span>Timeline ({activities.length} entries · {todayTotalHours}h total)</span>
                </h4>
              </div>

              {activities.length > 0 ? (
                <div className="space-y-2.5">
                  {activities.map((act) => {
                    const clientName = act.client?.name || act.clientName || "General";
                    const projectTypeName = act.projectType?.name || act.projectType?.title;
                    const taskTypeName = act.taskType?.name || act.taskType?.title;

                    return (
                      <div
                        key={act._id}
                        className="p-3.5 rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] shadow-xs space-y-2 hover:border-[var(--brand-solid)]/40 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              {clientName}
                            </span>
                            {projectTypeName && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {projectTypeName}
                              </span>
                            )}
                            {taskTypeName && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] border border-[var(--tracker-border)]">
                                {taskTypeName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              {act.hours || 1}h
                            </span>
                            <button
                              onClick={() => handleStartEdit(act)}
                              className="p-1 rounded hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] cursor-pointer"
                              title="Edit Activity"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act._id)}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                              title="Delete Activity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[13px] text-[var(--tracker-ink)] leading-relaxed whitespace-pre-wrap">
                          {act.activity || act.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-[var(--tracker-radius-lg)] border border-dashed border-[var(--tracker-border)] bg-[var(--tracker-surface)]/60 text-center space-y-2">
                  <Briefcase className="h-7 w-7 text-[var(--brand-solid)]/60 mx-auto" />
                  <p className="text-[13px] font-semibold text-[var(--tracker-ink)]">
                    No work activities logged for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[11px] text-[var(--tracker-ink-muted)] max-w-sm mx-auto">
                    Use the quick entry form above or paste your git commit logs to populate your daily timeline and generate standup reports.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (35%): AI Standup & Executive Report Hub */}
          <div className="lg:col-span-5 space-y-4">
            {/* AI Standup Summary Box */}
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--brand-solid)]/30 bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    AI Standup Summary
                  </h3>
                </div>
                {aiEngine && (
                  <span className="text-[10px] font-mono text-[var(--brand-solid)]">
                    via {aiEngine}
                  </span>
                )}
              </div>

              {aiSummary ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)]/60 border border-[var(--tracker-border)] text-[12px] text-[var(--tracker-ink)] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans">
                    {aiSummary}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySummary}
                      className="flex-1 py-1.5 rounded-[var(--tracker-radius-md)] bg-[var(--brand-solid)] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copied to Clipboard!" : "Copy for Slack / Email"}</span>
                    </button>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={generatingAi}
                      className="p-2 rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] hover:bg-[var(--tracker-surface-1)] text-[var(--tracker-ink-muted)] cursor-pointer"
                      title="Regenerate Summary"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${generatingAi ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-[12px] text-[var(--tracker-ink-muted)]">
                    One-click generate an executive standup summary from today's logged activities and git commits.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generatingAi}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--tracker-radius-md)] bg-[var(--brand-solid)] text-white text-[12px] font-bold hover:opacity-90 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className={`h-4 w-4 ${generatingAi ? "animate-spin" : ""}`} />
                    <span>{generatingAi ? "Generating Summary..." : "Generate AI Standup Report"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Effort by Client / Project Breakdown */}
            <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--tracker-border)]">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-[var(--brand-solid)]" />
                  <h3 className="text-[14px] font-bold text-[var(--tracker-ink)]">
                    Effort Distribution
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--tracker-ink-muted)]">
                  {todayTotalHours}h total
                </span>
              </div>

              {clientBreakdown.length > 0 ? (
                <div className="space-y-2.5">
                  {clientBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--tracker-ink)]">{item.name}</span>
                        <span className="font-mono text-[var(--tracker-ink-muted)]">{item.hours}h ({item.pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--tracker-surface-2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--brand-solid)] rounded-full transition-all duration-300"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--tracker-ink-muted)] text-center py-2">
                  No distribution data for this date.
                </p>
              )}
            </div>

            {/* Task Category Distribution */}
            {taskBreakdown.length > 0 && (
              <div className="rounded-[var(--tracker-radius-lg)] border border-[var(--tracker-border)] bg-[var(--tracker-surface)] p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--tracker-border)]">
                  <Layers className="h-3.5 w-3.5 text-[var(--brand-solid)]" />
                  <h4 className="text-[12px] font-bold text-[var(--tracker-ink)]">
                    Task Categories
                  </h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {taskBreakdown.map((tb, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[11px] font-semibold text-[var(--tracker-ink)] flex items-center gap-1.5"
                    >
                      <span>{tb.name}</span>
                      <strong className="text-[var(--brand-solid)]">{tb.hours}h</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTracker;