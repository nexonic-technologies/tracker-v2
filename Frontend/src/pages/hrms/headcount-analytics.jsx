import React from 'react';
import ReportPageLayout from '../../components/reports/ReportPageLayout';

export default function HeadcountAnalyticsReportPage() {
  return (
    <ReportPageLayout
      title="Headcount & Attrition Analytics"
      description="Staff headcount distribution, joiners, leavers, and retention."
      endpoint="/populate/report/employees"
      reportCode="H-01"
      activeTab="payroll"
    />
  );
}
