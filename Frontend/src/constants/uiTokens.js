/**
 * Workhub ERP UI tokens — maps to backend/DESIGN.md v2.0 module accents.
 */

export const MODULES = {
  hr: {
    id: "hr",
    eyebrow: "HR TRACKER",
    accent: "var(--module-hr)",
    accentClass: "text-[var(--module-hr)]",
    tabActiveClass: "lmx-tab-active",
    heroGradient: "lmx-gradient-hero",
    iconBg: "bg-[var(--module-hr-light)] text-[var(--module-hr)]",
  },
  project: {
    id: "project",
    eyebrow: "PROJECTS",
    accentClass: "text-[var(--module-project)]",
    heroGradient: "bg-gradient-to-br from-[#0369A1] to-[#0EA5E9]",
    iconBg: "bg-[var(--module-project-light)] text-[var(--module-project)]",
  },
  ticket: {
    id: "ticket",
    eyebrow: "SUPPORT TICKETS",
    accentClass: "text-[var(--module-ticket)]",
    heroGradient: "bg-gradient-to-br from-[#9F1239] to-[#E11D48]",
    iconBg: "bg-[var(--module-ticket-light)] text-[var(--module-ticket)]",
  },
  payroll: {
    id: "payroll",
    eyebrow: "PAYROLL",
    accentClass: "text-[var(--module-payroll)]",
    heroGradient: "bg-gradient-to-br from-[#064E3B] to-[#059669]",
    iconBg: "bg-[var(--module-payroll-light)] text-[var(--module-payroll)]",
  },
};

/** Profile page — HR module styling */
export const SECTION_GRADIENTS = {
  indigo: "from-[#7C3AED] to-[#6C3DE8]",
  emerald: "from-[#059669] to-[#10B981]",
  amber: "from-[#F59E0B] to-[#F97316]",
  rose: "from-[#E11D48] to-[#FB7185]",
  cyan: "from-[#0EA5E9] to-[#06B6D4]",
};

export const PROFILE_PAGE = {
  module: "hr",
  canvasLight: "bg-canvas",
  canvasDark: "dark:bg-canvas",
  surfaceDark: "dark:bg-surface",
  borderDark: "dark:border-hairline",
  heroGradient: "lmx-gradient-hero",
  progressBar: "tracker-gradient-progress",
  ringGradient: { start: "#0EA5E9", end: "#8B5CF6" },
  tabBar: "lmx-tab-bar",
  tabActive: "lmx-tab-active",
  tabInactive: "lmx-tab",
};

export const STAT_CARD = {
  root: "tracker-card-plain p-3 transition-colors rounded-xl shadow-xs",
  iconWrap: "p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center",
  icon: "h-3.5 w-3.5",
  title: "text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-0.5",
  value: "text-lg sm:text-xl font-bold text-ink tracking-tight leading-tight",
  subtitle: "text-[10px] text-ink-subtle mt-0.5",
};

export const APP_SHELL = {
  content: "lmx-content",
  pageHeader: "mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4",
  pageTitle: "text-2xl sm:text-[28px] font-semibold text-ink tracking-tight",
  pageSubtitle: "text-sm text-ink-muted mt-1",
};
