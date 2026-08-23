import React, { useState, useEffect } from "react";
import { Search, Layers, GitFork, Tag, CheckCircle2, Clock, Filter } from "lucide-react";
import api from "../../api/axiosInstance";

export default function JarvisKnowledgeExplorer() {
  const [tokens, setTokens] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeTab, setActiveTab] = useState("tokens"); // 'tokens' | 'graph'
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchTokens = async () => {
    try {
      const res = await api.get("/jarvis/tokens");
      if (res.data?.success) {
        setTokens(res.data.tokens || []);
      }
    } catch (err) {
      console.warn("Failed to load tokens:", err);
    }
  };

  const fetchGraph = async () => {
    try {
      const res = await api.get("/jarvis/graph");
      if (res.data?.success) {
        setEdges(res.data.edges || []);
      }
    } catch (err) {
      console.warn("Failed to load graph edges:", err);
    }
  };

  const reloadData = async () => {
    setLoading(true);
    await Promise.all([fetchTokens(), fetchGraph()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const filteredTokens = tokens.filter((t) => {
    const matchesSearch =
      t.canonical?.toLowerCase().includes(search.toLowerCase()) ||
      t.id?.toString().includes(search) ||
      (t.aliases && t.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase())));
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredEdges = edges.filter((e) => {
    const s = search.toLowerCase();
    return (
      e.source?.toLowerCase().includes(s) ||
      e.relation?.toLowerCase().includes(s) ||
      e.target?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 rounded-xl bg-[var(--tracker-surface)] border border-[var(--tracker-border)] shadow-xs flex flex-col h-[calc(100vh-190px)] min-h-[480px]">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--tracker-border-soft)]">
        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg bg-[var(--tracker-surface-1)] p-0.5 border border-[var(--tracker-border-soft)] text-xs">
          <button
            onClick={() => setActiveTab("tokens")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${activeTab === "tokens"
                ? "bg-[var(--brand-solid)] text-white shadow-xs"
                : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tokens ({tokens.length})
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition-all ${activeTab === "graph"
                ? "bg-[var(--brand-solid)] text-white shadow-xs"
                : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
              }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Graph Edges ({edges.length})
          </button>
        </div>

        {/* Search Input & Type Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tracker-ink-subtle)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "tokens" ? "Search canonical tokens & aliases..." : "Search relations, sources, targets..."}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-lg text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] focus:outline-hidden focus:border-[var(--brand-solid)]"
            />
          </div>

          {activeTab === "tokens" && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-lg text-[var(--tracker-ink)] focus:outline-hidden focus:border-[var(--brand-solid)]"
            >
              <option value="all">All Types</option>
              <option value="entity">Entities</option>
              <option value="concept">Concepts</option>
              <option value="action">Actions</option>
              <option value="property">Properties</option>
            </select>
          )}
        </div>
      </div>

      {/* Content Stream */}
      <div className="flex-1 overflow-y-auto pt-3">
        {activeTab === "tokens" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredTokens.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] hover:border-[var(--brand-solid)]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[var(--tracker-ink)] truncate" title={t.canonical}>
                      {t.canonical}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-[var(--tracker-surface)] border border-[var(--tracker-border)] text-[var(--tracker-ink-muted)]">
                      #{t.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1">
                    <span className="px-1.5 py-0.5 rounded-sm bg-[#6c3de8]/10 text-[#6c3de8] font-medium uppercase text-[9px]">
                      {t.type}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-sm font-medium uppercase text-[9px] ${t.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600"
                        }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  {t.aliases && t.aliases.length > 0 && (
                    <p className="text-[11px] text-[var(--tracker-ink-muted)] truncate" title={t.aliases.join(", ")}>
                      Aliases: <span className="font-mono">{t.aliases.join(", ")}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
            {filteredTokens.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-[var(--tracker-ink-muted)]">
                No matching tokens found.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEdges.map((e, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] flex items-center justify-between text-xs font-mono gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[var(--tracker-ink)]">
                    {typeof e.source === 'string' ? e.source : (e.source?.canonical || `Token #${e.sourceId || idx}`)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#0ea5e9]/10 text-[#0ea5e9] text-[11px] font-semibold">
                    ──[{typeof e.relation === 'string' ? e.relation : (e.relation?.name || e.relation?.relation || 'related_to')}]──►
                  </span>
                  <span className="font-bold text-[#6c3de8]">
                    {typeof e.target === 'string' ? e.target : (e.target?.canonical || `Token #${e.targetId || idx}`)}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--tracker-ink-muted)]">
                  Weight: {typeof e.weight === 'number' ? e.weight.toFixed(2) : (typeof e.weight === 'object' ? (e.weight?.confidence || 1.0).toFixed(2) : '1.00')}
                </span>
              </div>
            ))}
            {filteredEdges.length === 0 && (
              <div className="py-12 text-center text-xs text-[var(--tracker-ink-muted)]">
                No matching relationship edges found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
