import React, { useState, useEffect } from 'react';
import useGenericAPI from '../useGenericAPI';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase, 
  Download, Calendar, RefreshCw, Award, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

export default function MISReportCockpit() {
  const { report, loading, error } = useGenericAPI();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mbrData, setMbrData] = useState(null);

  const fetchMBR = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).toISOString();

      const response = await report('companies', {
        reportId: 'MIS-04',
        dateRange: { startDate, endDate }
      });

      if (response?.data) {
        setMbrData(response.data);
      }
    } catch (err) {
      console.error('Failed to load MIS-04 MBR report:', err);
    }
  };

  useEffect(() => {
    fetchMBR();
  }, [selectedMonth, selectedYear]);

  const handleExportCSV = () => {
    if (!mbrData?.metrics) return;
    const headers = ['Metric', 'Current Month', 'Previous Month', 'MoM Change %', 'Target'];
    const rows = mbrData.metrics.map(m => [
      `"${m.metric}"`,
      m.current,
      m.previous,
      `"${m.momChange}"`,
      m.target
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MIS_04_Monthly_Business_Review_${selectedMonth}_${selectedYear}.csv`;
    a.click();
  };

  // Helper to format currency values cleanly
  const formatVal = (val) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    }
    return val;
  };

  return (
    <div className="space-y-6">
      {/* Cockpit Sub-Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <Award className="w-4 h-4" />
            Executive Cockpit · P0 Strategic Intelligence
          </div>
          <h2 className="text-2xl font-bold mt-1 text-white">
            Monthly Business Review (MBR) — {mbrData?.period || `${selectedMonth}/${selectedYear}`}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Consolidated cross-module ERP financials: Invoiced Revenue, Collections, Payroll, Operational Opex, and Net Margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-xl p-1.5 border border-slate-700">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-white px-2 py-1 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1} className="bg-slate-900 text-white">
                  {new Date(0, i).toLocaleString('en', { month: 'short' })}
                </option>
              ))}
            </select>
            <span className="text-slate-500">/</span>
            <input
              type="number"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-16 bg-transparent text-sm font-semibold text-white px-2 py-1 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchMBR}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-700"
            title="Refresh MBR Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export MBR CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Compiling Monthly Business Review metrics across Payroll, Billing, Opex & Assets...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-sm">
          Failed to load MBR: {error}
        </div>
      ) : mbrData?.metrics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mbrData.metrics.slice(0, 4).map((metric, idx) => {
              const isPositive = metric.momChange.startsWith('+');
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {metric.metric}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {metric.momChange}
                    </span>
                  </div>

                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatVal(metric.current)}
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Prev: {formatVal(metric.previous)}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Target: {formatVal(metric.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Executive Metric Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Executive Performance Comparison Table
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Side-by-side MoM metric analysis vs. Monthly Targets
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Executive Metric</th>
                    <th className="p-4 text-right">Current Month</th>
                    <th className="p-4 text-right">Previous Month</th>
                    <th className="p-4 text-center">MoM Variance</th>
                    <th className="p-4 text-right">Monthly Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {mbrData.metrics.map((row, idx) => {
                    const isPositive = row.momChange.startsWith('+');
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-900 dark:text-white font-bold">
                          {row.metric}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatVal(row.current)}
                        </td>
                        <td className="p-4 text-right text-slate-500 dark:text-slate-400">
                          {formatVal(row.previous)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {row.momChange}
                          </span>
                        </td>
                        <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          {formatVal(row.target)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
