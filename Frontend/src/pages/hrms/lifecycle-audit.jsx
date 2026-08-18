import React from 'react';
import ReportPageLayout from '../../components/reports/ReportPageLayout';

export default function LifecycleAuditReportPage() {
  return (
    <ReportPageLayout
      title="Employee Career Timeline Audit"
      description="Role promotions, salary revisions, and department transfers."
      endpoint="/populate/report/employeelifecyclehistories"
      reportCode="H-04"
      activeTab="payroll"
    />
  );
}
