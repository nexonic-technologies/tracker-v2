import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Briefcase, 
  Download, Calendar, RefreshCw, Award, ArrowUpRight, ArrowDownRight,
  Eye, X, CheckCircle2, Layers, FileText
} from 'lucide-react';

export default function MISReportCockpit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mbrData, setMbrData] = useState(null);
  const [activeDrilldown, setActiveDrilldown] = useState(null);

  const fetchMBR = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get(`/populate/report/company?month=${selectedMonth}&year=${selectedYear}`);

      if (res.data?.data) {
        setMbrData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load MIS-04 MBR report:', err);
      setError(err.response?.data?.message || 'Failed to load Monthly Business Review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMBR();
  }, [selectedMonth, selectedYear]);

  const handleExportCSV = () => {
    if (!mbrData?.metrics) return;
    const headers = ['Metric', 'Current Month', 'Previous Month', 'MoM Change %', 'Target', 'Execution Status'];
    const rows = mbrData.metrics.map(m => [
      `"${m.metric}"`,
      m.current,
      m.previous,
      `"${m.momChange}"`,
      m.target,
      `"${m.coverage || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Business_Review_${selectedMonth}_${selectedYear}.csv`;
    a.click();
  };

  // Helper to format currency values cleanly
  const formatVal = (val) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    }
    return val;
  };

  const openDrilldown = (metricObj) => {
    if (!metricObj?.drilldownKey || !mbrData?.drilldown?.[metricObj.drilldownKey]) {
      return;
    }
    setActiveDrilldown({
      title: metricObj.drilldownTitle || metricObj.metric,
      key: metricObj.drilldownKey,
      items: mbrData.drilldown[metricObj.drilldownKey] || [],
      metric: metricObj
    });
  };

  return (
    <div className="space-y-6">
      {/* Cockpit Sub-Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <Award className="w-4 h-4" />
            Executive Management Information System (MIS)
          </div>
          <h2 className="text-2xl font-bold mt-1 text-white">
            Monthly Business Review (MBR) — {mbrData?.period || `${selectedMonth}/${selectedYear}`}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Consolidated financial & operational review: Invoiced Revenue, Collections, Payroll, Operational Opex, and Net Operating Margin.
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
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Statement (CSV)
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="w-5 h-5 inline-block rounded-full border-2 border-blue-600 border-t-transparent animate-spin mr-2"></span>
          Generating Monthly Business Review metrics...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-sm">
          Failed to load MBR: {error}
        </div>
      ) : mbrData?.metrics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mbrData.metrics.slice(0, 4).map((metric, idx) => {
              const isPositive = metric.momChange?.startsWith('+');
              const hasDrilldown = Boolean(metric.drilldownKey && mbrData.drilldown?.[metric.drilldownKey]);

              return (
                <div 
                  key={idx} 
                  onClick={() => hasDrilldown && openDrilldown(metric)}
                  className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-all ${
                    hasDrilldown ? 'hover:border-blue-500/50 hover:shadow-md cursor-pointer group' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      {metric.metric}
                      {hasDrilldown && (
                        <Eye className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>
                    {metric.momChange === 'Baseline' ? (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Baseline
                      </span>
                    ) : metric.momChange === '—' ? (
                      <span className="text-slate-400 text-xs font-mono">—</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {metric.momChange}
                      </span>
                    )}
                  </div>

                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatVal(metric.current)}
                  </div>

                  {metric.coverage && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg">
                      Execution: {metric.coverage}
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Prior: {formatVal(metric.previous)}</span>
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
                  Executive Performance Comparison
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Month-over-Month variance analysis vs. annual operating targets. Click rows with transaction ledgers to view itemized records.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Key Metric</th>
                    <th className="p-4 text-right">Current Period</th>
                    <th className="p-4 text-right">Prior Period</th>
                    <th className="p-4 text-center">MoM Variance</th>
                    <th className="p-4 text-right">Operating Target</th>
                    <th className="p-4 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {mbrData.metrics.map((row, idx) => {
                    const isPositive = row.momChange?.startsWith('+');
                    const hasDrilldown = Boolean(row.drilldownKey && mbrData.drilldown?.[row.drilldownKey]);

                    return (
                      <tr 
                        key={idx} 
                        onClick={() => hasDrilldown && openDrilldown(row)}
                        className={`transition-colors ${hasDrilldown ? 'hover:bg-blue-50/50 dark:hover:bg-slate-800/60 cursor-pointer' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="p-4 text-slate-900 dark:text-white font-bold flex items-center gap-2">
                          {row.metric}
                          {row.coverage && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700">
                              {row.coverage}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatVal(row.current)}
                        </td>
                        <td className="p-4 text-right text-slate-500 dark:text-slate-400">
                          {formatVal(row.previous)}
                        </td>
                        <td className="p-4 text-center">
                          {row.momChange === 'Baseline' ? (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Baseline
                            </span>
                          ) : row.momChange === '—' ? (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {row.momChange}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          {formatVal(row.target)}
                        </td>
                        <td className="p-4 text-center">
                          {hasDrilldown ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); openDrilldown(row); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View ({mbrData.drilldown[row.drilldownKey]?.length})
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
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

      {/* Transaction Ledger Drilldown Drawer */}
      {activeDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeDrilldown.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Accounting Period: <strong>{mbrData?.period}</strong> · Subtotal: <strong className="text-slate-900 dark:text-white">{formatVal(activeDrilldown.metric.current)}</strong>
                </p>
              </div>

              <button 
                onClick={() => setActiveDrilldown(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header info bar */}
            <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/30 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Source Ledger: <strong>{activeDrilldown.title}</strong></span>
              <span>Total Entries: <strong>{activeDrilldown.items.length}</strong></span>
            </div>

            {/* Drawer Body - Transactions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {activeDrilldown.items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No transaction records found for this period.
                </div>
              ) : (
                activeDrilldown.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.name}
                        </span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                          {item.id}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>{item.type}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                        {item.designation && (
                          <>
                            <span>•</span>
                            <span>{item.designation}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {item.amount !== undefined && (
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {formatVal(item.amount)}
                        </div>
                      )}
                      {item.netPay !== undefined && (
                        <div className="text-[11px] text-slate-500">
                          Net: {formatVal(item.netPay)}
                        </div>
                      )}
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setActiveDrilldown(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
