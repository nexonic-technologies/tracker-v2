import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import DepartmentAllocation from '../../components/reports/DepartmentAllocation';
import ReportDataGrid from '../../components/reports/ReportDataGrid';
import { fetchDepartments } from '../../components/reports/reportCatalog';
import { 
  Briefcase, Download, Search, TrendingUp, DollarSign
} from 'lucide-react';

export default function CRMReports() {
  const [departmentsList, setDepartmentsList] = useState([{ id: 'all', name: 'All Departments' }]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeReport, setActiveReport] = useState('crm-pipeline');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const crmReports = [
    {
      id: 'crm-pipeline',
      code: 'C-01',
      label: 'CRM Lead & Activity Pipeline',
      audience: 'Sales VP / Commercial Lead',
      businessQuestion: 'What is our active lead conversion rate and pipeline deal value?',
      endpoint: '/populate/report/crm_meetings',
      description: 'Commercial funnel, deal conversions, and sales rep activities.'
    },
    {
      id: 'quotation-summary',
      code: 'C-02',
      label: 'Quotation Conversion Ledger',
      audience: 'Sales Operations',
      businessQuestion: 'Which commercial quotes were converted to orders this month?',
      endpoint: '/populate/report/companies',
      description: 'Quotation success rate, deal sizes, and negotiation status.'
    }
  ];

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

      const activeOption = crmReports.find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}`;
      const res = await axiosInstance.get(url);

      if (res.data?.data) {
        setReportData(Array.isArray(res.data.data) ? res.data.data : [res.data.data]);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Failed to fetch CRM report data:', err);
      setError(err.response?.data?.message || 'Failed to load CRM report dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReport, selectedDate, selectedMonth, selectedYear, selectedDepartment]);

  const handleDownloadCSV = async () => {
    try {
      const activeOption = crmReports.find(r => r.id === activeReport);
      if (!activeOption) return;

      let url = `${activeOption.endpoint}?date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}&departmentId=${selectedDepartment}&format=csv`;
      const response = await axiosInstance.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `crm_${activeReport}_${selectedDate || selectedMonth + '_' + selectedYear}.csv`);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              CRM Module Reports
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Sales Funnel, Commercial Pipeline, Quotations & Revenue Analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search CRM records... (⌘K)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl font-semibold"
            />
          </div>

          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <DepartmentAllocation
        departments={departmentsList}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        activeTab="payroll"
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {crmReports.map(rep => (
          <button
            key={rep.id}
            onClick={() => setActiveReport(rep.id)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeReport === rep.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
            }`}
          >
            <span className="text-[10px] font-mono font-bold uppercase opacity-80">{rep.code}</span>
            <h4 className="text-xs font-bold truncate">{rep.label}</h4>
            <p className={`text-[10px] mt-1 line-clamp-1 ${activeReport === rep.id ? 'text-blue-100' : 'text-slate-500'}`}>
              {rep.audience}
            </p>
          </button>
        ))}
      </div>

      <ReportDataGrid
        loading={loading}
        error={error}
        data={filteredData}
        columns={columns}
      />
    </div>
  );
}
