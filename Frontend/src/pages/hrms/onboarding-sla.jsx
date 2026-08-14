import React from 'react';
import ReportPageLayout from '../reports/report-page-layout';

export default function OnboardingSlaReportPage() {
  return (
    <ReportPageLayout
      title="Daily Onboarding SLA Tracker"
      description="Verification milestones, candidate readiness, and SLA bottlenecks."
      endpoint="/populate/report/onboardings"
      reportCode="H-23"
      activeTab="daily"
    />
  );
}
