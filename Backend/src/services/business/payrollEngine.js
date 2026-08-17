/**
 * payrollEngine.js
 * Pure computation library — no Express, no direct HTTP.
 * Called by service hooks (payrolls.js, payroll_runs.js) and Bull workers.
 *
 * ARCHITECTURE: All model access uses getTenantModel() which reads from
 * AsyncLocalStorage — ensuring tenant isolation across all async call chains.
 * Zero static model imports allowed per Multi-Tenant SaaS Architecture Law.
 */

import mongoose from 'mongoose';
import { getTenantModel } from '../../tenant/tenantContext.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function lastDayOfMonth(month, year) {
  return new Date(year, month, 0); // month is 1-based; Date(year, month, 0) = last day
}

function getDayName(date) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

/**
 * Resolves active organization statutory settings from GeneralSettings.
 */
async function getOrgPayrollSettings() {
  try {
    const GeneralSettings = getTenantModel('GeneralSettings');
    if (GeneralSettings) {
      const settings = await GeneralSettings.findOne().lean();
      return settings?.payroll || {};
    }
  } catch (_) { }
  return {};
}

/**
 * Calculates hourly salary rate dynamically based on policy configuration, actual working days, and shift working hours.
 * Basis options: BASIC_ONLY | GROSS_SALARY | CTC | BASIC_PLUS_DA
 */
export function calculateHourlyRate({
  salaryStructure,
  basis = 'BASIC_ONLY',
  workingDays,
  workingHours
}) {
  if (!salaryStructure || !workingDays || workingDays <= 0 || !workingHours || workingHours <= 0) return 0;

  let monthlyAmount = 0;

  if (basis === 'BASIC_ONLY') {
    const basicEntry = salaryStructure.earnings?.find(e => e.name.toLowerCase() === 'basic');
    monthlyAmount = basicEntry ? basicEntry.amount : 0;
  } else if (basis === 'GROSS_SALARY') {
    monthlyAmount = salaryStructure.earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  } else if (basis === 'CTC') {
    monthlyAmount = (salaryStructure.ctc || 0) / 12;
  } else if (basis === 'BASIC_PLUS_DA') {
    const basic = salaryStructure.earnings?.find(e => e.name.toLowerCase() === 'basic')?.amount || 0;
    const da = salaryStructure.earnings?.find(e => e.name.toLowerCase() === 'da' || e.name.toLowerCase() === 'dearness allowance')?.amount || 0;
    monthlyAmount = basic + da;
  } else {
    const basicEntry = salaryStructure.earnings?.find(e => e.name.toLowerCase() === 'basic');
    monthlyAmount = basicEntry ? basicEntry.amount : 0;
  }

  const hourlyRate = monthlyAmount / (workingDays * workingHours);
  return Math.round(hourlyRate * 100) / 100;
}

// ─── resolveStructure ─────────────────────────────────────────────────────────

export async function resolveStructure(employeeId, payrollDate) {
  const SalaryStructure = getTenantModel('SalaryStructure');
  const structure = await SalaryStructure.findOne({
    employeeId,
    effectiveFrom: { $lte: payrollDate },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
  }).sort({ effectiveFrom: -1 }).lean();

  if (!structure) {
    throw new Error(`PAYROLL_CONFIGURATION_REQUIRED: No valid salary structure configured for employee ${employeeId} on ${payrollDate.toISOString().slice(0, 10)}`);
  }
  return structure;
}

// ─── computeWorkingDays ───────────────────────────────────────────────────────

export async function computeWorkingDays(month, year, weeklyOff = []) {
  const Holiday = getTenantModel('Holiday');

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const totalDays = end.getDate();

  // Collect all dates in month
  const allDates = [];
  for (let d = 1; d <= totalDays; d++) allDates.push(new Date(year, month - 1, d));

  // Remove weekoffs
  const effectiveWeeklyOff = Array.isArray(weeklyOff) && weeklyOff.length > 0 ? weeklyOff : ['Sunday'];
  const workDates = allDates.filter(d => !effectiveWeeklyOff.includes(getDayName(d)));

  // Remove mandatory holidays (national + company) — silently skip if none exist
  const holidays = await Holiday.find({
    year,
    date: { $gte: start, $lte: end },
    type: { $in: ['national', 'company'] }
  }).lean();

  const holidaySet = new Set(holidays.map(h => new Date(h.date).toDateString()));
  const workingDates = workDates.filter(d => !holidaySet.has(d.toDateString()));

  return { workingDays: workingDates.length, holidayDates: holidays.map(h => h.date) };
}

// ─── computeAttendanceSummary ────────────────────────────────────────────────

export async function computeAttendanceSummary(employeeId, month, year) {
  const Attendance = getTenantModel('Attendance');
  const Leave = getTenantModel('Leave');
  const ShiftAssignment = getTenantModel('ShiftAssignment');
  const Employee = getTenantModel('Employee');

  // Get employee's shift for weeklyOff config
  let shiftAssignment = await ShiftAssignment
    .findOne({ employeeId, isActive: true })
    .populate('shiftId')
    .lean();

  let shift = shiftAssignment?.shiftId;
  if (!shift) {
    // Try employee professionalInfo policy/shift assignment
    const emp = await Employee.findById(employeeId).populate('professionalInfo.policyAssignments.shift').lean();
    shift = emp?.professionalInfo?.policyAssignments?.[0]?.shift;
  }

  const weeklyOff = shift?.weeklyOff || ['Sunday'];
  const shiftWorkingHours = shift?.workingHours || 8;

  const { workingDays } = await computeWorkingDays(month, year, weeklyOff);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);

  const [attendances, leaves] = await Promise.all([
    Attendance.find({ employee: employeeId, date: { $gte: start, $lte: end } }).lean(),
    Leave.find({
      employeeId,
      status: 'Approved',
      startDate: { $lte: end },
      endDate: { $gte: start }
    }).lean()
  ]);

  let presentDays = 0;
  let overtimeHours = 0;
  let fineDeductions = 0;
  let snapshotLopDays = 0;

  for (const a of attendances) {
    const res = a.snapshot?.result;

    if (res) {
      // Consume frozen snapshot values directly
      if (res.status === 'Half Day') {
        presentDays += 0.5;
      } else if (['Present', 'Work From Home', 'Late Entry', 'Check-Out'].includes(res.status)) {
        presentDays += 1;
      }
      snapshotLopDays += (res.lopDays || 0);
      overtimeHours += (((res.payableOvertimeMinutes != null ? res.payableOvertimeMinutes : res.overtimeMinutes) || 0) / 60);
      fineDeductions += (res.fineAmount || 0);
    } else {
      // Fallback for legacy attendance records without snapshot
      if (['Present', 'Work From Home', 'Late Entry', 'Check-Out'].includes(a.status)) {
        presentDays += 1;
      } else if (a.status === 'Half Day') {
        presentDays += 0.5;
      }
      if (a.workHours && a.workHours > shiftWorkingHours) {
        overtimeHours += a.workHours - shiftWorkingHours;
      }
    }
  }

  // Clamp leave days to the month boundary
  let leaveDays = 0;
  for (const leave of leaves) {
    const leaveStart = new Date(Math.max(new Date(leave.startDate), start));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), end));
    const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
    leaveDays += Math.max(0, days);
  }

  const lopDays = snapshotLopDays > 0
    ? snapshotLopDays
    : Math.max(0, workingDays - presentDays - leaveDays);

  return {
    workingDays,
    presentDays,
    leaveDays,
    lopDays,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    fineDeductions: Math.round(fineDeductions * 100) / 100
  };
}

// ─── resolveBasicAmount ───────────────────────────────────────────────────────

function resolveBasicAmount(structure) {
  const basicEntry = structure.earnings.find(e => e.name.toLowerCase() === 'basic');
  if (!basicEntry) return 0;
  if (basicEntry.type === 'fixed') return basicEntry.amount;
  if (basicEntry.type === 'percentage_of_basic') return (structure.ctc / 12) * (basicEntry.amount / 100);
  return basicEntry.amount;
}

// ─── resolveStatutory ─────────────────────────────────────────────────────────

function resolveStatutory(name, grossSalary, basicEarned, structure, orgSettings = {}) {
  const n = name.toLowerCase();
  if (n === 'pf employee' || n === 'pf') {
    const ceiling = structure.pfCeiling !== undefined ? structure.pfCeiling : (orgSettings.pfCeiling !== undefined ? orgSettings.pfCeiling : 15000);
    const percent = structure.pfEmployeePercent !== undefined ? structure.pfEmployeePercent : (orgSettings.pfPercent !== undefined ? orgSettings.pfPercent : 12);
    const pfBase = ceiling ? Math.min(basicEarned, ceiling) : basicEarned;
    return pfBase * (percent / 100);
  }
  if (n === 'esi employee' || n === 'esi') {
    const threshold = orgSettings.esiThreshold !== undefined ? orgSettings.esiThreshold : 21000;
    const percent = orgSettings.esiPercent !== undefined ? orgSettings.esiPercent : 0.75;
    if (structure.esiApplicable && grossSalary <= threshold) {
      return grossSalary * (percent / 100);
    }
    return 0;
  }
  if (n === 'tds') {
    const tdsEntry = structure.deductions.find(d => d.name.toLowerCase() === 'tds');
    return tdsEntry?.amount || 0;
  }
  return 0;
}

/**
 * Compute employer-side statutory contributions.
 * These are NOT deducted from the employee — they are the company's cost.
 */
function computeEmployerContributions(grossSalary, basicEarned, structure, orgSettings = {}) {
  const ceiling = structure.pfCeiling !== undefined ? structure.pfCeiling : (orgSettings.pfCeiling !== undefined ? orgSettings.pfCeiling : 15000);
  const pfPercent = structure.pfEmployeePercent !== undefined ? structure.pfEmployeePercent : (orgSettings.pfPercent !== undefined ? orgSettings.pfPercent : 12);
  const pfBase = ceiling ? Math.min(basicEarned, ceiling) : basicEarned;
  const pfEmployerContribution = Math.round(pfBase * (pfPercent / 100) * 100) / 100;

  const esiThreshold = orgSettings.esiThreshold !== undefined ? orgSettings.esiThreshold : 21000;
  const esiEmployerPercent = structure.esiEmployerPercent !== undefined 
    ? structure.esiEmployerPercent 
    : (orgSettings.esiEmployerPercent !== undefined ? orgSettings.esiEmployerPercent : 3.25);

  const esiEmployerContribution = (structure.esiApplicable && grossSalary <= esiThreshold)
    ? Math.round(grossSalary * (esiEmployerPercent / 100) * 100) / 100
    : 0;

  return { pfEmployerContribution, esiEmployerContribution };
}

// ─── computeSalary ────────────────────────────────────────────────────────────

export function computeSalary(attendanceSummary, structure, clEncashmentAmount = 0, shiftWorkingHours = 8, orgSettings = {}) {
  const { workingDays, presentDays, lopDays, overtimeHours } = attendanceSummary;
  const earnedRatio = workingDays > 0 ? presentDays / workingDays : 0;

  const earnedBreakdown = {};
  const basicMonthly = resolveBasicAmount(structure);

  for (const entry of structure.earnings) {
    let earned = 0;
    if (entry.isProratable !== false) {
      if (entry.type === 'fixed') {
        earned = entry.amount * earnedRatio;
      } else if (entry.type === 'percentage_of_basic') {
        earned = (basicMonthly * entry.amount / 100) * earnedRatio;
      } else {
        earned = entry.amount;
      }
    } else {
      earned = entry.amount;
    }
    earnedBreakdown[entry.name] = Math.round(earned * 100) / 100;
  }

  // Inject Unused CL Encashment as non-attendance earning line-item
  if (clEncashmentAmount > 0) {
    earnedBreakdown['Unused CL Encashment'] = Math.round(clEncashmentAmount * 100) / 100;
  }

  // Overtime rate: Use configured overtimeRate from structure if available, otherwise compute from basic & working hours
  const effectiveWorkingHours = shiftWorkingHours > 0 ? shiftWorkingHours : 8;
  const hourlyRate = structure.overtimeRate > 0 
    ? structure.overtimeRate 
    : ((basicMonthly > 0 && workingDays > 0) ? (basicMonthly / (workingDays * effectiveWorkingHours)) : 0);

  const overtimePay = Math.round((overtimeHours * hourlyRate) * 100) / 100;
  const grossSalary = Math.round(
    (Object.values(earnedBreakdown).reduce((s, v) => s + v, 0) + overtimePay) * 100
  ) / 100;

  const basicEarned = earnedBreakdown['Basic'] || 0;
  const deductionBreakdown = {};

  for (const entry of structure.deductions) {
    let deducted = 0;
    if (entry.type === 'fixed') {
      deducted = entry.amount;
    } else if (entry.type === 'percentage_of_basic') {
      const base = entry.ceiling ? Math.min(basicEarned, entry.ceiling) : basicEarned;
      deducted = base * (entry.amount / 100);
    } else if (entry.type === 'percentage_of_gross') {
      const base = entry.ceiling ? Math.min(grossSalary, entry.ceiling) : grossSalary;
      deducted = base * (entry.amount / 100);
    } else if (entry.type === 'statutory') {
      deducted = resolveStatutory(entry.name, grossSalary, basicEarned, structure, orgSettings);
    }
    deductionBreakdown[entry.name] = Math.round(deducted * 100) / 100;
  }

  if (attendanceSummary.fineDeductions > 0) {
    deductionBreakdown['Attendance Fine'] = attendanceSummary.fineDeductions;
  }

  const totalDeductions = Object.values(deductionBreakdown).reduce((s, v) => s + v, 0);
  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

  const { pfEmployerContribution, esiEmployerContribution } = computeEmployerContributions(
    grossSalary, basicEarned, structure, orgSettings
  );

  return {
    earnedBreakdown, deductionBreakdown, grossSalary, netSalary,
    lopDays, overtimePay, fineDeductions: attendanceSummary.fineDeductions || 0,
    pfEmployerContribution, esiEmployerContribution
  };
}

// ─── computePayrollPayload (computes but does NOT save to DB) ─────────────────

export async function computePayrollPayload(employeeId, month, year, processedBy, runId) {
  const payrollDate = lastDayOfMonth(month, year);
  const structure = await resolveStructure(employeeId, payrollDate);
  const summary = await computeAttendanceSummary(employeeId, month, year);
  const orgSettings = await getOrgPayrollSettings();

  const ShiftAssignment = getTenantModel('ShiftAssignment');
  const shiftAssignment = await ShiftAssignment.findOne({ employeeId, isActive: true }).populate('shiftId').lean();
  const shiftWorkingHours = shiftAssignment?.shiftId?.workingHours || 8;

  const computed = computeSalary(summary, structure, 0, shiftWorkingHours, orgSettings);

  // Resolve departmentId from Employee — stamped once at compute time
  // so department-level payroll reports never require a join
  const Employee = getTenantModel('Employee');
  const emp = await Employee.findById(employeeId).select('professionalInfo.department').lean();
  const departmentId = emp?.professionalInfo?.department || null;

  return {
    employeeId,
    month: Number(month),
    year: Number(year),
    departmentId,
    salaryStructureId: structure._id,
    payrollRunId: runId || null,
    workingDays: summary.workingDays,
    presentDays: summary.presentDays,
    leaveDays: summary.leaveDays,
    lopDays: computed.lopDays,
    overtimeHours: summary.overtimeHours,
    overtimePay: computed.overtimePay,
    earnedBreakdown: computed.earnedBreakdown,
    deductionBreakdown: computed.deductionBreakdown,
    pfEmployerContribution: computed.pfEmployerContribution,
    esiEmployerContribution: computed.esiEmployerContribution,
    grossSalary: computed.grossSalary,
    netSalary: computed.netSalary,
    status: 'Processed',
    processedBy: processedBy || null,
    processedAt: new Date()
  };
}

// ─── runPayrollForEmployee ────────────────────────────────────────────────────

export async function runPayrollForEmployee(employeeId, month, year, processedBy, runId) {
  const Payroll = getTenantModel('Payroll');

  // Block re-run on frozen records
  const existing = await Payroll.findOne({ employeeId, month, year }).lean();
  if (existing && ['Approved', 'Paid'].includes(existing.status)) {
    throw new Error(`Payroll for employee ${employeeId} ${month}/${year} is already ${existing.status} — cannot recompute.`);
  }

  const payload = await computePayrollPayload(employeeId, month, year, processedBy, runId);

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { payrollId: payroll._id, grossSalary: payload.grossSalary, netSalary: payload.netSalary };
}


// ─── runBulkPayroll ───────────────────────────────────────────────────────────

export async function runBulkPayroll(employeeIds, month, year, initiatedBy, runId) {
  const computationService = (await import('./computationService.js')).default;

  for (const employeeId of employeeIds) {
    await computationService.computeQueue.add('payroll-compute', {
      employeeId: employeeId.toString(),
      month,
      year,
      runId: runId.toString(),
      processedBy: initiatedBy ? initiatedBy.toString() : null
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 10,
      removeOnFail: 5
    });
  }
}

// ─── finalizeRun (atomic) ─────────────────────────────────────────────────────

export async function finalizeRun(runId, grossContribution, netContribution, payrollId) {
  const PayrollRun = getTenantModel('PayrollRun');

  const update = {
    $inc: { processedCount: 1, totalGross: grossContribution, totalNet: netContribution },
    $push: { payrollIds: payrollId }
  };

  const run = await PayrollRun.findByIdAndUpdate(runId, update, { new: true });
  if (!run) return;

  if (run.processedCount + run.failedCount >= run.totalEmployees) {
    await PayrollRun.findByIdAndUpdate(runId, {
      $set: { status: 'Computed' },
      $push: { payrollAuditEvents: { event: 'computed', timestamp: new Date() } }
    });
  }
}

// ─── finalizeRunOnFailure (atomic) ────────────────────────────────────────────

export async function finalizeRunOnFailure(runId) {
  const PayrollRun = getTenantModel('PayrollRun');

  const run = await PayrollRun.findByIdAndUpdate(
    runId,
    { $inc: { failedCount: 1 } },
    { new: true }
  );
  if (!run) return;

  if (run.processedCount + run.failedCount >= run.totalEmployees) {
    await PayrollRun.findByIdAndUpdate(runId, {
      $set: { status: 'Computed' },
      $push: { payrollAuditEvents: { event: 'computed_with_failures', timestamp: new Date() } }
    });
  }
}
