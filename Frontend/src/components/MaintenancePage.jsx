/**
 * MaintenancePage.jsx
 *
 * Full-page branded maintenance overlay.
 * Shown when the backend returns 503 { maintenance: true }.
 *
 * Features:
 *  - Countdown timer from scheduledEnd (if provided)
 *  - Animated shimmer gradient on the brand header
 *  - Retry button re-checks /api/config/maintenance
 *  - Supports light and dark mode via CSS tokens
 */
import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { Wrench, RefreshCw, Clock } from "lucide-react";

// ── Countdown helper ──────────────────────────────────────────────────────────
const useCountdown = (targetDate) => {
  const calc = useCallback(() => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, label: `${h > 0 ? `${h}h ` : ""}${m}m ${s}s` };
  }, [targetDate]);

  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate, calc]);

  return remaining;
};

// ── Dot pulse animation ───────────────────────────────────────────────────────
const PulseDot = ({ delay = 0 }) => (
  <span
    className="inline-block w-2 h-2 rounded-full"
    style={{
      background: "var(--brand-to)",
      animation: `pulse 1.4s ease-in-out ${delay}s infinite`,
    }}
  />
);

const MaintenancePage = ({ message, scheduledEnd, onRetry }) => {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const countdown = useCountdown(scheduledEnd);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(false);
    try {
      const res = await axiosInstance.get("/config/maintenance");
      if (!res.data?.active) {
        onRetry?.(); // parent clears maintenance state
      } else {
        setRetryError(true);
      }
    } catch {
      // Still in maintenance — silently re-check next time
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas"
      data-module="project"
    >
      {/* Animated gradient top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: "var(--tracker-gradient-brand)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        }}
      />

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* Card */}
      <div
        className="tracker-card-plain flex flex-col items-center text-center px-10 py-12 max-w-md w-full mx-4"
        style={{ boxShadow: "var(--tracker-shadow-overlay)" }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: "var(--tracker-gradient-brand)",
            boxShadow: "0 8px 24px rgb(108 61 232 / 0.3)",
          }}
        >
          <Wrench size={28} color="#fff" />
        </div>

        {/* Title */}
        <h1 className="text-[22px] font-extrabold text-ink tracking-tight mb-2">
          We'll be right back
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-ink-muted leading-relaxed max-w-xs mb-6">
          {message || "Workhub Tracker is undergoing scheduled maintenance. We're working hard to restore service."}
        </p>

        {/* Countdown */}
        {countdown ? (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-tracker-lg border mb-6 text-sm font-semibold"
            style={{
              background: "var(--module-project-light)",
              borderColor: "color-mix(in srgb, var(--module-project) 30%, transparent)",
              color: "var(--module-project)",
            }}
          >
            <Clock size={14} />
            Back in {countdown.label}
          </div>
        ) : scheduledEnd ? (
          <div className="mb-6 text-xs text-ink-muted">Expected soon…</div>
        ) : null}

        {/* Pulse dots while in maintenance */}
        <div className="flex items-center gap-2 mb-8">
          <PulseDot delay={0} />
          <PulseDot delay={0.2} />
          <PulseDot delay={0.4} />
        </div>

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="tracker-btn-brand flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
        >
          <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Checking…" : "Try Again"}
        </button>

        {retryError && (
          <p className="mt-3 text-[11px] text-ink-muted">
            Still under maintenance — please wait a moment and try again.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-[11px] text-ink-tertiary">
        Workhub ERP · Tracker
      </p>
    </div>
  );
};

export default MaintenancePage;
