import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import MISReportCockpit from '../../components/reports/MISReportCockpit';
import DepartmentAllocation from '../../components/reports/DepartmentAllocation';
import ReportCatalogSidebar from '../../components/reports/ReportCatalogSidebar';
import ReportDataGrid from '../../components/reports/ReportDataGrid';
import { fetchDepartments, DYNAMIC_REPORT_CATALOG } from '../../components/reports/reportCatalog';
import {
  Download, Calendar, Users, DollarSign, ShieldCheck,
  CheckCircle2, BarChart3, Briefcase, Search, Award
} from 'lucide-react';

export default function ReportsHub() {
  const [activeTab, setActiveTab] = useState('mis');
  const [departmentsList, setDepartmentsList] = useState([{ id: 'all', name: 'All Departments' }]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeReport, setActiveReport] = useState('daily-attendance');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'mis', label: '⭐ MIS Executive Cockpit', icon: Award },
    { id: 'daily', label: 'Daily Operations', icon: Calendar },
    { id: 'payroll', label: 'Payroll & Statutory', icon: DollarSign },
    { id: 'tasks', label: 'Tasks & Velocity', icon: CheckCircle2 },
    { id: 'assets', label: 'Assets & Stock', icon: Briefcase },
    { id: 'crm', label: 'CRM & Pipeline', icon: Users },
    { id: 'audit', label: 'HR Analytics & Audit', icon: ShieldCheck }
  ];

  // Fetch departments dynamically from API
  useEffect(() => {
    async function loadDepts() {
      const depts = await fetchDepartments();
      setDepartmentsList(depts);
    }
    loadDepts();
  }, []);

  const fetchReportData = async () => {
    if (activeTab === 'mis') return;
    try {
      setLoading(true);
      setError(null);

      const activeOption = DYNAMIC_REPORT_CATALOG.find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}`;
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
  }, [activeReport, selectedDate, selectedMonth, selectedYear, selectedDepartment, activeTab]);

  const handleDownloadCSV = async () => {
    try {
      const activeOption = DYNAMIC_REPORT_CATALOG.find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}&format=csv`;
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

  const filteredCatalog = DYNAMIC_REPORT_CATALOG.filter(r => {
    const matchesTab = activeTab === 'all' || r.category === activeTab;
    const matchesDept = selectedDepartment === 'all' || r.dept === selectedDepartment || r.dept === 'all';
    const matchesSearch = r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesDept && matchesSearch;
  });

  const filteredData = reportData.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      {/* 2026-Grade Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <BarChart3 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Enterprise ERP Report Center
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Department-scoped executive cockpits, statutory exports, operational logs, and data analytics.
          </p>
        </div>

        {/* Command-Grade Search & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports or dataset... (⌘K)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            />
          </div>

          {activeTab !== 'mis' && (
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Department Allocation & Scope Control Bar */}
      <DepartmentAllocation
        departments={departmentsList}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        activeTab={activeTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {/* Domain Navigation Menu Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {categories.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                const firstOption = DYNAMIC_REPORT_CATALOG.find(r => r.category === tab.id);
                if (firstOption) setActiveReport(firstOption.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content View */}
      {activeTab === 'mis' ? (
        <MISReportCockpit />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Dynamic Report Catalog Menu Sidebar */}
          <div className="lg:col-span-1">
            <ReportCatalogSidebar
              reports={filteredCatalog}
              activeReport={activeReport}
              onSelectReport={setActiveReport}
            />
          </div>

          {/* Report Data Grid */}
          <div className="lg:col-span-3">
            <ReportDataGrid
              loading={loading}
              error={error}
              data={filteredData}
              columns={columns}
            />
          </div>
        </div>
      )}
    </div>
  );
}
