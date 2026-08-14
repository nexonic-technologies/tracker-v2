import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Calendar, DollarSign, ShieldCheck, ChevronRight, Building2 } from 'lucide-react';

export default function HRMSReportsDirectory() {
  const navigate = useNavigate();

  const reportRoutes = [
    {
      code: 'H-05',
      title: 'Daily Attendance & Punch Register',
      route: '/hrms/daily-attendance',
      description: 'Real-time punch records, late marks, and shift compliance.'
    },
    {
      code: 'H-23',
      title: 'Daily Onboarding SLA Tracker',
      route: '/hrms/onboarding-sla',
      description: 'Verification milestones, candidate readiness, and SLA bottlenecks.'
    },
    {
      code: 'H-15',
      title: 'Monthly Payroll Register & Variance Audit',
      route: '/hrms/monthly-payroll',
      description: 'Gross-to-net salary breakdown, deductions, and variance.'
    },
    {
      code: 'H-17',
      title: 'Bank Advice / NEFT Payout Batch Export',
      route: '/hrms/bank-advice',
      description: 'Bank payment file batch generator for approved salary runs.'
    },
    {
      code: 'H-18',
      title: 'Statutory PF ECR Export (EPFO Layout)',
      route: '/hrms/pf-ecr',
      description: 'Provident fund monthly return text format for EPFO portal.'
    },
    {
      code: 'H-19',
      title: 'Statutory ESI Monthly Return Statement',
      route: '/hrms/esi-return',
      description: 'ESI monthly contribution and employee coverage register.'
    },
    {
      code: 'H-04',
      title: 'Employee Career Timeline Audit',
      route: '/hrms/lifecycle-audit',
      description: 'Role promotions, salary revisions, and department transfers.'
    },
    {
      code: 'H-01',
      title: 'Headcount & Attrition Analytics',
      route: '/hrms/headcount-analytics',
      description: 'Staff headcount distribution, joiners, leavers, and retention.'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              HRMS Module Reports Directory
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Access dedicated, URL-addressable HR, Attendance, Payroll and Statutory Report pages.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportRoutes.map(item => (
          <button
            key={item.route}
            onClick={() => navigate(item.route)}
            className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-left hover:border-blue-500/50 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20">
                {item.code}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.title}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
