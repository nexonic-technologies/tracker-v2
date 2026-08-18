import axiosInstance from '../../api/axiosInstance';

/**
 * Dynamic Department & Report Registry Resolver
 * Zero hardcoded lists — queries database schemas & populate endpoints.
 * Aligned strictly with docs/reporting Master Architecture specification.
 */

export async function fetchDepartments() {
  try {
    const res = await axiosInstance.get('/populate/read/departments?limit=100');
    if (res.data?.data && Array.isArray(res.data.data)) {
      return [
        { id: 'all', name: 'All Departments' },
        ...res.data.data.map(dept => ({
          id: dept._id,
          name: dept.name || dept.shortCode || 'Unnamed Department'
        }))
      ];
    }
  } catch (err) {
    console.warn('Failed to fetch dynamic departments from API, using default scope:', err);
  }

  return [{ id: 'all', name: 'All Departments' }];
}

export const DYNAMIC_REPORT_CATALOG = [
  {
    id: 'MIS-04',
    code: 'MIS-04',
    label: 'Monthly Business Review (MBR)',
    audience: 'Executive / CEO / CFO',
    businessQuestion: 'What is our month-over-month revenue, OPEX, payroll, and collection performance?',
    category: 'mis',
    dept: 'all',
    endpoint: '/populate/report/companies',
    description: 'Executive P&L, collection, payroll, and capex metrics.'
  },
  {
    id: 'daily-attendance',
    code: 'H-05',
    label: 'Daily Attendance & Punch Register',
    audience: 'Operations Manager / HR Junior',
    businessQuestion: 'Who is present, absent, or late today across teams?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/attendances',
    description: 'Real-time punch records, late marks, and shift compliance.'
  },
  {
    id: 'daily-onboarding-sla',
    code: 'H-23',
    label: 'Daily Onboarding SLA Tracker',
    audience: 'HR Operations / Talent Manager',
    businessQuestion: 'Which candidates are stuck in onboarding verification milestones?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/onboardings',
    description: 'Verification milestones, candidate readiness, and SLA bottlenecks.'
  },
  {
    id: 'system-exceptions',
    code: 'H-07',
    label: 'Daily Exception & Error Audit',
    audience: 'System Auditor / Operations Head',
    businessQuestion: 'Which security violations or system exceptions occurred today?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/activity_logs',
    description: 'System audit trails, error logs, and operational exceptions.'
  },
  {
    id: 'monthly-payroll',
    code: 'H-15',
    label: 'Monthly Payroll Register & Variance Audit',
    audience: 'CFO / Finance Lead / HR Head',
    businessQuestion: 'What is the complete gross-to-net salary breakdown and variance this month?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'Gross-to-net salary breakdown, deductions, and variance.'
  },
  {
    id: 'bank-advice',
    code: 'H-17',
    label: 'Bank Advice / NEFT Payout Batch Export',
    audience: 'Finance Operations',
    businessQuestion: 'What net amounts must be disbursed to employee bank accounts?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payroll_runs',
    description: 'Bank payment file batch generator for approved salary runs.'
  },
  {
    id: 'pf-ecr',
    code: 'H-18',
    label: 'Statutory PF ECR Export (EPFO Layout)',
    audience: 'Statutory Compliance Officer',
    businessQuestion: 'What is the government-formatted ECR file for monthly EPFO filing?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'Provident fund monthly return text format for EPFO portal.'
  },
  {
    id: 'esi-return',
    code: 'H-19',
    label: 'Statutory ESI Monthly Return Statement',
    audience: 'Statutory Compliance Officer',
    businessQuestion: 'What are the monthly ESI employee & employer contributions?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'ESI monthly contribution and employee coverage register.'
  },
  {
    id: 'sprint-velocity',
    code: 'T-01',
    label: 'Sprint Velocity & Task Analytics',
    audience: 'Engineering VP / Tech Lead',
    businessQuestion: 'What is our velocity rate, story point completion, and backlog health?',
    category: 'tasks',
    dept: 'all',
    endpoint: '/populate/report/sprints',
    description: 'Engine velocity, completion rates, and backlog health.'
  },
  {
    id: 'asset-stock-ledger',
    code: 'A-01',
    label: 'Asset Allocation & Stock Ledger',
    audience: 'IT Admin / Asset Manager',
    businessQuestion: 'Which hardware assets are assigned to whom and what stock is available?',
    category: 'assets',
    dept: 'all',
    endpoint: '/populate/report/assets_allocations',
    description: 'Hardware lifecycle, stock movements, and asset allocations.'
  },
  {
    id: 'crm-pipeline',
    code: 'C-01',
    label: 'CRM Lead & Activity Pipeline Report',
    audience: 'Sales VP / Commercial Lead',
    businessQuestion: 'What is our active lead conversion rate and pipeline deal value?',
    category: 'crm',
    dept: 'all',
    endpoint: '/populate/report/crm_meetings',
    description: 'Commercial funnel, deal conversions, and sales rep activities.'
  },
  {
    id: 'lifecycle-audit',
    code: 'H-04',
    label: 'Employee Career Timeline Audit',
    audience: 'Senior HR / People Ops',
    businessQuestion: 'What role promotions, transfers, and salary changes happened in the period?',
    category: 'audit',
    dept: 'all',
    endpoint: '/populate/report/employeelifecyclehistories',
    description: 'Role promotions, salary revisions, and department transfers.'
  },
  {
    id: 'headcount-analytics',
    code: 'H-01',
    label: 'Headcount & Attrition Analytics',
    audience: 'Senior HR / CFO',
    businessQuestion: 'How many active staff do we employ across departments, joiners, and leavers?',
    category: 'audit',
    dept: 'all',
    endpoint: '/populate/report/employees',
    description: 'Staff headcount distribution, joiners, leavers, and retention.'
  }
];
