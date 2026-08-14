import React from 'react';
import ReportPageLayout from '../reports/report-page-layout';

export default function MonthlyPayrollReportPage() {
  return (
    <ReportPageLayout
      title="Monthly Payroll Register & Variance Audit"
      description="Gross-to-net salary breakdown, deductions, and variance."
      endpoint="/populate/report/payrolls"
      reportCode="H-15"
      activeTab="payroll"
    />
  );
}
