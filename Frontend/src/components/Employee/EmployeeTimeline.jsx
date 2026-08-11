import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { Calendar, Briefcase, Award, ArrowRight, UserCheck, ShieldAlert, FileText } from 'lucide-react';

export default function EmployeeTimeline({ employeeId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/populate/read/employee_life_cycle_histories?employeeId=${employeeId}&sort=-effectiveDate`);
        if (res.data?.data) {
          setTimeline(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load employee timeline:', err);
        setError('Failed to load career history timeline.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading career timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md dark:bg-rose-950/30 dark:border-rose-900">
        {error}
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No lifecycle history recorded for this employee yet.
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'InitialBaseline':
        return <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'Promotion':
        return <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'DepartmentChange':
      case 'Transfer':
        return <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'SalaryRevision':
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="relative border-l border-gray-200 dark:border-gray-800 ml-4 my-4 space-y-6">
      {timeline.map((item, index) => (
        <div key={item._id || index} className="relative pl-6 group">
          {/* Node Icon */}
          <div className="absolute -left-3 top-0.5 p-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm">
            {getEventIcon(item.changeType)}
          </div>

          {/* Event Card */}
          <div className="p-4 bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xs hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {item.changeType}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.effectiveDate || item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {item.reason || `${item.changeType} update`}
            </p>

            {/* Changes Payload Diff Display */}
            {item.newValue && (
              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/60 p-2.5 rounded border border-gray-100 dark:border-gray-800 font-mono">
                {typeof item.newValue === 'object' ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs">
                    {JSON.stringify(item.newValue, null, 2)}
                  </pre>
                ) : (
                  <span>New Value: {String(item.newValue)}</span>
                )}
              </div>
            )}

            {/* Changed By Footer */}
            {item.changedBy && (
              <div className="mt-2 text-3xs text-gray-400 dark:text-gray-500">
                Recorded by: {item.changedBy.basicInfo?.firstName || 'System'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
