import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosInstance from '@api/axiosInstance';
import TableGenerator from '@components/Common/TableGenerator';
import FilterDropdown from '@components/Common/FilterDropdown';
import ProfileImage from '@components/Common/ProfileImage';
import {
  BarChart3, PieChart, Calendar, Filter, TrendingUp, Download, RefreshCw,
  LifeBuoy, CheckSquare, Layers, User, Search, SlidersHorizontal,
  FileSpreadsheet, Clock, Tag, Box
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Semantic Design System Token Mappings (WCAG 2.1 AA Compliant) ── */
const COLOR_TOKENS = {
  'Open': { bg: 'var(--tracker-info-light)', text: 'var(--tracker-info)', border: 'var(--tracker-info)', dot: 'var(--tracker-info)' },
  'In Progress': { bg: 'var(--tracker-warning-light)', text: 'var(--tracker-warning)', border: 'var(--tracker-warning)', dot: 'var(--tracker-warning)' },
  'Review': { bg: 'var(--module-hr-light)', text: 'var(--module-hr)', border: 'var(--module-hr)', dot: 'var(--module-hr)' },
  'Testing': { bg: 'var(--brand-teal-light)', text: 'var(--brand-teal)', border: 'var(--brand-teal)', dot: 'var(--brand-teal)' },
  'Completed': { bg: 'var(--tracker-success-light)', text: 'var(--tracker-success)', border: 'var(--tracker-success)', dot: 'var(--tracker-success)' },
  'Closed': { bg: 'var(--tracker-surface-2)', text: 'var(--tracker-ink-muted)', border: 'var(--tracker-border)', dot: 'var(--tracker-ink-subtle)' },
  'Pending': { bg: 'var(--tracker-warning-light)', text: 'var(--tracker-warning)', border: 'var(--tracker-warning)', dot: 'var(--tracker-warning)' },
  'High': { bg: 'var(--tracker-warning-light)', text: 'var(--tracker-warning)', border: 'var(--tracker-warning)', dot: 'var(--tracker-warning)' },
  'Critical': { bg: 'var(--tracker-danger-light)', text: 'var(--tracker-danger)', border: 'var(--tracker-danger)', dot: 'var(--tracker-danger)' },
  'Medium': { bg: 'var(--tracker-warning-light)', text: 'var(--tracker-warning)', border: 'var(--tracker-warning)', dot: 'var(--tracker-warning)' },
  'Low': { bg: 'var(--tracker-success-light)', text: 'var(--tracker-success)', border: 'var(--tracker-success)', dot: 'var(--tracker-success)' },
};

const PALETTE = [
  'var(--module-ticket)',
  'var(--brand-teal)',
  'var(--tracker-success)',
  'var(--tracker-warning)',
  'var(--tracker-info)',
  'var(--module-hr)',
  'var(--tracker-danger)',
  'var(--tracker-ink-muted)'
];

const REPORT_OPTIONS = [
  { value: 'status', label: 'By Status', icon: 'BarChart3', description: 'Grouped by ticket workflow status' },
  { value: 'priority', label: 'By Priority', icon: 'TrendingUp', description: 'Grouped by priority level' },
  { value: 'type', label: 'By Type', icon: 'Tag', description: 'Grouped by ticket classification' },
  { value: 'assignee', label: 'By Assignee', icon: 'User', description: 'Workload breakdown per member' },
  { value: 'product', label: 'By Product', icon: 'Box', description: 'Grouped by target product' },
  { value: 'monthly', label: 'Monthly Trend', icon: 'Calendar', description: 'Historical monthly distribution' }
];

/* SVG Donut Chart Widget */
const DonutChartWidget = ({ data = [], total = 0 }) => {
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tracker-surface-2, #f1f5f9)" strokeWidth={strokeWidth} />
        {data.map((item, i) => {
          const pct = total > 0 ? (item.count || 0) / total : 0;
          const dashLength = pct * circumference;
          const strokeColor = item.color || PALETTE[i % PALETTE.length];
          const el = (
            <circle
              key={item._id || i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-accumulatedOffset * circumference}
              strokeLinecap="butt"
              className="transition-all duration-700 ease-out"
            />
          );
          accumulatedOffset += pct;
          return el;
        })}
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-[24px] font-extrabold text-ink leading-none">{total}</span>
        <span className="text-[11px] font-semibold text-ink-subtle mt-0.5">Total Tickets</span>
      </div>
    </div>
  );
};

const TicketReports = () => {
  const [reportData, setReportData] = useState([]);
  const [statusMasterMap, setStatusMasterMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('status');
  const [tableSearch, setTableSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  /* Fetch Status Master configs */
  useEffect(() => {
    const fetchStatusMaster = async () => {
      try {
        const res = await axiosInstance.post('/populate/read/status_configs', { limit: 50 });
        const configs = res.data?.data || [];
        const map = {};
        configs.forEach(config => {
          (config.workflowStatuses || []).forEach(s => {
            if (s.label && s.color) map[s.label] = s.color;
            if (s.key && s.color) map[s.key] = s.color;
          });
          (config.metaStatuses || []).forEach(s => {
            if (s.label && s.color) map[s.label] = s.color;
            if (s.key && s.color) map[s.key] = s.color;
          });
        });
        setStatusMasterMap(map);
      } catch (err) {
        console.error('Failed to fetch status master:', err);
      }
    };
    fetchStatusMaster();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const reportConfig = getReportConfig(reportType);
      const response = await axiosInstance.post('/populate/report/tickets', {
        ...reportConfig,
        dateRange: {
          ...dateRange,
          dateField: 'createdAt'
        }
      });
      const raw = response.data;
      const dataList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setReportData(dataList);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Error fetching ticket report:', error);
      toast.error('Failed to fetch ticket report data');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getReportConfig = (type) => {
    const configs = {
      status: { type: 'summary', groupBy: 'status' },
      priority: { type: 'summary', groupBy: 'priority' },
      type: { type: 'summary', groupBy: 'type' },
      assignee: { type: 'summary', groupBy: 'assignedTo', populate: ['assignedTo'] },
      product: { type: 'summary', groupBy: 'product' },
      monthly: { type: 'summary', groupBy: 'createdAt', dateGrouping: 'month' }
    };
    return configs[type] || configs.status;
  };

  const safeReportData = useMemo(() => Array.isArray(reportData) ? reportData : [], [reportData]);
  const totalTickets = useMemo(() => safeReportData.reduce((sum, item) => sum + (item.count || 0), 0), [safeReportData]);

  /* Filtered data for table search */
  const displayReportData = useMemo(() => {
    if (!tableSearch) return safeReportData;
    const q = tableSearch.toLowerCase();
    return safeReportData.filter(item => {
      const name = String(item.name || item._id || '').toLowerCase();
      return name.includes(q);
    });
  }, [safeReportData, tableSearch]);

  /* CSV Export */
  const handleExportCSV = () => {
    if (!safeReportData.length) {
      toast.error('No report data to export');
      return;
    }
    let csv = `Group / Category,Count,Percentage Share\n`;
    safeReportData.forEach(item => {
      const name = item.name || item._id || 'Unassigned';
      const count = item.count || 0;
      const pct = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : 0;
      csv += `"${name}",${count},${pct}%\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ticket_report_${reportType}_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  /* Preset Range Handlers */
  const setPresetRange = (type) => {
    const today = new Date();
    let start = new Date();
    if (type === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'last_30') {
      start.setDate(today.getDate() - 30);
    } else if (type === 'quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
    } else if (type === 'year') {
      start = new Date(today.getFullYear(), 0, 1);
    }
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
  };

  /* Dynamic Token Resolution */
  const getToken = (displayName) => {
    if (statusMasterMap[displayName]) {
      const c = statusMasterMap[displayName];
      return {
        bg: `${c}18`,
        text: c,
        border: `${c}40`,
        dot: c,
      };
    }
    return COLOR_TOKENS[displayName] || null;
  };

  /* Custom table rendering */
  const customRender = {
    _id: (row) => {
      const displayName = row.name || row._id || 'Unassigned';
      const token = getToken(displayName);

      if (reportType === 'assignee' && row.basicInfo) {
        return (
          <div className="flex items-center gap-2.5">
            <ProfileImage
              profileImage={row.basicInfo?.profileImage}
              firstName={row.basicInfo?.firstName}
              lastName={row.basicInfo?.lastName}
              px={26}
            />
            <span className="font-semibold text-[13px] text-ink">{displayName}</span>
          </div>
        );
      }

      if (token) {
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold border"
            style={{ backgroundColor: token.bg, color: token.text, borderColor: token.border }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: token.dot }} />
            {displayName}
          </span>
        );
      }

      return <span className="font-semibold text-[13px] text-ink">{displayName}</span>;
    },
    count: (row) => {
      const count = row.count || 0;
      const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
      return (
        <div className="flex items-center gap-3 min-w-[180px]">
          <span className="font-bold text-[13px] text-ink w-8">{count}</span>
          <div className="flex-1 h-2 bg-surface-1 rounded-full overflow-hidden border border-hairline-soft">
            <div
              className="h-full rounded-full transition-all duration-500 bg-[var(--module-helpdesk, #3b82f6)]"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-ink-subtle w-10 text-right">{pct}%</span>
        </div>
      );
    }
  };

  const activeOption = REPORT_OPTIONS.find(o => o.value === reportType) || REPORT_OPTIONS[0];

  return (
    <div className="flex flex-col h-full bg-canvas p-4 sm:p-6 space-y-5 overflow-y-auto" data-module="helpdesk">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tracker-lg bg-[var(--module-helpdesk-light, #eff6ff)] border border-[var(--module-helpdesk-light, #eff6ff)] flex items-center justify-center text-[var(--module-helpdesk, #3b82f6)] shadow-sm">
            <LifeBuoy size={20} />
          </div>
          <div>
            <p className="lmx-page-eyebrow mb-0.5">HELPDESK</p>
            <h1 className="text-[22px] font-semibold text-ink tracking-tight flex items-center gap-2">
              Ticket Reports & Analytics
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] font-semibold border border-hairline bg-surface text-ink-muted hover:text-ink hover:border-ink-subtle transition-all cursor-pointer"
            title="Refresh report data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="tracker-btn-accent inline-flex items-center gap-1.5 text-[12px] px-3.5 py-1.5 cursor-pointer"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter & Controls Card ── */}
      <div className="tracker-card-plain p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-hairline-soft">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[var(--module-helpdesk, #3b82f6)]" />
            <span className="text-[13px] font-bold text-ink">Report Configuration</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-ink-subtle font-medium mr-1">Presets:</span>
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30', label: 'Last 30 Days' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'year', label: 'This Year' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPresetRange(p.id)}
                className="px-2 py-0.5 rounded-tracker-md bg-surface-1 text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Analysis Type Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Analysis Type</label>
            <FilterDropdown
              label="Select Analysis Type"
              value={reportType}
              onChange={(val) => val && setReportType(val)}
              options={REPORT_OPTIONS}
              accentColor="var(--module-helpdesk, #3b82f6)"
              className="w-full"
            />
          </div>

          {/* Date From */}
          <div className="w-[140px]">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="lmx-input py-1.5 text-[12px] w-full"
            />
          </div>

          {/* Date To */}
          <div className="w-[140px]">
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="lmx-input py-1.5 text-[12px] w-full"
            />
          </div>

          {/* Generate Action */}
          <div className="pt-5">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="tracker-btn-accent flex items-center gap-1.5 text-[12px] px-4 py-2 cursor-pointer"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <BarChart3 size={13} />}
              Generate
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center justify-between pt-2 border-t border-hairline-soft text-[11px] text-ink-subtle">
            <span>Analyzing <strong>{totalTickets}</strong> tickets across <strong>{safeReportData.length}</strong> categories</span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> Last updated: {lastUpdated}
            </span>
          </div>
        )}
      </div>

      {/* ── Visual Analytics Section ── */}
      {safeReportData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Distribution Bars */}
          <div className="lg:col-span-2 tracker-card-plain p-4 flex flex-col justify-start">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-hairline-soft">
                <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--module-helpdesk, #3b82f6)]" />
                  Category Breakdown ({activeOption.label})
                </h3>
                <span className="text-[11px] font-medium text-ink-subtle">{safeReportData.length} items</span>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto overflow-x-hidden pr-1">
                {safeReportData.slice(0, 7).map((item, index) => {
                  const name = item.name || item._id || 'Unassigned';
                  const count = item.count || 0;
                  const pct = totalTickets > 0 ? ((count / totalTickets) * 100).toFixed(1) : 0;
                  const color = statusMasterMap[name] || COLOR_TOKENS[name]?.dot || PALETTE[index % PALETTE.length];
                  return (
                    <div key={item._id || index} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-ink truncate max-w-[200px]">{name}</span>
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-ink">{count}</span>
                          <span className="text-[11px] text-ink-subtle w-10 text-right">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-surface-1 rounded-full overflow-hidden border border-hairline-soft">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Donut Summary Ring */}
          <div className="tracker-card-plain p-4 flex flex-col items-center justify-center text-center">
            <h3 className="text-[14px] font-semibold text-ink self-start mb-3 flex items-center gap-2">
              <PieChart size={16} className="text-[var(--module-helpdesk, #3b82f6)]" />
              Proportion Share
            </h3>
            <DonutChartWidget
              data={safeReportData.map((item, idx) => ({
                ...item,
                color: statusMasterMap[item.name || item._id] || COLOR_TOKENS[item.name || item._id]?.dot || PALETTE[idx % PALETTE.length]
              }))}
              total={totalTickets}
            />
            <div className="flex items-center justify-center flex-wrap gap-2 mt-4 text-[11px]">
              {safeReportData.slice(0, 4).map((item, index) => {
                const name = item.name || item._id;
                const dotColor = statusMasterMap[name] || COLOR_TOKENS[name]?.dot || PALETTE[index % PALETTE.length];
                return (
                  <div key={item._id || index} className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                    <span className="text-ink-muted truncate max-w-[80px]">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Report Data Table ── */}
      <div className="tracker-card-plain overflow-hidden flex-1">
        <div className="p-4 border-b border-hairline flex items-center justify-between flex-wrap gap-2 bg-surface-1/40">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[var(--module-helpdesk, #3b82f6)]" />
            <h2 className="text-[15px] font-semibold text-ink">
              Detailed Data Table — {activeOption.label}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--module-helpdesk-light, #eff6ff)] text-[var(--module-helpdesk, #3b82f6)]">
              {displayReportData.length} rows
            </span>
          </div>

          {/* Search Table Rows */}
          <div className="relative w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Search in table..."
              className="lmx-input pl-8 pr-7 py-1 text-[12px] w-full"
            />
            {tableSearch && (
              <button onClick={() => setTableSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={11} className="text-ink-subtle" />
              </button>
            )}
          </div>
        </div>

        <div className="p-2 overflow-x-auto">
          <TableGenerator
            data={displayReportData}
            customRender={customRender}
            hiddenColumns={[]}
            enableActions={false}
          />
        </div>
      </div>

    </div>
  );
};

export default TicketReports;