import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import PolicyGuard from "../../../components/Common/PolicyGuard";
import { useUserRole } from "../../../hooks/useUserRole";
import { entityFormPath } from "../../../utils/formRoutes";
import { clientsConfig } from "./config.jsx";

// ── Helpers ──────────────────────────────────────────────────
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const ACCENT_COLORS = [
  "#6366f1","#8b5cf6","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6",
];
const avatarColor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
};

const STATUS_CHIP = {
  Active:   "bg-green-100 text-green-700",
  Inactive: "bg-red-100   text-red-700",
};

// ── Avatar ────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => {
  const bg    = avatarColor(name);
  const chars = initials(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {chars || "?"}
    </span>
  );
};

// ── Search / Filter bar ───────────────────────────────────────
const SearchBar = ({ value, onChange, placeholder = "Search…" }) => (
  <div className="relative flex-1 max-w-xs">
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
      style={{ color: "var(--tracker-ink-muted,#9ca3af)" }}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="lmx-input pl-9 py-2 text-sm"
    />
  </div>
);

// ── Empty state ───────────────────────────────────────────────
const EmptyState = ({ query }) => (
  <tr>
    <td colSpan={6} className="py-20 text-center">
      <div className="text-4xl mb-3">{query ? "🔍" : "🏢"}</div>
      <p className="font-semibold text-sm" style={{ color: "var(--tracker-ink)" }}>
        {query ? `No results for "${query}"` : "No clients yet"}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--tracker-ink-muted)" }}>
        {query ? "Try a different search term." : "Add your first client to get started."}
      </p>
    </td>
  </tr>
);

// ── Main ─────────────────────────────────────────────────────
const Clients = () => {
  const navigate           = useNavigate();
  const { userRole, policies } = useUserRole();
  const roleLower          = (userRole || "").toLowerCase();
  const canUpdate          = roleLower === "super admin" || roleLower === "admin" || policies?.clients?.update;
  const canDelete          = roleLower === "super admin" || roleLower === "admin" || policies?.clients?.delete;

  const [clientsData, setClientsData] = useState([]);
  const [agentsData,  setAgentsData]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [creatingFor, setCreatingFor] = useState(null); // clientId being processed
  const basePath = clientsConfig.basePath;

  const fetchClients = async () => {
    try {
      const res = await axiosInstance.post("/populate/read/clients", { limit: 1000 });
      setClientsData(res.data?.data || []);
    } catch (err) { console.error("fetchClients:", err); }
    finally { setLoading(false); }
  };

  const fetchAgents = async () => {
    try {
      const res = await axiosInstance.get(
        `/populate/read/agents?populateFields=${encodeURIComponent(JSON.stringify({ client: "name" }))}`
      );
      setAgentsData(res.data?.data || []);
    } catch (err) { console.error("fetchAgents:", err); }
  };

  useEffect(() => { fetchClients(); fetchAgents(); }, []);

  const toggleStatus = async (client) => {
    const newStatus = client.Status === "Active" ? "Inactive" : "Active";
    try {
      await axiosInstance.put(`/populate/update/clients/${client._id}`, { Status: newStatus });
      fetchClients();
    } catch (err) { console.error("toggleStatus:", err); }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete "${client.name}"? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`/populate/delete/clients/${client._id}`);
      fetchClients();
    } catch (err) { console.error("handleDelete:", err); }
  };

  const createAgent = async (client) => {
    const firstContact = client.contactInfo?.[0];
    if (!firstContact?.email) { alert("No contact person with email found for this client."); return; }
    setCreatingFor(client._id);
    try {
      await axiosInstance.post("/populate/create/agents", {
        name:   firstContact.name,
        email:  firstContact.email,
        phone:  firstContact.phone,
        client: client._id,
      });
      fetchAgents();
    } catch (err) { console.error("createAgent:", err); }
    finally { setCreatingFor(null); }
  };

  // Build merged rows
  const rows = clientsData.map((c) => ({
    ...c,
    agents: agentsData.filter((a) => a.client?._id === c._id || a.client === c._id),
    phone:  c.contactInfo?.[0]?.phone || c.phone || "—",
    location: c.address?.city && c.address?.state ? `${c.address.city}, ${c.address.state}` : "—",
  }));

  // Filter
  const filtered = query.trim()
    ? rows.filter((r) =>
        [r.name, r.ownerName, r.email, r.phone, r.location].some(
          (v) => v && v.toLowerCase().includes(query.toLowerCase())
        )
      )
    : rows;

  const stats = [
    { label: "Total",   value: rows.length,                                      color: "text-gray-700" },
    { label: "Active",  value: rows.filter((r) => r.Status === "Active").length,  color: "text-green-600" },
    { label: "With Agent", value: rows.filter((r) => r.agents.length > 0).length, color: "text-blue-600" },
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--tracker-canvas-muted,#f5f6fa)" }}>

      {/* ── Header ── */}
      <div
        className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)", background: "var(--tracker-surface,#fff)" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--module-accent,#0EA5E9)" }}>
            Master Data
          </p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--tracker-ink)" }}>Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--tracker-ink-muted)" }}>Client and lead management</p>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>{s.label}</p>
            </div>
          ))}
          <PolicyGuard model="clients" action="create" requiredRoles={["hr admin","hr","super admin","admin"]}>
            <button
              type="button"
              onClick={() => navigate(entityFormPath(basePath))}
              className="tracker-btn-accent px-5 py-2.5 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          </PolicyGuard>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="p-6">
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--tracker-surface,#fff)", border: "1px solid var(--tracker-border,#e5e7eb)" }}
        >
          {/* toolbar */}
          <div
            className="flex items-center justify-between gap-3 px-5 py-3"
            style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}
          >
            <SearchBar value={query} onChange={setQuery} placeholder="Search clients…" />
            <p className="text-xs shrink-0" style={{ color: "var(--tracker-ink-muted)" }}>
              {filtered.length} of {rows.length}
            </p>
          </div>

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--tracker-surface-1,#f9fafb)", borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
                  {["Client","Phone","Location","Status","Agents",""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--tracker-ink-muted,#6b7280)", whiteSpace: "nowrap" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: j === 0 ? "80%" : "60%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <EmptyState query={query} />
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client._id}
                      className="group transition-colors"
                      style={{ borderBottom: "1px solid var(--tracker-border,#e5e7eb)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tracker-surface-1,#f9fafb)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Client */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} size={36} />
                          <div className="min-w-0">
                            <p className="font-semibold truncate max-w-[180px]" style={{ color: "var(--tracker-ink)" }}>
                              {client.name}
                            </p>
                            <p className="text-xs truncate max-w-[180px]" style={{ color: "var(--tracker-ink-muted)" }}>
                              {client.ownerName || client.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5">
                        <span style={{ color: "var(--tracker-ink-muted)" }}>{client.phone}</span>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5">
                        <span style={{ color: "var(--tracker-ink-muted)" }}>{client.location}</span>
                      </td>

                      {/* Status toggle */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(client)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-opacity hover:opacity-80 ${STATUS_CHIP[client.Status] || STATUS_CHIP.Inactive}`}
                        >
                          {client.Status || "Inactive"}
                        </button>
                      </td>

                      {/* Agents — compact avatar stack or Add button */}
                      <td className="px-5 py-3.5">
                        {client.agents.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* show first 3 as avatars */}
                            <div className="flex -space-x-2">
                              {client.agents.slice(0, 3).map((ag, i) => (
                                <span
                                  key={i}
                                  title={ag.name}
                                  className="inline-flex items-center justify-center rounded-full text-white text-[10px] font-bold ring-2 ring-white"
                                  style={{ width: 26, height: 26, background: avatarColor(ag.name), zIndex: 3 - i }}
                                >
                                  {initials(ag.name)}
                                </span>
                              ))}
                            </div>
                            {client.agents.length > 3 && (
                              <span className="text-xs" style={{ color: "var(--tracker-ink-muted)" }}>
                                +{client.agents.length - 3}
                              </span>
                            )}
                            {/* first agent name */}
                            <span className="text-xs truncate max-w-[100px]" style={{ color: "var(--tracker-ink-muted)" }}>
                              {client.agents[0]?.name}
                            </span>
                          </div>
                        ) : client.Status === "Active" ? (
                          <button
                            type="button"
                            disabled={creatingFor === client._id}
                            onClick={() => createAgent(client)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-60"
                          >
                            {creatingFor === client._id ? (
                              <span className="w-3 h-3 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                            Add Agent
                          </button>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => navigate(entityFormPath(basePath, client._id))}
                              title="Edit"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(client)}
                              title="Delete"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* footer */}
          {!loading && filtered.length > 0 && (
            <div
              className="px-5 py-3 text-xs"
              style={{ borderTop: "1px solid var(--tracker-border,#e5e7eb)", color: "var(--tracker-ink-muted)" }}
            >
              Showing {filtered.length} of {rows.length} clients
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
