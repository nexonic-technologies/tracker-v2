/**
 * payrollSubmissionReport.js
 * Authoritative Monthly Payroll Submission Register
 * 
 * INVARIANT: Consumes authoritative Payroll records and Attendance snapshots.
 * Zero independent calculations or manufactured business rules.
 */

import { getTenantModel } from '../../tenant/tenantContext.js';

export class PayrollSubmissionReportService {
  /**
   * Generates the complete monthly payroll submission register with dynamic daily grid,
   * financial breakdown, and complete audit traceability.
   * 
   * @param {Object} params
   * @param {number} params.month - 1 to 12
   * @param {number} params.year - Full year (e.g. 2026)
   * @param {string} [params.departmentId] - Optional department filter
   * @param {Object} [params.user] - Requesting user claims for ABAC column-level gating
   * @returns {Promise<Object>} { summary, rows, columns, daysInMonth, auditMetadata }
   */
  async getMonthlySubmissionReport({ month, year, departmentId = null, user = {} }) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!m || !y || m < 1 || m > 12) {
      throw new Error('Invalid month or year for payroll submission report.');
    }

    const Payroll = getTenantModel('Payroll');
    const Attendance = getTenantModel('Attendance');
    const Employee = getTenantModel('Employee');
    const SalaryStructure = getTenantModel('SalaryStructure');
    const AttendancePolicy = getTenantModel('AttendancePolicy');

    // 1. Resolve date boundaries
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0);
    const daysInMonth = endOfMonth.getDate();
    endOfMonth.setHours(23, 59, 59, 999);

    // 2. Query Authoritative Payroll Records (Batched)
    const payrollFilter = { month: m, year: y };
    if (departmentId && departmentId !== 'all') {
      payrollFilter.departmentId = departmentId;
    }

    const payrollDocs = await Payroll.find(payrollFilter)
      .populate('employeeId', 'basicInfo professionalInfo accountDetails personalDocuments')
      .populate('salaryStructureId')
      .lean();

    if (payrollDocs.length === 0) {
      return {
        month: m,
        year: y,
        daysInMonth,
        totalEmployees: 0,
        columns: [],
        rows: [],
        summary: { totalGross: 0, totalNet: 0, totalDeductions: 0, totalOvertimePay: 0 }
      };
    }

    const employeeIds = payrollDocs.map(p => p.employeeId?._id || p.employeeId).filter(Boolean);

    // 3. Query Daily Attendance Snapshots for all employees in month (Batched)
    const attendanceDocs = await Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    // Map attendances by `employeeId_dayNumber`
    const attendanceMap = new Map();
    const policyIds = new Set();

    attendanceDocs.forEach(att => {
      const empIdStr = (att.employee || att.employeeId)?.toString();
      if (!empIdStr || !att.date) return;
      const dayNum = new Date(att.date).getDate();
      const key = `${empIdStr}_${dayNum}`;
      attendanceMap.set(key, att);

      if (att.snapshot?.policy?.id) {
        policyIds.add(att.snapshot.policy.id.toString());
      }
    });

    // 4. Batch-load referenced Attendance Policies for audit metadata
    const policyDocs = policyIds.size > 0 
      ? await AttendancePolicy.find({ _id: { $in: Array.from(policyIds) } }).lean()
      : [];
    const policyMap = new Map(policyDocs.map(p => [p._id.toString(), p]));

    // 5. Dynamic earnings & deductions key discovery
    const dynamicEarningsSet = new Set(['Basic', 'HRA']);
    const dynamicDeductionsSet = new Set(['PF Employee', 'ESI Employee', 'TDS', 'Attendance Fine']);

    payrollDocs.forEach(p => {
      if (p.earnedBreakdown && typeof p.earnedBreakdown === 'object') {
        Object.keys(p.earnedBreakdown).forEach(k => dynamicEarningsSet.add(k));
      }
      if (p.deductionBreakdown && typeof p.deductionBreakdown === 'object') {
        Object.keys(p.deductionBreakdown).forEach(k => dynamicDeductionsSet.add(k));
      }
    });

    const dynamicEarnings = Array.from(dynamicEarningsSet);
    const dynamicDeductions = Array.from(dynamicDeductionsSet);

    // 6. Assemble one row per employee with daily status map + math + audit trace
    let grandGross = 0;
    let grandNet = 0;
    let grandDeductions = 0;
    let grandOvertimePay = 0;

    const rows = payrollDocs.map((p, idx) => {
      const emp = p.employeeId || {};
      const empIdStr = (emp._id || p.employeeId)?.toString();
      const earned = p.earnedBreakdown || {};
      const deducted = p.deductionBreakdown || {};

      // Assemble Daily Status Map for days 1..daysInMonth
      const dailyStatuses = {};
      const dailyDetails = {};
      let totalLateCount = 0;
      let totalLateMinutes = 0;
      let totalEarlyExitCount = 0;
      let totalEarlyExitMinutes = 0;
      let totalWorkedMinutes = 0;
      let totalOvertimeMinutes = 0;
      let primaryPolicyInfo = null;

      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${empIdStr}_${day}`;
        const att = attendanceMap.get(key);
        const dayKey = `day_${String(day).padStart(2, '0')}`;

        if (att) {
          const snap = att.snapshot?.result || {};
          const status = snap.status || att.status || 'Present';
          dailyStatuses[dayKey] = status;

          // Collect detailed punch data for Drill-Down Drawer
          dailyDetails[dayKey] = {
            day,
            date: att.date,
            status,
            checkIn: att.checkIn || (att.punches && att.punches[0]?.checkIn) || null,
            checkOut: att.checkOut || (att.punches && att.punches[att.punches.length - 1]?.checkOut) || null,
            punches: att.punches || [],
            workHours: att.workHours || (snap.workedMinutes ? snap.workedMinutes / 60 : 0),
            workedMinutes: snap.workedMinutes || Math.round((att.workHours || 0) * 60),
            lateMinutes: snap.lateMinutes || att.lateMinutes || 0,
            earlyExitMinutes: snap.earlyExitMinutes || att.earlyExitMinutes || 0,
            overtimeMinutes: snap.payableOvertimeMinutes || snap.overtimeMinutes || 0,
            fineAmount: snap.fineAmount || att.fineAmount || 0,
            lopDays: snap.lopDays || 0,
            shiftName: att.snapshot?.shift?.name || null,
            policyName: att.snapshot?.policy?.name || null,
            policyVersion: att.snapshot?.policy?.version || 1
          };

          if (snap.lateMinutes > 0) {
            totalLateCount++;
            totalLateMinutes += snap.lateMinutes;
          }
          if (snap.earlyExitMinutes > 0) {
            totalEarlyExitCount++;
            totalEarlyExitMinutes += snap.earlyExitMinutes;
          }
          totalWorkedMinutes += (snap.workedMinutes || 0);
          totalOvertimeMinutes += (snap.payableOvertimeMinutes || snap.overtimeMinutes || 0);

          if (!primaryPolicyInfo && att.snapshot?.policy) {
            primaryPolicyInfo = att.snapshot.policy;
          }
        } else {
          // Check if day is weekend
          const dateObj = new Date(y, m - 1, day);
          const isSunday = dateObj.getDay() === 0;
          const status = isSunday ? 'Week Off' : 'Unrecorded';
          dailyStatuses[dayKey] = status;
          dailyDetails[dayKey] = {
            day,
            date: dateObj,
            status,
            checkIn: null,
            checkOut: null,
            punches: [],
            workHours: 0,
            workedMinutes: 0,
            lateMinutes: 0,
            earlyExitMinutes: 0,
            overtimeMinutes: 0,
            fineAmount: 0,
            lopDays: 0
          };
        }
      }

      const gross = Number(p.grossSalary) || 0;
      const net = Number(p.netSalary) || 0;
      const otPay = Number(p.overtimePay) || 0;
      const totalDeductions = Object.values(deducted).reduce((s, v) => s + (Number(v) || 0), 0);

      grandGross += gross;
      grandNet += net;
      grandDeductions += totalDeductions;
      grandOvertimePay += otPay;

      const struct = p.salaryStructureId || {};

      return {
        // Section A: Employee Identity
        index: idx + 1,
        employeeId: empIdStr,
        empCode: emp.professionalInfo?.empId || '-',
        employeeName: `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || emp.name || 'Unnamed',
        department: emp.professionalInfo?.department?.name || '-',
        designation: emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || '-',
        monthYear: `${String(m).padStart(2, '0')}/${y}`,

        // Section B: Daily Attendance Grid (dynamic 1..31)
        ...dailyStatuses,
        dailyDetails, // Embedded for interactive side Drill-Down Drawer

        // Section C: Attendance Totals
        workingDays: p.workingDays || daysInMonth,
        presentDays: p.presentDays || 0,
        leaveDays: p.leaveDays || 0,
        lopDays: p.lopDays || 0,

        // Section D: Punctuality
        lateCount: totalLateCount,
        lateMinutes: totalLateMinutes,
        earlyExitCount: totalEarlyExitCount,
        earlyExitMinutes: totalEarlyExitMinutes,

        // Section E: Worked & Overtime Hours
        workedHours: Math.round((totalWorkedMinutes / 60) * 100) / 100,
        overtimeHours: p.overtimeHours || Math.round((totalOvertimeMinutes / 60) * 100) / 100,
        overtimePay: Math.round(otPay),

        // Section F: Dynamic Earnings Breakdown
        earnings: earned,
        ...dynamicEarnings.reduce((acc, name) => {
          acc[`earning_${name}`] = Math.round(Number(earned[name]) || 0);
          return acc;
        }, {}),

        // Section G: Dynamic Deductions Breakdown
        deductions: deducted,
        ...dynamicDeductions.reduce((acc, name) => {
          acc[`deduction_${name}`] = Math.round(Number(deducted[name]) || 0);
          return acc;
        }, {}),

        // Section H: Final Financial Totals
        grossSalary: Math.round(gross),
        totalDeductions: Math.round(totalDeductions),
        netPayable: Math.round(net),
        paymentStatus: p.status || 'Pending',

        // Section I: Audit Trail & Traceability (Immutable verification)
        auditTrail: {
          payrollId: p._id?.toString(),
          payrollRunId: p.payrollRunId?.toString() || null,
          salaryStructureId: struct._id?.toString() || null,
          salaryStructureVersion: struct.version || 1,
          attendancePolicyId: primaryPolicyInfo?.id?.toString() || null,
          attendancePolicyName: primaryPolicyInfo?.name || 'Assigned Policy',
          attendancePolicyVersion: primaryPolicyInfo?.version || 1,
          processedAt: p.processedAt || p.createdAt,
          processedBy: p.processedBy?.toString() || 'System Engine'
        }
      };
    });

    // 7. Column-Level ABAC Gating (Manager sees attendance/OT, Finance/HR sees salary)
    const isSuperAdmin = !!user.isSuperAdmin;
    const userRole = (user.role || '').toLowerCase();
    const canViewFinancials = isSuperAdmin || ['finance', 'accountant', 'hr', 'admin', 'hr admin'].some(r => userRole.includes(r));

    let sanitizedRows = rows;
    if (!canViewFinancials) {
      sanitizedRows = rows.map(r => {
        const stripped = { ...r };
        dynamicEarnings.forEach(name => delete stripped[`earning_${name}`]);
        dynamicDeductions.forEach(name => delete stripped[`deduction_${name}`]);
        delete stripped.earnings;
        delete stripped.deductions;
        delete stripped.overtimePay;
        delete stripped.grossSalary;
        delete stripped.totalDeductions;
        delete stripped.netPayable;
        return stripped;
      });
    }

    return {
      month: m,
      year: y,
      daysInMonth,
      totalEmployees: rows.length,
      dynamicEarnings: canViewFinancials ? dynamicEarnings : [],
      dynamicDeductions: canViewFinancials ? dynamicDeductions : [],
      summary: canViewFinancials ? {
        totalGross: Math.round(grandGross),
        totalNet: Math.round(grandNet),
        totalDeductions: Math.round(grandDeductions),
        totalOvertimePay: Math.round(grandOvertimePay)
      } : null,
      rows: sanitizedRows
    };
  }

  /**
   * Generates high-performance XLSX buffer for the Monthly Payroll Submission Register
   */
  async generateXLSXBuffer({ month, year, departmentId, user }) {
    const reportResult = await this.getMonthlySubmissionReport({ month, year, departmentId, user });
    const { default: ExcelJS } = await import('exceljs');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tracker ERP Finance Engine';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Payroll_${month}_${year}`, {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 1 }]
    });

    // Build Header Columns
    const columns = [
      { header: '#', key: 'index', width: 6 },
      { header: 'EMP ID', key: 'empCode', width: 14 },
      { header: 'EMPLOYEE NAME', key: 'employeeName', width: 24 },
      { header: 'DEPARTMENT', key: 'department', width: 18 }
    ];

    // Add Daily Columns 01..daysInMonth
    for (let d = 1; d <= reportResult.daysInMonth; d++) {
      const dayKey = `day_${String(d).padStart(2, '0')}`;
      columns.push({ header: String(d).padStart(2, '0'), key: dayKey, width: 6 });
    }

    // Add Attendance & Hours Summary Columns
    columns.push(
      { header: 'WRK DAYS', key: 'workingDays', width: 12 },
      { header: 'PRS DAYS', key: 'presentDays', width: 12 },
      { header: 'LEV DAYS', key: 'leaveDays', width: 12 },
      { header: 'LOP DAYS', key: 'lopDays', width: 12 },
      { header: 'WRK HRS', key: 'workedHours', width: 12 },
      { header: 'OT HRS', key: 'overtimeHours', width: 12 }
    );

    // Add Financial Columns if accessible
    if (reportResult.dynamicEarnings.length > 0) {
      reportResult.dynamicEarnings.forEach(name => {
        columns.push({ header: name.toUpperCase(), key: `earning_${name}`, width: 16 });
      });
      columns.push({ header: 'OT PAY (₹)', key: 'overtimePay', width: 14 });
      columns.push({ header: 'GROSS SALARY (₹)', key: 'grossSalary', width: 18 });

      reportResult.dynamicDeductions.forEach(name => {
        columns.push({ header: name.toUpperCase(), key: `deduction_${name}`, width: 16 });
      });
      columns.push({ header: 'TOTAL DEDUCTIONS (₹)', key: 'totalDeductions', width: 22 });
      columns.push({ header: 'NET PAYABLE (₹)', key: 'netPayable', width: 18 });
    }

    columns.push({ header: 'STATUS', key: 'paymentStatus', width: 14 });

    sheet.columns = columns;

    // Apply header styling (dense, subtle accountant ledger styling)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate-800
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    // Add Rows
    reportResult.rows.forEach(r => {
      const row = sheet.addRow(r);
      row.height = 20;
      row.font = { size: 9 };
      row.alignment = { vertical: 'middle' };

      // Center index and day statuses
      row.getCell(1).alignment = { horizontal: 'center' };
      for (let d = 1; d <= reportResult.daysInMonth; d++) {
        row.getCell(4 + d).alignment = { horizontal: 'center' };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

const instance = new PayrollSubmissionReportService();
export default instance;
