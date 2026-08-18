import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import DepartmentAllocation from './DepartmentAllocation';
import ReportDataGrid from './ReportDataGrid';
import { fetchDepartments } from './reportCatalog';
import { Download, Search, FileText } from 'lucide-react';

export default function ReportPageLayout({
  title,
  description,
  endpoint,
  reportCode,
  activeTab = 'payroll'
}) {
  const [departmentsList, setDepartmentsList] = useState([{ id: 'all', name: 'All Departments' }]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadDepts() {
      const depts = await fetchDepartments();
      setDepartmentsList(depts);
    }
    loadDepts();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `${endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}`;
      const res = await axiosInstance.get(url);

      if (res.data?.data) {
        setReportData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error(`Failed to fetch report data for ${title}:`, err);
      setError(err.response?.data?.message || 'Failed to load report dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [endpoint, selectedDate, selectedMonth, selectedYear, selectedDepartment]);

  const handleDownloadCSV = async () => {
    try {
      let url = `${endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}&format=csv`;
      const response = await axiosInstance.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${reportCode || 'report'}_${selectedDate || selectedMonth + '_' + selectedYear}.csv`);
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
      {/* Clean Focused Report Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dataset... (⌘K)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl font-semibold"
            />
          </div>

          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Scope Controls */}
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

      {/* Report Data Grid */}
      <ReportDataGrid
        loading={loading}
        error={error}
        data={filteredData}
        columns={columns}
      />
    </div>
  );
}
