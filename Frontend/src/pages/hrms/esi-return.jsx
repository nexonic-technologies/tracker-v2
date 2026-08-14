import React from 'react';
import ReportPageLayout from '../reports/report-page-layout';

export default function EsiReturnReportPage() {
  return (
    <ReportPageLayout
      title="Statutory ESI Monthly Return Statement"
      description="ESI monthly contribution and employee coverage register."
      endpoint="/populate/report/payrolls"
      reportCode="H-19"
      activeTab="payroll"
    />
  );
}
