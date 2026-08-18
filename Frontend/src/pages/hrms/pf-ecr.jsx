import React from 'react';
import ReportPageLayout from '../../components/reports/ReportPageLayout';

export default function PfEcrReportPage() {
  return (
    <ReportPageLayout
      title="Statutory PF ECR Export (EPFO Layout)"
      description="Provident fund monthly return text format for EPFO portal."
      endpoint="/populate/report/payrolls"
      reportCode="H-18"
      activeTab="payroll"
    />
  );
}
