import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import MISReportCockpit from './MISReportCockpit';
import { 
  FileText, Download, Calendar, Users, DollarSign, ShieldCheck, 
  CheckCircle2, AlertCircle, BarChart3, Briefcase, Filter, Search, Award 
} from 'lucide-react';

export default function ReportsHub() {
  const [activeTab, setActiveTab] = useState('mis');
  const [activeReport, setActiveReport] = useState('daily-attendance');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const reportOptions = {
    mis: [
      { id: 'MIS-04', label: 'Monthly Business Review (MBR)', endpoint: '/populate/report/companies' }
    ],
    daily: [
      { id: 'daily-attendance', label: 'Daily Attendance & Punch Register', endpoint: '/reports/daily-attendance' },
      { id: 'daily-onboarding-sla', label: 'Daily Onboarding SLA Tracker', endpoint: '/reports/daily-onboarding-sla' },
      { id: 'system-exceptions', label: 'Daily Exception & Error Audit', endpoint: '/reports/system-exceptions' }
    ],
    payroll: [
      { id: 'monthly-payroll', label: 'Monthly Payroll Register & Variance Audit', endpoint: '/reports/monthly-payroll' },
      { id: 'bank-advice', label: 'Bank Advice / NEFT Payout Batch Export', endpoint: '/reports/bank-advice' },
      { id: 'pf-ecr', label: 'Statutory PF ECR Export (EPFO Layout)', endpoint: '/reports/pf-ecr' },
      { id: 'esi-return', label: 'Statutory ESI Monthly Return Statement', endpoint: '/reports/esi-return' }
    ],
    tasks: [
      { id: 'sprint-velocity', label: 'Sprint Velocity & Task Analytics', endpoint: '/reports/sprint-velocity' }
    ],
    assets: [
      { id: 'asset-stock-ledger', label: 'Asset Allocation & Stock Ledger', endpoint: '/reports/asset-stock-ledger' }
    ],
    crm: [
      { id: 'crm-pipeline', label: 'CRM Lead & Activity Pipeline Report', endpoint: '/reports/crm-pipeline' }
    ],
    audit: [
      { id: 'lifecycle-audit', label: 'Employee Career Timeline Audit', endpoint: '/reports/lifecycle-audit' },
      { id: 'headcount-analytics', label: 'Headcount & Attrition Analytics', endpoint: '/reports/headcount-analytics' }
    ]
  };

  const fetchReportData = async () => {
    if (activeTab === 'mis') return; // MIS is handled by MISReportCockpit component
    try {
      setLoading(true);
      setError(null);

      const activeOption = Object.values(reportOptions).flat().find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}`;
      const res = await axiosInstance.get(url);

      if (res.data?.data) {
        setReportData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError(err.response?.data?.message || 'Failed to load report dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReport, selectedDate, selectedMonth, selectedYear, activeTab]);

  const handleDownloadCSV = async () => {
    try {
      const activeOption = Object.values(reportOptions).flat().find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&format=csv`;
      const response = await axiosInstance.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${activeReport}_${selectedDate || selectedMonth + '_' + selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV Export Error:', err);
      alert('Failed to download CSV report.');
    }
  };

  const filteredData = reportData.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Enterprise ERP Reporting Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Realtime executive MIS cockpits, daily operational registers, monthly payroll, and analytics.
          </p>
        </div>

        {activeTab !== 'mis' && (
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Report to CSV
          </button>
        )}
      </div>

      {/* Main Module Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {[
          { id: 'mis', label: '⭐ MIS Executive Cockpit', icon: Award },
          { id: 'daily', label: 'Daily Operations', icon: Calendar },
          { id: 'payroll', label: 'Payroll & Statutory', icon: DollarSign },
          { id: 'tasks', label: 'Tasks & Velocity', icon: CheckCircle2 },
          { id: 'assets', label: 'Assets & Stock', icon: Briefcase },
          { id: 'crm', label: 'CRM & Pipeline', icon: Users },
          { id: 'audit', label: 'HR Analytics & Audit', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (reportOptions[tab.id]?.[0]) {
                  setActiveReport(reportOptions[tab.id][0].id);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600 dark:bg-slate-800 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render MIS Cockpit if activeTab === 'mis' */}
      {activeTab === 'mis' ? (
        <MISReportCockpit />
      ) : (
        <>
          {/* Sub Report Selector & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Select Specific Report
              </label>
              <select
                value={activeReport}
                onChange={e => setActiveReport(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium"
              >
                {(reportOptions[activeTab] || []).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

        {/* Date / Month Filters */}
        <div className="flex items-center gap-2">
          {activeTab === 'daily' ? (
            <div className="w-full">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Filter Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium"
              />
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <div className="w-1/2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Search */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Search Dataset
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2"
            />
          </div>
        </div>
      </div>

      {/* Dataset Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Generating report dataset...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No records found for the selected report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="p-3">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    {columns.map(col => (
                      <td key={col} className="p-3 font-medium text-slate-700 dark:text-slate-300">
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
}
