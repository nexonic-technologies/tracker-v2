import { useState, useEffect } from "react";
import axiosInstance from "@api/axiosInstance";
import { useNavigate } from "react-router-dom";
import StatCard from "@components/Common/StatCard";
import { Search, Building2, ArrowRight, LayoutGrid, Clock, CheckCircle2 } from "lucide-react";

const ClientTasksPage = () => {
  const navigate              = useNavigate();
  const [clients, setClients] = useState([]);
  const [tasks, setTasks]     = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cR, tR] = await Promise.all([
        axiosInstance.post("/populate/read/clients"),
        axiosInstance.post("/populate/read/tasks", { fields: "clientId,projectTypeId" }),
      ]);
      setClients(cR.data.data || []);
      setTasks(tR.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const tasksByClient = (clientId) => {
    const id = String(clientId);
    return tasks.filter((t) => {
      const cid = typeof t.clientId === "object" ? t.clientId?._id : t.clientId;
      return String(cid) === id;
    });
  };

  const filtered      = clients.filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()));
  const totalTasks    = tasks.length;
  const inProgressAll = tasks.filter((t) => t.status === "In Progress").length;
  const completedAll  = tasks.filter((t) => t.status === "Completed").length;
  const activeClients = clients.filter((c) => tasksByClient(c._id).length > 0).length;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--module-accent)] border-t-transparent animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6" data-module="project">

      {/* ── Header ── */}
      <div>
        <p className="lmx-page-eyebrow mb-1">PROJECTS</p>
        <h1 className="text-[28px] font-semibold text-ink flex items-center gap-2.5 tracking-tight">
          <Building2 size={22} className="text-[var(--module-project)]" />
          Client Tasks
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">{clients.length} clients · {totalTasks} total tasks</p>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Active Clients" value={activeClients} icon={Building2}    color="blue" />
        <StatCard title="Total Tasks"    value={totalTasks}    icon={LayoutGrid}   color="purple" />
        <StatCard title="In Progress"    value={inProgressAll} icon={Clock}        color="yellow" />
        <StatCard title="Completed"      value={completedAll}  icon={CheckCircle2} color="green" />
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients…" className="lmx-input pl-8" />
      </div>

      {/* ── Client grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => {
          const ct     = tasksByClient(client._id);
          const open   = ct.filter((t) => ["To Do", "Backlogs"].includes(t.status)).length;
          const inProg = ct.filter((t) => ["In Progress", "In Review"].includes(t.status)).length;
          const done   = ct.filter((t) => ["Completed", "Approved"].includes(t.status)).length;
          const pct    = ct.length ? Math.round((done / ct.length) * 100) : 0;

          return (
            <div key={client._id}
              onClick={() => navigate(`/tasks/clients-tasks/${client._id}`)}
              className="tracker-card p-5 cursor-pointer group hover:shadow-[var(--tracker-shadow-raised)] transition-all duration-200"
            >
              {/* Client name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-tracker-lg flex items-center justify-center text-[15px] font-bold text-white bg-gradient-to-br from-[#0369A1] to-[#0EA5E9]">
                    {(client.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{client.name || "Unnamed Client"}</p>
                    <p className="text-[12px] text-ink-subtle">{ct.length} task{ct.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <ArrowRight size={16}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-[var(--module-accent)]" />
              </div>

              {/* Progress bar */}
              {ct.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-ink-subtle">Progress</span>
                    <span className="text-[11px] font-semibold text-[var(--module-accent)]">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full tracker-gradient-progress transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {/* Mini stat row */}
              <div className="flex gap-2">
                {[
                  { label: "Open",   value: open,   cls: "bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]" },
                  { label: "Active", value: inProg, cls: "bg-[var(--module-project-light)] text-[var(--module-project)]" },
                  { label: "Done",   value: done,   cls: "bg-[var(--tracker-success-light)] text-[var(--tracker-success)]" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`flex flex-col items-center px-3 py-2 rounded-tracker-md flex-1 ${cls}`}>
                    <span className="text-[16px] font-bold leading-tight">{value}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.3px] mt-0.5 opacity-80">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16">
            <div className="lmx-icon-tile w-14 h-14 mx-auto mb-3">
              <Building2 size={24} />
            </div>
            <p className="text-[15px] font-medium text-ink">No clients found</p>
            <p className="text-[13px] mt-1 text-ink-muted">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientTasksPage;
