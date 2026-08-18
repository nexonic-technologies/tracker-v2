import React from 'react';
import ReportPageLayout from '../../components/reports/ReportPageLayout';

export default function BankAdviceReportPage() {
  return (
    <ReportPageLayout
      title="Bank Advice / NEFT Payout Batch Export"
      description="Bank payment file batch generator for approved salary runs."
      endpoint="/populate/report/payroll_runs"
      reportCode="H-17"
      activeTab="payroll"
    />
  );
}
