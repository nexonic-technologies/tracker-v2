import React from 'react';
import { Link } from 'react-router-dom';

const formatLakhs = (val) => {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num === 0) return '₹0';
  return `₹${(num / 100000).toFixed(1)}L`;
};

// Mini Sparkline SVG Component
const MiniSparkline = ({ data = [5, 9, 7, 12, 8, 14, 11], color = '#10B981' }) => {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const width = 64;
  const height = 28;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkGrad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Mini Donut Gauge SVG Component
const MiniDonutGauge = ({ percent = 75, color = '#10B981', size = 42, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPct = Math.min(Math.max(percent, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-extrabold text-ink">{validPct}%</span>
    </div>
  );
};

export const STAT_CARD_CONFIG = {
  columns: 4,
  gridClass: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 w-full',
};

const COLOR_THEMES = {
  red: {
    pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    chartColor: '#F43F5E',
  },
  orange: {
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    chartColor: '#F59E0B',
  },
  yellow: {
    pill: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
    chartColor: '#EAB308',
  },
  green: {
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    chartColor: '#10B981',
  },
  default: {
    pill: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
    chartColor: '#64748B',
  },
};

function V2StatCard({ title, value, subtitle, color = 'default', chartType = 'none', percent, urgencyBorder = '', to }) {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.default;

  const content = (
    <div
      className={`group relative min-h-[92px] p-4 bg-surface hover:bg-surface-1/40 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 select-none flex items-center justify-between gap-3 overflow-hidden border border-hairline-soft ${urgencyBorder}`}
    >
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] font-bold text-ink-subtle uppercase tracking-wider leading-snug truncate mb-1">
          {title}
        </p>
        <p className="text-xl sm:text-2xl font-black text-ink leading-tight tracking-tight">
          {value}
        </p>

        {subtitle && (
          <div className="mt-2 flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${theme.pill} leading-none truncate max-w-full`}>
              {subtitle}
            </span>
          </div>
        )}
      </div>

      {/* Donut Gauge for percentage / real counts */}
      {chartType === 'donut' && (
        <MiniDonutGauge percent={percent ?? 0} color={theme.chartColor} />
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export default function V2StatsRow({ stats = {}, can }) {
  if (!can) return null;

  const cards = [];

  // 1. Pending Approvals
  if (can('v2_stat_pending_approvals')) {
    const pending = stats.pendingApprovals?.value ?? 0;
    const todayDelta = stats.pendingApprovals?.todayChange ?? (pending > 0 ? `+${pending} today` : '+0 today');
    cards.push(
      <V2StatCard
        key="pending_approvals"
        title="Pending Approvals"
        value={pending}
        subtitle={todayDelta}
        color={pending > 0 ? 'yellow' : 'green'}
        urgencyBorder={pending > 0 ? 'border-l-4 border-amber-500' : ''}
        chartType={pending > 0 ? 'donut' : 'none'}
        percent={pending > 0 ? Math.min(pending * 20, 100) : 0}
      />
    );
  }

  // 2. Overdue Tasks
  if (can('v2_stat_overdue_tasks')) {
    const overdue = stats.overdueTasks?.value ?? 0;
    const todayDelta = stats.overdueTasks?.todayChange ?? (overdue > 0 ? `+${overdue} today` : '+0 today');
    cards.push(
      <V2StatCard
        key="overdue_tasks"
        title="Overdue Tasks"
        value={overdue}
        subtitle={todayDelta}
        color={overdue > 0 ? 'red' : 'green'}
        urgencyBorder={overdue > 0 ? 'border-l-4 border-red-500' : ''}
        chartType={overdue > 0 ? 'donut' : 'none'}
        percent={overdue > 0 ? Math.min(overdue * 20, 100) : 0}
        to="/tasks"
      />
    );
  }

  // 3. Open Tickets
  if (can('v2_stat_open_tickets')) {
    const tickets = stats.openTickets?.value ?? 0;
    const todayDelta = stats.openTickets?.todayChange ?? (tickets > 0 ? `+${tickets} today` : '+0 today');
    cards.push(
      <V2StatCard
        key="open_tickets"
        title="Open Tickets"
        value={tickets}
        subtitle={todayDelta}
        color={tickets > 0 ? 'orange' : 'green'}
        urgencyBorder={tickets > 0 ? 'border-l-4 border-amber-500' : ''}
        chartType={tickets > 0 ? 'donut' : 'none'}
        percent={tickets > 0 ? Math.min(tickets * 20, 100) : 0}
        to="/tasks"
      />
    );
  }

  // 4. Attendance Issues
  if (can('v2_stat_attendance_issues')) {
    const issues = stats.attendanceIssues?.value ?? 0;
    const issuesBreakdown = stats.attendanceIssues?.breakdown || {};
    const late = issuesBreakdown['Late Entry'] || 0;
    const lop = issuesBreakdown['LOP'] || 0;
    cards.push(
      <V2StatCard
        key="attendance_issues"
        title="Attendance Issues"
        value={issues}
        subtitle={`Late: ${late}  LOP: ${lop}`}
        color={issues > 0 ? 'orange' : 'green'}
        urgencyBorder={issues > 0 ? 'border-l-4 border-red-500' : ''}
        chartType={issues > 0 ? 'donut' : 'none'}
        percent={issues > 0 ? Math.min(issues * 25, 100) : 0}
        to="/Attendance/reports"
      />
    );
  }

  // 5. Payroll Status
  if (can('v2_stat_payroll_status')) {
    const payroll = stats.payrollStatus?.value ?? 'Not Started';
    const payrollMonth = stats.payrollStatus?.month
      ? new Date(2026, stats.payrollStatus.month - 1).toLocaleDateString('en-US', { month: 'short' })
      : 'Current';
    let payrollColor = 'yellow';
    let payrollPct = 30;
    if (payroll === 'Processed' || payroll === 'Approved') { payrollColor = 'green'; payrollPct = 100; }
    if (payroll === 'Processing') { payrollColor = 'orange'; payrollPct = 65; }

    cards.push(
      <V2StatCard
        key="payroll_status"
        title="Payroll Status"
        value={payroll}
        subtitle={`${payrollMonth} Run`}
        color={payrollColor}
        chartType="donut"
        percent={payrollPct}
        to="/Payroll"
      />
    );
  }

  // 6. Payroll Cost
  if (can('v2_stat_payroll_cost')) {
    const cost = stats.payrollCost?.value ?? 0;
    cards.push(
      <V2StatCard
        key="payroll_cost"
        title="Payroll Cost"
        value={formatLakhs(cost)}
        subtitle="Current Month Est."
        color="green"
        chartType="none"
        to="/Payroll"
      />
    );
  }

  // 7. Workforce Health
  if (can('v2_stat_workforce_health')) {
    const health = stats.workforceHealth?.value ?? 0;
    const healthLabel = stats.workforceHealth?.label || (health >= 85 ? 'Healthy' : health >= 70 ? 'Caution' : 'Critical');
    const healthColor = stats.workforceHealth?.color || (health >= 85 ? 'green' : health >= 70 ? 'yellow' : 'red');
    cards.push(
      <V2StatCard
        key="workforce_health"
        title="Workforce Health"
        value={`${health}%`}
        subtitle={`${healthLabel} · Presence Rate`}
        color={healthColor === 'green' ? 'green' : healthColor === 'yellow' ? 'orange' : 'red'}
        chartType="donut"
        percent={health}
      />
    );
  }

  // 8. Financial Exposure
  if (can('v2_stat_financial_exposure')) {
    const exposure = stats.financialExposure?.value ?? 0;
    const lopImpact = stats.financialExposure?.lopImpact ?? 0;
    cards.push(
      <V2StatCard
        key="financial_exposure"
        title="Financial Exposure"
        value={formatLakhs(exposure)}
        subtitle={`${lopImpact} LOP impact`}
        color="green"
        chartType="none"
      />
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className={STAT_CARD_CONFIG.gridClass}>
      {cards}
    </div>
  );
}
