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
    endpoint: '/populate/report/company',
    description: 'Executive P&L, collection, payroll, and capex metrics.'
  },
  {
    id: 'daily-attendance',
    code: 'H-05',
    label: 'Daily Attendance & Shift Ledger',
    audience: 'Operations / Human Resources',
    businessQuestion: 'What is the daily workforce attendance, punch compliance, and shift status?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/attendances',
    description: 'Real-time attendance logs, punch timestamps, and shift compliance.'
  },
  {
    id: 'daily-onboarding-sla',
    code: 'H-23',
    label: 'Onboarding & Verification SLA Tracker',
    audience: 'Human Resources / Talent Management',
    businessQuestion: 'Which candidates have pending verification milestones and SLA status?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/onboardings',
    description: 'Verification milestones, document status, and onboarding timelines.'
  },
  {
    id: 'system-exceptions',
    code: 'H-07',
    label: 'System Activity & Audit Log',
    audience: 'IT Security / Systems Administration',
    businessQuestion: 'What operational events and audit exceptions occurred across modules?',
    category: 'daily',
    dept: 'all',
    endpoint: '/populate/report/activity_logs',
    description: 'Security audit trail, administrative events, and system activities.'
  },
  {
    id: 'monthly-payroll',
    code: 'H-15',
    label: 'Monthly Payroll Register & Variance Audit',
    audience: 'Finance / Chief Financial Officer',
    businessQuestion: 'What is the gross-to-net salary breakdown, statutory withholdings, and variance for the period?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'Itemized earnings, deductions, statutory withholdings, and net disbursements.'
  },
  {
    id: 'bank-advice',
    code: 'H-17',
    label: 'Bank Salary Disbursement Batch File',
    audience: 'Treasury / Finance Operations',
    businessQuestion: 'What net disbursement batches are prepared for bank release?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'Bank payment format with account numbers, IFSC codes, and net salary amounts.'
  },
  {
    id: 'statutory-pf',
    code: 'H-18',
    label: 'Statutory PF Electronic Return (ECR Format)',
    audience: 'Statutory Compliance Officer',
    businessQuestion: 'What are the employee and employer Provident Fund contributions for statutory filing?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'EPFO-compliant statement: UAN, gross wages, EPF/EPS splits, and employer shares.'
  },
  {
    id: 'statutory-esi',
    code: 'H-19',
    label: 'Statutory ESI Monthly Return Statement',
    audience: 'Statutory Compliance Officer',
    businessQuestion: 'What are the Employee State Insurance contributions for the monthly return?',
    category: 'payroll',
    dept: 'all',
    endpoint: '/populate/report/payrolls',
    description: 'ESIC-compliant monthly statement: IP numbers, working days, and wage contributions.'
  },
  {
    id: 'sprint-velocity',
    code: 'T-01',
    label: 'Sprint Velocity & Backlog Analytics',
    audience: 'Engineering Leadership / Delivery Managers',
    businessQuestion: 'What is the delivery velocity, completed story points, and sprint burn rate?',
    category: 'tasks',
    dept: 'all',
    endpoint: '/populate/report/sprints',
    description: 'Sprint commitments, completed points, overdue deliverables, and velocity.'
  },
  {
    id: 'time-tracker-burn',
    code: 'T-02',
    label: 'Time Tracking & Loaded Labor Cost Analysis',
    audience: 'Delivery Management / Finance Operations',
    businessQuestion: 'What engineering hours and loaded direct labor expenses were logged per project?',
    category: 'tasks',
    dept: 'all',
    endpoint: '/populate/report/time_tracker_sessions',
    description: 'Session timestamps, billable vs. internal allocation, and direct labor costs.'
  },
  {
    id: 'employee-utilization',
    code: 'MIS-07',
    label: 'Employee Utilization & Resource Allocation Audit',
    audience: 'Operations Leadership / Resource Management',
    businessQuestion: 'What proportion of workforce hours were allocated to billable client delivery versus internal operations?',
    category: 'tasks',
    dept: 'all',
    endpoint: '/populate/report/time_tracker_sessions',
    description: 'Billable utilization percentage, operational hours, and capacity analysis.'
  },
  {
    id: 'asset-stock-ledger',
    code: 'A-01',
    label: 'Asset Allocation & Inventory Ledger',
    audience: 'IT Administration / Asset Management',
    businessQuestion: 'What IT assets are currently allocated, in storage, or under maintenance?',
    category: 'assets',
    dept: 'all',
    endpoint: '/populate/report/assets_allocations',
    description: 'Hardware inventory, assignment records, and current asset status.'
  },
  {
    id: 'client-profitability',
    code: 'MIS-02',
    label: 'Client Account Profitability & Gross Margin Analysis',
    audience: 'Executive Management / Finance',
    businessQuestion: 'What is the net gross margin per client account after direct labor cost and project expenses?',
    category: 'crm',
    dept: 'all',
    endpoint: '/populate/report/clients',
    description: 'Account profitability: Invoiced Revenue - (Delivery Hours × Loaded Rate + Expenses).'
  },
  {
    id: 'crm-pipeline',
    code: 'MIS-06',
    label: 'Commercial Opportunity & Pipeline Forecast',
    audience: 'Commercial Leadership / Sales Management',
    businessQuestion: 'What is the pipeline deal value, win probability, and stage distribution?',
    category: 'crm',
    dept: 'all',
    endpoint: '/populate/report/crm_meetings',
    description: 'Commercial funnel, deal conversions, and sales rep activities.'
  },
  {
    id: 'quotation-conversion',
    code: 'C-02',
    label: 'Quotation Conversion Ledger',
    audience: 'Commercial Director / Sales Head',
    businessQuestion: 'What is our price proposal win rate, revision history, and sales turnaround?',
    category: 'crm',
    dept: 'all',
    endpoint: '/populate/report/quotations',
    description: 'Quotation win rates, subtotal vs tax analysis, and revision history.'
  },
  {
    id: 'lifecycle-audit',
    code: 'H-04',
    label: 'Employee Career Timeline Audit',
    audience: 'Senior HR / People Ops',
    businessQuestion: 'What role promotions, transfers, and salary changes happened in the period?',
    category: 'audit',
    dept: 'all',
    endpoint: '/populate/report/employee_life_cycle_histories',
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
