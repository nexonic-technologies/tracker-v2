import React, { useEffect, useRef, useState } from "react";
import { STAT_CARD } from "../../constants/uiTokens";

const COLOR_MAP = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconText: "text-blue-600 dark:text-blue-400",
    glow: "group-hover:shadow-blue-100 dark:group-hover:shadow-blue-950/30",
  },
  green: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
    glow: "group-hover:shadow-emerald-100 dark:group-hover:shadow-emerald-950/30",
  },
  yellow: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconText: "text-amber-600 dark:text-amber-400",
    glow: "group-hover:shadow-amber-100 dark:group-hover:shadow-amber-950/30",
  },
  purple: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconText: "text-violet-600 dark:text-violet-400",
    glow: "group-hover:shadow-violet-100 dark:group-hover:shadow-violet-950/30",
  },
  red: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconText: "text-rose-600 dark:text-rose-400",
    glow: "group-hover:shadow-rose-100 dark:group-hover:shadow-rose-950/30",
  },
};

function useAnimatedCounter(target, duration = 800) {
  const isNumber = typeof target === "number" && !isNaN(target);
  const [display, setDisplay] = useState(isNumber ? target : 0);
  const prevRef = useRef(isNumber ? target : 0);

  useEffect(() => {
    if (!isNumber) return;

    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, isNumber]);

  return isNumber ? display : target;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
  trendUp,
  loading = false,
  className = "",
}) {
  const palette = COLOR_MAP[color] || COLOR_MAP.blue;
  const animatedValue = useAnimatedCounter(loading ? 0 : value);
  const isNumeric = typeof value === "number" || (!isNaN(value) && value !== "");

  return (
    <div
      className={`${STAT_CARD.root} ${className}`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <div className={STAT_CARD.iconWrap}>
            <Icon className={STAT_CARD.icon} />
          </div>

          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-[12px] font-medium px-2 py-0.5 rounded-[4px] ${
                trendUp !== false && (trendUp || trend.startsWith("+"))
                  ? "bg-[#0bdf50]/10 text-[#0bdf50]"
                  : "bg-[#c41c1c]/10 text-[#c41c1c]"
              }`}
            >
              <svg
                className={`w-3 h-3 ${trendUp !== false && (trendUp || trend.startsWith("+")) ? "" : "rotate-180"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              {trend}
            </span>
          )}
        </div>

        <p className={STAT_CARD.title}>
          {title}
        </p>

        {loading ? (
          <div className="h-7 w-20 bg-surface-2 rounded-tracker-sm animate-pulse mt-1" />
        ) : (
          <p className={STAT_CARD.value}>
            {isNumeric ? animatedValue : value}
          </p>
        )}

        {subtitle && !trend && !loading && (
          <p className={STAT_CARD.subtitle}>{subtitle}</p>
        )}
        {trend && !loading && (
          <p className={STAT_CARD.subtitle}>
            from last month
          </p>
        )}
      </div>
    </div>
  );
}