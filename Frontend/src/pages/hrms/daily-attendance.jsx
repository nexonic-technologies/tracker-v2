import React from 'react';
import ReportPageLayout from '../reports/report-page-layout';

export default function DailyAttendanceReportPage() {
  return (
    <ReportPageLayout
      title="Daily Attendance & Punch Register"
      description="Real-time punch records, late marks, and shift compliance."
      endpoint="/populate/report/attendances"
      reportCode="H-05"
      activeTab="daily"
    />
  );
}
