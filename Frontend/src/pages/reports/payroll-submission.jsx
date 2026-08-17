import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { 
  Download, Search, RefreshCw, AlertCircle, FileSpreadsheet, 
  ChevronRight, X, ShieldCheck, Clock, Calculator, 
  Calendar, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Status Mini Pill for 1..31 Ledger Grid
 */
function DailyStatusBadge({ status, onClick }) {
  const s = (status || '').toLowerCase();
  
  let label = 'P';
  let badgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';

  if (s.includes('absent')) {
    label = 'A';
    badgeClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20';
  } else if (s.includes('half')) {
    label = 'HD';
    badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20';
  } else if (s.includes('leave')) {
    label = 'L';
    badgeClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20';
  } else if (s.includes('week off') || s.includes('holiday')) {
    label = s.includes('holiday') ? 'H' : 'WO';
    badgeClass = 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300/40 dark:border-slate-700/40';
  } else if (s.includes('wfh') || s.includes('home')) {
    label = 'WFH';
    badgeClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20';
  } else if (s.includes('late')) {
    label = 'LT';
    badgeClass = 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20';
  } else if (s.includes('unrecorded')) {
    label = '-';
    badgeClass = 'bg-transparent text-slate-400 border-transparent';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Day status: ${status} (Click to inspect punches)`}
      className={`w-6 h-6 rounded text-[10px] font-mono font-bold border flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${badgeClass}`}
    >
      {label}
    </button>
  );
}

/**
 * Slide-out Drill-Down Inspector Drawer
 * Enables accountants to click any row or suspicious metric to trace the exact math and punches.
 */
function DrillDownDrawer({ row, daysInMonth, onClose }) {
  const [activeTab, setActiveTab] = useState('math'); // 'math' | 'attendance' | 'policy' | 'audit'
  const [selectedDay, setSelectedDay] = useState(1);

  if (!row) return null;

  const currentDayKey = `day_${String(selectedDay).padStart(2, '0')}`;
  const dayDetail = row.dailyDetails?.[currentDayKey] || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div 
        className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {row.empCode}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {row.employeeName}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {row.department} · {row.designation} · {row.monthYear}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-100/60 dark:bg-slate-850/40">
          {[
            { id: 'math', label: 'Salary Calculation', icon: Calculator },
            { id: 'attendance', label: 'Daily Punches', icon: Clock },
            { id: 'policy', label: 'Policy Snapshot', icon: ShieldCheck },
            { id: 'audit', label: 'Audit Trail', icon: HelpCircle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'math' && (
            <div className="space-y-4">
              {/* Financial Summary Card */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Gross Earnings</span>
                  <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    ₹{row.grossSalary?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Deductions</span>
                  <p className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    ₹{row.totalDeductions?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Net Payable</span>
                  <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₹{row.netPayable?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Earnings Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                  <span>Earnings Breakdown</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {Object.entries(row.earnings || {}).map(([name, amount]) => (
                    <div key={name} className="px-3.5 py-2 flex justify-between">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  {row.overtimePay > 0 && (
                    <div className="px-3.5 py-2 flex justify-between bg-blue-50/40 dark:bg-blue-950/20">
                      <span className="font-sans text-blue-700 dark:text-blue-300 font-semibold">
                        Overtime Pay ({row.overtimeHours} hrs)
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-300">
                        ₹{Number(row.overtimePay || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                  <span>Deductions Breakdown</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {Object.entries(row.deductions || {}).map(([name, amount]) => (
                    <div key={name} className="px-3.5 py-2 flex justify-between">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{name}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -₹{Number(amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Factors Used */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Attendance Factor Derivation
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  <div>Working Days: <span className="font-bold text-slate-900 dark:text-slate-200">{row.workingDays}</span></div>
                  <div>Present Days: <span className="font-bold text-slate-900 dark:text-slate-200">{row.presentDays}</span></div>
                  <div>Leave Days: <span className="font-bold text-slate-900 dark:text-slate-200">{row.leaveDays}</span></div>
                  <div>LOP Days: <span className="font-bold text-rose-600 dark:text-rose-400">{row.lopDays}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Day Selector Chips */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Select Day to Inspect Punch Details (1..{daysInMonth}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                    const k = `day_${String(d).padStart(2, '0')}`;
                    const status = row.dailyDetails?.[k]?.status || 'Unrecorded';
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDay(d)}
                        className={`w-7 h-7 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          selectedDay === d
                            ? 'bg-blue-600 text-white scale-110 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day Punch Detail Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Day {selectedDay} Punch Record
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Status: <strong className="text-slate-800 dark:text-slate-200">{dayDetail.status || 'No record'}</strong>
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {dayDetail.workedMinutes ? `${(dayDetail.workedMinutes / 60).toFixed(2)} hrs` : '0 hrs'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500">First Check-In:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {dayDetail.checkIn ? new Date(dayDetail.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Last Check-Out:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {dayDetail.checkOut ? new Date(dayDetail.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Late Minutes:</span>
                    <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {dayDetail.lateMinutes || 0} mins
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Early Exit:</span>
                    <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {dayDetail.earlyExitMinutes || 0} mins
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Overtime Minutes:</span>
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {dayDetail.overtimeMinutes || 0} mins
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Attendance Fine:</span>
                    <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      ₹{dayDetail.fineAmount || 0}
                    </p>
                  </div>
                </div>

                {/* Raw Punches Array if multi-punch */}
                {Array.isArray(dayDetail.punches) && dayDetail.punches.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Raw Punch Log ({dayDetail.punches.length} entries):
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {dayDetail.punches.map((p, idx) => (
                        <div key={idx} className="flex justify-between py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span>In: {p.checkIn ? new Date(p.checkIn).toLocaleTimeString() : '-'}</span>
                          <span>Out: {p.checkOut ? new Date(p.checkOut).toLocaleTimeString() : '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Policy Version at Calculation Time
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <div>Policy Name: <strong className="font-sans">{row.auditTrail?.attendancePolicyName}</strong></div>
                  <div>Policy Version: <strong>v{row.auditTrail?.attendancePolicyVersion}</strong></div>
                  <div>Salary Structure: <strong>v{row.auditTrail?.salaryStructureVersion}</strong></div>
                  <div>Processed Date: <strong>{new Date(row.auditTrail?.processedAt).toLocaleDateString()}</strong></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
              <h3 className="font-bold font-sans text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Immutable Financial Audit Hashes
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Payroll Record ObjectId</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold select-all">{row.auditTrail?.payrollId || 'Direct-Calculated'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Payroll Run ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold select-all">{row.auditTrail?.payrollRunId || 'Independent Run'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Salary Structure ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold select-all">{row.auditTrail?.salaryStructureId || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Attendance Policy ID</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold select-all">{row.auditTrail?.attendancePolicyId || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Processed By / Authority</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">{row.auditTrail?.processedBy || 'System Engine'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center text-xs">
          <span className="text-slate-500">Authoritative Snapshot Audit</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-lg cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Monthly Payroll Submission Register Page
 */
export default function MonthlyPayrollSubmissionReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDrillDownRow, setSelectedDrillDownRow] = useState(null);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `/export/payroll-submission/json?month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}`;
      const res = await axiosInstance.get(url);

      if (res.data?.data) {
        setReportData(res.data.data);
      } else {
        setReportData(null);
      }
    } catch (err) {
      console.error('Failed to load monthly payroll submission register:', err);
      setError(err.response?.data?.message || 'Failed to compile payroll submission dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, selectedYear, selectedDepartment]);

  const handleDownloadXLSX = async () => {
    try {
      const url = `/export/payroll-submission?month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}`;
      const response = await axiosInstance.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Monthly_Payroll_Submission_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('XLSX Export Error:', err);
      alert('Failed to download XLSX report.');
    }
  };

  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!searchTerm.trim()) return reportData.rows;
    const term = searchTerm.toLowerCase();
    return reportData.rows.filter(r => 
      (r.employeeName || '').toLowerCase().includes(term) ||
      (r.empCode || '').toLowerCase().includes(term) ||
      (r.department || '').toLowerCase().includes(term)
    );
  }, [reportData, searchTerm]);

  const daysInMonth = reportData?.daysInMonth || 31;
  const dynamicEarnings = reportData?.dynamicEarnings || [];
  const dynamicDeductions = reportData?.dynamicDeductions || [];
  const hasFinancials = dynamicEarnings.length > 0;

  return (
    <div className="p-4 space-y-4 text-slate-800 dark:text-slate-100">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Monthly Payroll Submission Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            One row per employee: dynamic 1..31 daily status, worked hours, earnings, statutory deductions & audit traceability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month / Year Selectors */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs bg-transparent font-bold py-1 px-2 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1} className="dark:bg-slate-900">{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-xs bg-transparent font-bold py-1 px-2 text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden border-l border-slate-200 dark:border-slate-700"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter employee... (⌘K)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl font-semibold focus:outline-blue-500"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="Refresh Dataset"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export to XLSX Button */}
          <button
            onClick={handleDownloadXLSX}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel (XLSX)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for Accountant */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Employees</span>
            <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {reportData.totalEmployees}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Gross Salary</span>
            <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              ₹{reportData.summary.totalGross?.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Deductions</span>
            <p className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{reportData.summary.totalDeductions?.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Net Payroll Payout</span>
            <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{reportData.summary.totalNet?.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Main Ledger Table (Accountant-Grade Density) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></span>
            Compiling authoritative monthly payroll submission dataset...
          </div>
        ) : error ? (
          <div className="p-5 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            No payroll records found for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white font-mono text-[11px] tracking-wider uppercase sticky top-0 z-20">
                <tr>
                  {/* Sticky Frozen Columns */}
                  <th className="p-2 w-8 text-center sticky left-0 z-30 bg-slate-800">#</th>
                  <th className="p-2 w-20 sticky left-8 z-30 bg-slate-800 border-r border-slate-700">EMP ID</th>
                  <th className="p-2 min-w-[150px] sticky left-28 z-30 bg-slate-800 border-r border-slate-700">EMPLOYEE NAME</th>
                  <th className="p-2 min-w-[120px] border-r border-slate-700">DEPARTMENT</th>

                  {/* 1..31 Daily Status Columns */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                    <th key={d} className="p-1 w-7 text-center font-mono text-[10px] border-r border-slate-700/60">
                      {String(d).padStart(2, '0')}
                    </th>
                  ))}

                  {/* Attendance Totals */}
                  <th className="p-2 text-right border-l border-slate-700">WRK</th>
                  <th className="p-2 text-right">PRS</th>
                  <th className="p-2 text-right">LEV</th>
                  <th className="p-2 text-right text-rose-300">LOP</th>
                  <th className="p-2 text-right">WRK HRS</th>
                  <th className="p-2 text-right text-blue-300">OT HRS</th>

                  {/* Financial Columns */}
                  {hasFinancials && (
                    <>
                      {dynamicEarnings.map(name => (
                        <th key={name} className="p-2 text-right border-l border-slate-700 text-emerald-300">
                          {name.toUpperCase()}
                        </th>
                      ))}
                      <th className="p-2 text-right text-emerald-300">OT PAY</th>
                      <th className="p-2 text-right font-bold text-white bg-slate-900 border-l border-r border-slate-700">
                        GROSS (₹)
                      </th>

                      {dynamicDeductions.map(name => (
                        <th key={name} className="p-2 text-right text-rose-300">
                          {name.toUpperCase()}
                        </th>
                      ))}
                      <th className="p-2 text-right text-rose-300">TOTAL DED</th>
                      <th className="p-2 text-right font-bold text-emerald-300 bg-slate-900 border-l border-r border-slate-700">
                        NET PAYABLE (₹)
                      </th>
                    </>
                  )}

                  <th className="p-2 text-center">STATUS</th>
                  <th className="p-2 text-center sticky right-0 z-30 bg-slate-800 border-l border-slate-700">AUDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] font-medium">
                {filteredRows.map((row, idx) => (
                  <tr 
                    key={row.employeeId || idx} 
                    onClick={() => setSelectedDrillDownRow(row)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Sticky Identity Columns */}
                    <td className="p-2 text-center text-slate-400 font-mono sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/60">
                      {idx + 1}
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-700 dark:text-slate-300 sticky left-8 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800">
                      {row.empCode}
                    </td>
                    <td className="p-2 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap sticky left-28 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800">
                      {row.employeeName}
                    </td>
                    <td className="p-2 text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                      {row.department}
                    </td>

                    {/* 1..31 Daily Status Badges */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const dayKey = `day_${String(d).padStart(2, '0')}`;
                      const status = row[dayKey] || 'Unrecorded';
                      return (
                        <td key={d} className="p-1 text-center border-r border-slate-100 dark:border-slate-800/60">
                          <DailyStatusBadge 
                            status={status} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrillDownRow(row);
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Attendance Totals */}
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800">
                      {row.workingDays}
                    </td>
                    <td className="p-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {row.presentDays}
                    </td>
                    <td className="p-2 text-right font-mono text-purple-700 dark:text-purple-400">
                      {row.leaveDays}
                    </td>
                    <td className="p-2 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {row.lopDays}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.workedHours}
                    </td>
                    <td className="p-2 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                      {row.overtimeHours}
                    </td>

                    {/* Financial Numbers (Monospace Right-Aligned) */}
                    {hasFinancials && (
                      <>
                        {dynamicEarnings.map(name => (
                          <td key={name} className="p-2 text-right font-mono text-slate-800 dark:text-slate-200 border-l border-slate-100 dark:border-slate-800">
                            ₹{(row[`earning_${name}`] || 0).toLocaleString('en-IN')}
                          </td>
                        ))}
                        <td className="p-2 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                          ₹{(row.overtimePay || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-850/40 border-l border-r border-slate-200 dark:border-slate-800">
                          ₹{(row.grossSalary || 0).toLocaleString('en-IN')}
                        </td>

                        {dynamicDeductions.map(name => (
                          <td key={name} className="p-2 text-right font-mono text-rose-600 dark:text-rose-400">
                            ₹{(row[`deduction_${name}`] || 0).toLocaleString('en-IN')}
                          </td>
                        ))}
                        <td className="p-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{(row.totalDeductions || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 border-l border-r border-slate-200 dark:border-slate-800">
                          ₹{(row.netPayable || 0).toLocaleString('en-IN')}
                        </td>
                      </>
                    )}

                    {/* Payment Status Pill */}
                    <td className="p-2 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {row.paymentStatus || 'Processed'}
                      </span>
                    </td>

                    {/* Action: Open Drill-Down Drawer */}
                    <td className="p-2 text-center sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/60 border-l border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDrillDownRow(row);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Inspect
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Drill-Down Drawer */}
      {selectedDrillDownRow && (
        <DrillDownDrawer
          row={selectedDrillDownRow}
          daysInMonth={daysInMonth}
          onClose={() => setSelectedDrillDownRow(null)}
        />
      )}
    </div>
  );
}
