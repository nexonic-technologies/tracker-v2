// src/services/business/leaveBalanceService.js
// Dynamic, transaction-driven leave balance calculation and synchronization.
// Strictly enforces 'use-it-or-lose-it' vs carry-forward policies.

import { resolveEmployeeLeavePolicy } from "./leavePolicyResolver.js";

/**
 * Computes live, transaction-verified leave balance for an employee for a specific leave type.
 *
 * @param {string} employeeId
 * @param {string} leaveTypeId
 * @param {Object} models
 * @param {Date} [evalDate=new Date()]
 * @returns {Promise<Object>} { quota, maxDaysPerMonth, maxDaysPerYear, carryForward, usedThisYear, usedThisMonth, carriedForward, available, monthlyAvailable, isMonthlyPolicy }
 */
export async function getEmployeeLeaveBalance(employeeId, leaveTypeId, models, evalDate = new Date()) {
  if (!employeeId || !leaveTypeId || !models) {
    return {
      quota: 0,
      maxDaysPerMonth: 0,
      maxDaysPerYear: 0,
      carryForward: false,
      usedThisYear: 0,
      usedThisMonth: 0,
      carriedForward: 0,
      available: 0,
      monthlyAvailable: 0,
      isMonthlyPolicy: false,
    };
  }

  const employee = await models.employees.findById(employeeId).lean();
  if (!employee) {
    return {
      quota: 0,
      maxDaysPerMonth: 0,
      maxDaysPerYear: 0,
      carryForward: false,
      usedThisYear: 0,
      usedThisMonth: 0,
      carriedForward: 0,
      available: 0,
      monthlyAvailable: 0,
      isMonthlyPolicy: false,
    };
  }

  const activePolicy = await resolveEmployeeLeavePolicy(employee.professionalInfo, models, evalDate);

  let maxDaysPerYear = null;
  let maxDaysPerMonth = 0;
  let carryForward = false;
  let hasPolicyMatch = false;

  if (activePolicy && Array.isArray(activePolicy.leaves)) {
    const policyLeaf = activePolicy.leaves.find(
      (l) => (l.leaveType?._id || l.leaveType)?.toString() === leaveTypeId.toString()
    );
    if (policyLeaf) {
      hasPolicyMatch = true;
      maxDaysPerMonth = Number(policyLeaf.maxDaysPerMonth) || 0;
      carryForward = Boolean(policyLeaf.carryForward);

      if (policyLeaf.maxDaysPerYear !== null && policyLeaf.maxDaysPerYear !== undefined) {
        maxDaysPerYear = Number(policyLeaf.maxDaysPerYear);
      }
    }
  }

  // Fallback 1: Check existing employee leaveStatus bucket if no policy match
  const existingBucket = (employee.leaveStatus || []).find(
    (b) => (b.leaveType?._id || b.leaveType)?.toString() === leaveTypeId.toString()
  );

  if (!hasPolicyMatch && existingBucket && typeof existingBucket.available === "number") {
    maxDaysPerYear = existingBucket.available + (existingBucket.usedThisYear || 0);
  }

  // Fallback 2: Check global leave_types schema
  if (!hasPolicyMatch && maxDaysPerYear === null && maxDaysPerMonth === 0) {
    const leaveTypesModel = models.leave_types || models.leave_types;
    if (leaveTypesModel) {
      const ltDoc = await leaveTypesModel.findById(leaveTypeId).lean();
      if (ltDoc && (ltDoc.quota || ltDoc.maxDaysPerYear)) {
        maxDaysPerYear = Number(ltDoc.quota || ltDoc.maxDaysPerYear);
      }
    }
  }

  // Compute Year and Month boundaries based on evalDate
  const yearStart = new Date(evalDate.getFullYear(), 0, 1);
  const yearEnd = new Date(evalDate.getFullYear(), 11, 31, 23, 59, 59, 999);

  const monthStart = new Date(evalDate.getFullYear(), evalDate.getMonth(), 1);
  const monthEnd = new Date(evalDate.getFullYear(), evalDate.getMonth() + 1, 0, 23, 59, 59, 999);

  // Query approved leaves in the current year
  const approvedLeavesThisYear = await models.leaves.find({
    employeeId,
    leaveTypeId,
    status: 'Approved',
    metaStatus: 'active',
    startDate: { $gte: yearStart, $lte: yearEnd }
  }).lean();

  let usedThisYear = 0;
  let usedThisMonth = 0;

  for (const leave of approvedLeavesThisYear) {
    const days = Number(leave.totalDays) || 0;
    usedThisYear += days;

    const leaveStart = new Date(leave.startDate);
    if (leaveStart >= monthStart && leaveStart <= monthEnd) {
      usedThisMonth += days;
    }
  }

  const carriedForward = carryForward ? (existingBucket?.carriedForward || 0) : 0;

  // ── Exact Balance Determination ──
  let available = 0;
  const isMonthlyPolicy = maxDaysPerMonth > 0 && (maxDaysPerYear === null || maxDaysPerYear === undefined);
  const monthlyAvailable = maxDaysPerMonth > 0 ? Math.max(maxDaysPerMonth - usedThisMonth, 0) : 0;

  if (isMonthlyPolicy) {
    // USE-IT-OR-LOSE-IT Monthly Quota
    // If carryForward is false: available in this month is strictly maxDaysPerMonth - usedThisMonth
    if (!carryForward) {
      available = monthlyAvailable;
    } else {
      // Carry forward allowed: accrued monthly credits up to current month
      const currentMonthIndex = evalDate.getMonth() + 1; // 1 to 12
      const accruedTillNow = (maxDaysPerMonth * currentMonthIndex) + carriedForward;
      available = Math.max(accruedTillNow - usedThisYear, 0);
    }
  } else if (maxDaysPerYear !== null && maxDaysPerYear !== undefined) {
    // Annual Cap Quota
    const totalYearlyQuota = maxDaysPerYear + carriedForward;
    const yearlyAvailable = Math.max(totalYearlyQuota - usedThisYear, 0);

    if (maxDaysPerMonth > 0) {
      // Both annual cap and monthly cap apply
      available = Math.min(monthlyAvailable, yearlyAvailable);
    } else {
      available = yearlyAvailable;
    }
  } else {
    // Default baseline if neither was configured
    available = 12;
  }

  const quota = isMonthlyPolicy ? maxDaysPerMonth : (maxDaysPerYear || maxDaysPerMonth || 12);

  return {
    quota,
    maxDaysPerMonth,
    maxDaysPerYear,
    carryForward,
    usedThisYear,
    usedThisMonth,
    carriedForward,
    available,
    monthlyAvailable,
    isMonthlyPolicy
  };
}

/**
 * Synchronizes the cached employee.leaveStatus snapshot for an individual employee
 * based on their active policy and approved transactions.
 *
 * @param {string|Object} employeeOrId - Employee document or employee ID
 * @param {Object} models - Tenant models collection
 * @param {Date} [evalDate=new Date()]
 * @returns {Promise<Array>} Updated leaveStatus array
 */
export async function syncEmployeeLeaveStatus(employeeOrId, models, evalDate = new Date()) {
  if (!employeeOrId || !models) return [];

  let employee = typeof employeeOrId === 'object' && employeeOrId._id
    ? employeeOrId
    : await models.employees.findById(employeeOrId);

  if (!employee) return [];

  const activePolicy = await resolveEmployeeLeavePolicy(employee.professionalInfo, models, evalDate);
  if (!activePolicy || !Array.isArray(activePolicy.leaves)) return employee.leaveStatus || [];

  const updatedStatus = [];

  for (const policyLeaf of activePolicy.leaves) {
    const leaveTypeId = policyLeaf.leaveType?._id || policyLeaf.leaveType;
    if (!leaveTypeId) continue;

    const balance = await getEmployeeLeaveBalance(employee._id, leaveTypeId, models, evalDate);

    updatedStatus.push({
      leaveType: leaveTypeId,
      usedThisMonth: balance.usedThisMonth,
      usedThisYear: balance.usedThisYear,
      carriedForward: balance.carriedForward,
      available: balance.available
    });
  }

  // Update employee record if changed
  await models.employees.updateOne(
    { _id: employee._id },
    { $set: { leaveStatus: updatedStatus } }
  );

  return updatedStatus;
}

export default {
  getEmployeeLeaveBalance,
  syncEmployeeLeaveStatus
};
