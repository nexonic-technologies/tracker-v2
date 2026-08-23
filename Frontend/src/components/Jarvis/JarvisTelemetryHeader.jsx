import React from "react";
import { Cpu, Brain, Zap, Layers, Activity, RefreshCw, MessageSquare, Sparkles, Database } from "lucide-react";

export default function JarvisTelemetryHeader({
  stats,
  loading,
  onRefresh,
  activeMode,
  setActiveMode,
  activeTab,
  setActiveTab,
}) {
  const tokenCount = stats?.tokens?.totalRegistered ?? 0;
  const edgeCount = stats?.graph?.totalEdges ?? 0;
  const trainingStep = stats?.neural?.trainingStep ?? 0;
  const paramCount = stats?.neural?.parameterCount ?? 29024;

  const tabs = [
    { id: "chat", label: "Cognitive Chat", icon: MessageSquare },
    { id: "training", label: "System Training Studio", icon: Sparkles },
    { id: "explorer", label: "Knowledge Brain Explorer", icon: Database },
  ];

  return (
    <header className="relative w-full border-b border-[var(--tracker-border)] bg-[var(--tracker-surface)]/90 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
      {/* Left: Title & Core Badge */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c3de8] to-[#0ea5e9] text-white shadow-sm shadow-[#6c3de8]/30 shrink-0">
          <Brain className="w-4 h-4 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-[var(--tracker-ink)]">
              J.A.R.V.I.S. Cognitive Studio
            </h1>
            <span className="px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">
              Neuro-Symbolic
            </span>
          </div>
        </div>
      </div>

      {/* Center: Integrated Studio Tabs (Zero Dead Vertical Space) */}
      {setActiveTab && (
        <div className="flex items-center gap-1 bg-[var(--tracker-surface-1)] p-1 rounded-xl border border-[var(--tracker-border-soft)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--brand-solid)] text-white shadow-xs"
                    : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Live Telemetry Metrics & Mode Switcher */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {/* Token Count Pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink)] text-[11px]">
          <Layers className="w-3 h-3 text-[#6c3de8]" />
          <span className="font-medium text-[var(--tracker-ink-muted)]">Tokens:</span>
          <span className="font-bold text-[var(--tracker-ink)] font-mono">{tokenCount}</span>
        </div>

        {/* Graph Triples Pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink)] text-[11px]">
          <Activity className="w-3 h-3 text-[#0ea5e9]" />
          <span className="font-medium text-[var(--tracker-ink-muted)]">Triples:</span>
          <span className="font-bold text-[var(--tracker-ink)] font-mono">{edgeCount}</span>
        </div>

        {/* Neural Parameters Pill */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink)] text-[11px] hidden xl:flex">
          <Cpu className="w-3 h-3 text-amber-500" />
          <span className="font-medium text-[var(--tracker-ink-muted)]">&theta;:</span>
          <span className="font-bold text-[var(--tracker-ink)] font-mono">{paramCount.toLocaleString()} (Step {trainingStep})</span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center rounded-lg bg-[var(--tracker-surface-1)] p-0.5 border border-[var(--tracker-border-soft)]">
          {["full", "symbolic", "neural"].map((m) => (
            <button
              key={m}
              onClick={() => setActiveMode(m)}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium capitalize transition-all cursor-pointer ${
                activeMode === m
                  ? "bg-[var(--brand-solid)] text-white shadow-xs"
                  : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Brain Telemetry"
          className="p-1 rounded-lg border border-[var(--tracker-border)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6c3de8]" : ""}`} />
        </button>
      </div>
    </header>
  );
}
