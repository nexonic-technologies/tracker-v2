import express from 'express';
import reportService from '../services/reportService.js';
import { authMiddleware } from '../Controller/AuthController.js';

const router = express.Router();

// Helper to handle CSV download responses
function sendCSVResponse(res, filename, csvData) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvData);
}

// ── 1. HR & Employee Lifecycle Reports ──

router.get('/daily-attendance', authMiddleware, async (req, res) => {
  try {
    const { date, departmentId, format } = req.query;
    const data = await reportService.getDailyAttendanceReport(date, departmentId);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `daily_attendance_${date || 'today'}.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Daily Attendance Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/daily-onboarding-sla', authMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await reportService.getDailyOnboardingSLAReport();

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `onboarding_sla_report.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Onboarding SLA Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/lifecycle-audit', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, changeType, format } = req.query;
    const data = await reportService.getLifecycleAuditReport(startDate, endDate, changeType);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `lifecycle_audit_report.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Lifecycle Audit Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/headcount-analytics', authMiddleware, async (req, res) => {
  try {
    const data = await reportService.getHeadcountAnalytics();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[ReportRoutes] Headcount Analytics Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. Payroll & Statutory Compliance Reports ──

router.get('/monthly-payroll', authMiddleware, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), format } = req.query;
    const data = await reportService.getMonthlyPayrollRegister(month, year);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `payroll_register_${month}_${year}.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Monthly Payroll Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/bank-advice', authMiddleware, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), format } = req.query;
    const data = await reportService.getBankAdviceExport(month, year);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `bank_advice_${month}_${year}.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Bank Advice Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/pf-ecr', authMiddleware, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), format } = req.query;
    const data = await reportService.getPFECRReport(month, year);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `pf_ecr_${month}_${year}.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] PF ECR Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/esi-return', authMiddleware, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear(), format } = req.query;
    const data = await reportService.getESIMonthlyReturn(month, year);

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `esi_return_${month}_${year}.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] ESI Return Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. Tasks, Sprint & Velocity Reports ──

router.get('/sprint-velocity', authMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await reportService.getSprintVelocityReport();

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `sprint_velocity_report.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Sprint Velocity Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. Asset Stock Ledger Reports ──

router.get('/asset-stock-ledger', authMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await reportService.getAssetStockLedgerReport();

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `asset_stock_ledger.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] Asset Stock Ledger Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. CRM Commercial Pipeline Reports ──

router.get('/crm-pipeline', authMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await reportService.getCRMActivityPipelineReport();

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `crm_pipeline_report.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] CRM Pipeline Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. System Exception Audit Log ──

router.get('/system-exceptions', authMiddleware, async (req, res) => {
  try {
    const { format } = req.query;
    const data = await reportService.getSystemExceptionAuditReport();

    if (format === 'csv') {
      const csv = reportService.toCSV(data);
      return sendCSVResponse(res, `system_exceptions_audit.csv`, csv);
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[ReportRoutes] System Exceptions Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
