import React from 'react';
import { Building2, Calendar } from 'lucide-react';

export default function DepartmentAllocation({
  departments,
  selectedDepartment,
  onSelectDepartment,
  activeTab,
  selectedDate,
  onSelectDate,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      {/* Department Allocation Selector */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Department Scope:</span>
        <div className="flex flex-wrap gap-1.5">
          {departments.map(dept => (
            <button
              key={dept.id}
              onClick={() => onSelectDepartment(dept.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedDepartment === dept.id
                  ? 'bg-blue-600 text-white shadow-xs scale-102'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* Temporal Scoping */}
      {activeTab !== 'mis' && (
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          {activeTab === 'daily' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => onSelectDate(e.target.value)}
                className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Period:</span>
              <select
                value={selectedMonth}
                onChange={e => onSelectMonth(Number(e.target.value))}
                className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 font-semibold text-slate-800 dark:text-slate-100"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('en', { month: 'short' })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={e => onSelectYear(Number(e.target.value))}
                className="w-16 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 font-semibold text-slate-800 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
