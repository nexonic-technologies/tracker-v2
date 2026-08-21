// services/dashboardService.js
// Dashboard stats aggregation — all business logic, no route handling.
// RULE: Zero hardcoded role names or designation strings.
// Layout variant is determined purely by roles.level (1-10).

import models from '../../models/Collection.js';
import mongoose from 'mongoose';


// ─── Dynamic Layout Variant Resolution (Declarative & Policy-Driven) ─────────

export async function resolveLayoutVariant(secCtx, userId) {
  if (secCtx.hasFullRead('attendances') || secCtx.hasFullRead('employees')) {
    return 'admin';
  }
  try {
    const hasDirectReports = await models.employees.exists({
      'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
      status: 'Active'
    });
    if (hasDirectReports) return 'manager';
  } catch (_) {}
  return 'employee';
}

// ─── Security helpers removed ─────────────────────────────────────────────────
// canRead() and hasFullRead() are now methods on the secCtx object built in
// dashboardRoutes.js via policyEngine.resolvePolicy() — the Populate Pipeline's
// Single Source of Truth for permissions. Do not re-add standalone helpers here.

function formatDuration(checkInDate) {
  if (!checkInDate) return null;
  const ms = Date.now() - new Date(checkInDate).getTime();
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

// ─── Employee Stats (Level 1-3) ───────────────────────────────────────────────

async function computeEmployeeStats(userId, secCtx, today, todayEnd) {
  const result = { attendance: null, tasks: [], leaveBalance: [] };

  // Own attendance
  if (secCtx.canRead('attendances')) {
    try {
      const att = await models.attendances.findOne({
        employee: new mongoose.Types.ObjectId(userId),
        date: { $gte: today, $lte: todayEnd }
      }).lean();
      if (att) {
        result.attendance = {
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          duration: att.checkIn && !att.checkOut ? formatDuration(att.checkIn) : null,
          workHours: att.workHours || null,
          punches: att.punches || []
        };
      }
    } catch (e) { /* policy-gated, silently omit */ }
  }

  // Own tasks (top 5: overdue first → high priority → nearest deadline)
  if (secCtx.canRead('tasks')) {
    try {
      result.tasks = await models.tasks.find({
        assignedTo: new mongoose.Types.ObjectId(userId),
        status: { $nin: ['Completed', 'Done'] },
        metaStatus: 'active'
      })
        .sort({ endDate: 1, priorityLevel: -1 })
        .limit(5)
        .select('title endDate priorityLevel status')
        .lean();
    } catch (e) { /* silently omit */ }
  }

  // Own leave balance from employee document
  if (secCtx.canRead('employees')) {
    try {
      const emp = await models.employees.findById(userId)
        .select('leaveStatus')
        .populate('leaveStatus.leaveType', 'name')
        .lean();
      if (emp?.leaveStatus) {
        result.leaveBalance = emp.leaveStatus.map(ls => ({
          leaveType: ls.leaveType?.name || 'Unknown',
          leaveTypeId: ls.leaveType?._id,
          available: ls.available || 0,
          usedThisYear: ls.usedThisYear || 0,
          carriedForward: ls.carriedForward || 0
        }));
      }
    } catch (e) { /* silently omit */ }
  }

  return result;
}

// ─── Workforce Pulse ──────────────────────────────────────────────────────────

async function computePulse(secCtx, userId, today, todayEnd) {
  if (!secCtx.canRead('attendances') || !secCtx.canRead('employees')) return null;

  try {
    // Determine scope: team (if restricted) or org
    let employeeFilter = { status: 'Active' };
    if (!secCtx.hasFullRead('attendances')) {
      // Team scope: direct reports of this user
      employeeFilter['professionalInfo.reportingManager'] = new mongoose.Types.ObjectId(userId);
    }

    const activeEmployees = await models.employees.find(employeeFilter)
      .select('_id')
      .lean();

    const employeeIds = activeEmployees.map(e => e._id);
    const total = employeeIds.length;

    if (total === 0) return { total: 0, present: 0, leave: 0, wfh: 0, late: 0, unchecked: 0, lop: 0, attendanceRate: 0 };

    const todayAttendance = await models.attendances.find({
      employee: { $in: employeeIds },
      date: { $gte: today, $lte: todayEnd }
    }).select('employee status').lean();

    const statusCounts = { Present: 0, Leave: 0, 'Work From Home': 0, 'Late Entry': 0, Unchecked: 0, LOP: 0, Absent: 0 };
    const checkedEmployees = new Set();

    todayAttendance.forEach(att => {
      checkedEmployees.add(att.employee.toString());
      if (att.status === 'Present' || att.status === 'Check-Out' || att.status === 'Early check-out') {
        statusCounts.Present++;
      } else if (att.status in statusCounts) {
        statusCounts[att.status]++;
      }
    });

    // Employees with no attendance record today = unchecked
    const uncheckedCount = total - checkedEmployees.size;
    statusCounts.Unchecked += uncheckedCount;

    const effectivePresent = statusCounts.Present + statusCounts['Work From Home'] + statusCounts['Late Entry'];
    const attendanceRate = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

    return {
      total,
      present: statusCounts.Present,
      leave: statusCounts.Leave,
      wfh: statusCounts['Work From Home'],
      late: statusCounts['Late Entry'],
      unchecked: statusCounts.Unchecked,
      lop: statusCounts.LOP,
      absent: statusCounts.Absent,
      attendanceRate
    };
  } catch (e) {
    return null;
  }
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

async function computeStatCards(secCtx, userId, today, todayEnd) {
  const stats = {};

  // --- Pending Approvals (Manager scope: managerId=self, Admin scope: all) ---
  if (secCtx.canRead('leaves') || secCtx.canRead('regularizations')) {
    let approvalCount = 0;
    const managerFilter = (!secCtx.hasFullRead('leaves')) ? { managerId: new mongoose.Types.ObjectId(userId) } : {};

    if (secCtx.canRead('leaves')) {
      try {
        approvalCount += await models.leaves.countDocuments({ ...managerFilter, status: 'Pending', metaStatus: 'active' });
      } catch (e) { /* skip */ }
    }
    if (secCtx.canRead('regularizations')) {
      try {
        approvalCount += await models.regularizations.countDocuments({ ...managerFilter, status: 'Pending', metaStatus: 'active' });
      } catch (e) { /* skip */ }
    }
    if (secCtx.canRead('wfh_requests')) {
      try {
        approvalCount += await models.wfh_requests.countDocuments({ ...managerFilter, status: 'Pending' });
      } catch (e) { /* skip */ }
    }
    if (secCtx.canRead('comp_off_requests')) {
      try {
        approvalCount += await models.comp_off_requests.countDocuments({ ...managerFilter, status: 'Pending' });
      } catch (e) { /* skip */ }
    }

    stats.pendingApprovals = { value: approvalCount };
  }

  // --- Overdue Tasks (Manager: team scope, Admin/Executive: org scope) ---
  if (secCtx.canRead('tasks')) {
    try {
      let taskFilter = {
        endDate: { $lt: today },
        status: { $nin: ['Completed', 'Done'] },
        metaStatus: 'active'
      };

      if (!secCtx.hasFullRead('tasks')) {
        // Manager: tasks assigned to team members
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id').lean();
        taskFilter.assignedTo = { $in: teamMembers.map(m => m._id) };
      }

      const overdueTasks = await models.tasks.find(taskFilter)
        .select('assignedTo')
        .populate('assignedTo', 'professionalInfo.department')
        .lean();

      // Department breakdown
      const deptBreakdown = {};
      for (const task of overdueTasks) {
        for (const assignee of (task.assignedTo || [])) {
          const deptId = assignee?.professionalInfo?.department?.toString() || 'unassigned';
          deptBreakdown[deptId] = (deptBreakdown[deptId] || 0) + 1;
        }
      }

      stats.overdueTasks = { value: overdueTasks.length, breakdown: deptBreakdown };
    } catch (e) {
      stats.overdueTasks = { value: 0, breakdown: {} };
    }
  }

  // --- Open Tickets (Manager scope: team, Admin scope: org) ---
  if (secCtx.canRead('tickets')) {
    try {
      if (!secCtx.hasFullRead('tickets')) {
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id').lean();

        const count = await models.tickets.countDocuments({
          assignedTo: { $in: teamMembers.map(m => m._id) },
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        });
        stats.openTickets = { value: count };
      } else {
        const count = await models.tickets.countDocuments({
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        });
        stats.openTickets = { value: count };
      }
    } catch (e) {
      stats.openTickets = { value: 0 };
    }
  }

  // --- Attendance Issues (Admin/HR only) ---
  if (secCtx.canRead('attendances') && secCtx.hasFullRead('attendances')) {
    try {
      const issues = await models.attendances.aggregate([
        { $match: { date: { $gte: today, $lte: todayEnd }, status: { $in: ['Late Entry', 'LOP', 'Unchecked'] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const issueMap = {};
      let totalIssues = 0;
      issues.forEach(i => { issueMap[i._id] = i.count; totalIssues += i.count; });
      stats.attendanceIssues = { value: totalIssues, breakdown: issueMap };
    } catch (e) {
      stats.attendanceIssues = { value: 0, breakdown: {} };
    }
  }

  // --- Payroll Status, Cost & Financial Exposure ---
  if (secCtx.canRead('payroll_runs')) {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const run = await models.payroll_runs.findOne({ month: currentMonth, year: currentYear })
        .sort({ createdAt: -1 })
        .select('status totalNet totalEmployees')
        .lean();

      stats.payrollStatus = {
        value: run?.status || 'Not Started',
        month: currentMonth,
        year: currentYear
      };

      stats.payrollCost = {
        value: run?.totalNet || 0,
        status: run?.status || 'Not Started',
        month: currentMonth,
        year: currentYear
      };

      if (secCtx.canRead('payrolls')) {
        const lopCount = await models.payrolls.countDocuments({ month: currentMonth, year: currentYear, lopDays: { $gt: 0 } });
        stats.financialExposure = {
          value: run?.totalNet || 0,
          lopImpact: lopCount,
          month: currentMonth,
          year: currentYear
        };
      }
    } catch (e) { /* skip */ }
  }

  // --- Critical Tickets ---
  if (secCtx.canRead('tickets')) {
    try {
      const ticketFilter = {
        priority: 'Critical',
        status: { $nin: ['Resolved', 'Closed'] },
        metaStatus: 'active'
      };
      if (!secCtx.hasFullRead('tickets')) {
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id').lean();
        ticketFilter.assignedTo = { $in: teamMembers.map(m => m._id) };
      }

      const criticalTickets = await models.tickets.find(ticketFilter).select('assignedTo').lean();
      const unassigned = criticalTickets.filter(t => !t.assignedTo || t.assignedTo.length === 0).length;
      stats.criticalTickets = { value: criticalTickets.length, unassigned };
    } catch (e) {
      stats.criticalTickets = { value: 0, unassigned: 0 };
    }
  }

  // --- Workforce Health ---
  if (secCtx.canRead('attendances')) {
    // Computed from pulse — will be merged in the route handler
    stats.workforceHealth = { value: null }; // placeholder, filled from pulse
  }

  // --- Asset Management Stats ---
  if (secCtx.canRead('assets')) {
    try {
      stats.assetTotalCount = { value: await models.assets.countDocuments({ metaStatus: 'active' }) };
      stats.assetAvailableCount = { value: await models.assets.countDocuments({ status: 'Available', metaStatus: 'active' }) };
      stats.assetAllocatedCount = { value: await models.assets.countDocuments({ status: 'Allocated', metaStatus: 'active' }) };

      if (secCtx.canRead('assets_allocations')) {
        const managerFilter = (!secCtx.hasFullRead('assets')) ? { managerId: new mongoose.Types.ObjectId(userId) } : {};
        stats.assetPendingApproval = {
          value: await models.assets_allocations.countDocuments({
            ...managerFilter,
            status: 'Pending Approval',
            metaStatus: 'active'
          })
        };
        stats.assetPendingReturn = {
          value: await models.assets_allocations.countDocuments({
            ...managerFilter,
            status: 'Active',
            expectedReturn: { $lt: today },
            metaStatus: 'active'
          })
        };

        const activeAllocations = await models.assets_allocations.find({
          ...managerFilter,
          status: 'Active',
          metaStatus: 'active'
        }).populate('employeeId', 'status').lean();

        stats.assetClearancePending = {
          value: activeAllocations.filter(alloc =>
            alloc.employeeId && (alloc.employeeId.status === 'Inactive' || alloc.employeeId.status === 'Terminated')
          ).length
        };
      } else {
        stats.assetPendingApproval = { value: 0 };
        stats.assetPendingReturn = { value: 0 };
        stats.assetClearancePending = { value: 0 };
      }
    } catch (e) {
      console.error("[DashboardService] Asset stats calculation error:", e.message);
    }
  }

  return stats;
}

// ─── Celebrations ────────────────────────────────────────────────────────────

/**
 * Compute upcoming celebrations (birthdays & work anniversaries) for next 7 days.
 * Returns array of { name, type, daysUntil, years, profileImage }.
 * Policy-gated: requires canRead('employees').
 */
async function computeCelebrations(secCtx, today) {
  if (!secCtx.canRead('employees')) return [];

  try {
    const todayMonth = today.getUTCMonth() + 1;
    const todayDay = today.getUTCDate();
    const todayYear = today.getUTCFullYear();

    // Build a window of the next 7 days (month/day pairs)
    const window = [];
    for (let i = 0; i <= 7; i++) {
      const d = new Date(Date.UTC(todayYear, today.getUTCMonth(), todayDay + i));
      window.push({ month: d.getUTCMonth() + 1, day: d.getUTCDate(), offset: i });
    }

    const employees = await models.employees
      .find({ status: 'Active' })
      .select('name personalInfo.dateOfBirth professionalInfo.dateOfJoining personalInfo.profileImage')
      .lean();

    const celebrations = [];

    for (const emp of employees) {
      const empName = emp.name || 'Unknown';
      const profileImage = emp.personalInfo?.profileImage || null;

      // Birthday
      const dob = emp.personalInfo?.dateOfBirth;
      if (dob) {
        const dobDate = new Date(dob);
        const dobMonth = dobDate.getUTCMonth() + 1;
        const dobDay = dobDate.getUTCDate();
        const match = window.find(w => w.month === dobMonth && w.day === dobDay);
        if (match) {
          celebrations.push({
            name: empName,
            type: 'birthday',
            daysUntil: match.offset,
            years: 0,
            profileImage,
          });
        }
      }

      // Work anniversary
      const doi = emp.professionalInfo?.dateOfJoining;
      if (doi) {
        const doiDate = new Date(doi);
        const doiMonth = doiDate.getUTCMonth() + 1;
        const doiDay = doiDate.getUTCDate();
        const match = window.find(w => w.month === doiMonth && w.day === doiDay);
        if (match) {
          const yearsCompleted = todayYear - doiDate.getUTCFullYear() + (match.offset > 0 ? 1 : 0);
          if (yearsCompleted > 0) {
            celebrations.push({
              name: empName,
              type: 'work_anniversary',
              daysUntil: match.offset,
              years: yearsCompleted,
              profileImage,
            });
          }
        }
      }
    }

    // Sort: today first, then by days ascending
    celebrations.sort((a, b) => a.daysUntil - b.daysUntil);
    return celebrations;
  } catch (e) {
    return [];
  }
}

// ─── Action Center ────────────────────────────────────────────────────────────

const URGENCY_BASE = {
  emergency_leave: 90,
  critical_ticket_unassigned: 85,
  critical_ticket_assigned: 80,
  overdue_task_gt2: 75,
  payroll_pending: 70,
  overdue_task_1: 65,
  leave_request: 50,
  regularization: 45,
  wfh_request: 40,
  compoff_request: 35,
};

function computeUrgencyScore(baseType, createdAt, affectsCount = 1, affectsPayroll = false, affectsClient = false) {
  let score = URGENCY_BASE[baseType] || 30;

  // Time modifier
  const hoursWaiting = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hoursWaiting > 48) score += 15;
  else if (hoursWaiting > 24) score += 10;
  else if (hoursWaiting > 8) score += 5;

  // Impact modifier
  if (affectsCount > 5) score += 10;
  if (affectsPayroll) score += 8;
  if (affectsClient) score += 5;

  return score;
}

async function computeActionCenter(secCtx, userId, today, todayEnd) {
  const { level } = secCtx;
  const items = [];
  const managerFilter = (!secCtx.hasFullRead('leaves')) ? { managerId: new mongoose.Types.ObjectId(userId) } : {};

  // Pending leaves, regularizations, WFH, comp-off
  if (secCtx.canRead('leaves') || secCtx.canRead('regularizations')) {
    // Pending Leaves
    if (secCtx.canRead('leaves')) {
      try {
        const pendingLeaves = await models.leaves.find({ ...managerFilter, status: 'Pending', metaStatus: 'active' })
          .sort({ createdAt: -1 })
          .limit(managerFilter.managerId ? 20 : 50)
          .select('employeeName employeeId departmentId startDate endDate totalDays leaveName isEmergency createdAt')
          .populate('departmentId', 'name')
          .lean();

        pendingLeaves.forEach(l => {
          const baseType = l.isEmergency ? 'emergency_leave' : 'leave_request';
          items.push({
            id: l._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, l.createdAt),
            title: l.isEmergency ? 'Emergency Leave' : 'Leave Request',
            subtitle: `${l.employeeName || 'Employee'} · ${l.leaveName || 'Leave'} · ${l.totalDays}d`,
            department: l.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'leaves',
            sourceId: l._id,
            createdAt: l.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending Regularizations
    if (secCtx.canRead('regularizations')) {
      try {
        const pending = await models.regularizations.find({ ...managerFilter, status: 'Pending', metaStatus: 'active' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeName employeeId departmentId requestDate createdAt')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(r => {
          items.push({
            id: r._id,
            type: 'regularization',
            urgencyScore: computeUrgencyScore('regularization', r.createdAt),
            title: 'Regularization Request',
            subtitle: `${r.employeeName || 'Employee'} · ${new Date(r.requestDate).toLocaleDateString()}`,
            department: r.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'regularizations',
            sourceId: r._id,
            createdAt: r.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending WFH
    if (secCtx.canRead('wfh_requests')) {
      try {
        const pending = await models.wfh_requests.find({ ...managerFilter, status: 'Pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeId departmentId startDate endDate createdAt')
          .populate('employeeId', 'basicInfo.firstName basicInfo.lastName')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(w => {
          const empName = w.employeeId ? `${w.employeeId.basicInfo?.firstName || ''} ${w.employeeId.basicInfo?.lastName || ''}`.trim() : 'Employee';
          items.push({
            id: w._id,
            type: 'wfh_request',
            urgencyScore: computeUrgencyScore('wfh_request', w.createdAt),
            title: 'WFH Request',
            subtitle: `${empName} · ${new Date(w.startDate).toLocaleDateString()}`,
            department: w.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'wfh_requests',
            sourceId: w._id,
            createdAt: w.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }

    // Pending Comp-Off
    if (secCtx.canRead('comp_off_requests')) {
      try {
        const pending = await models.comp_off_requests.find({ ...managerFilter, status: 'Pending' })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('employeeId departmentId workedDate hoursWorked createdAt')
          .populate('employeeId', 'basicInfo.firstName basicInfo.lastName')
          .populate('departmentId', 'name')
          .lean();

        pending.forEach(c => {
          const empName = c.employeeId ? `${c.employeeId.basicInfo?.firstName || ''} ${c.employeeId.basicInfo?.lastName || ''}`.trim() : 'Employee';
          items.push({
            id: c._id,
            type: 'compoff_request',
            urgencyScore: computeUrgencyScore('compoff_request', c.createdAt),
            title: 'Comp-Off Request',
            subtitle: `${empName} · ${c.hoursWorked}h worked`,
            department: c.departmentId?.name || null,
            actions: ['approve', 'deny'],
            sourceModel: 'comp_off_requests',
            sourceId: c._id,
            createdAt: c.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // Manager: Overdue tasks (team), Critical tickets (team)
  if (secCtx.canRead('tasks') && !secCtx.hasFullRead('tasks')) {
    if (secCtx.canRead('tasks')) {
      try {
        const teamMembers = await models.employees.find({
          'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
          status: 'Active'
        }).select('_id basicInfo.firstName basicInfo.lastName').lean();

        const overdue = await models.tasks.find({
          assignedTo: { $in: teamMembers.map(m => m._id) },
          endDate: { $lt: today },
          status: { $nin: ['Completed', 'Done'] },
          metaStatus: 'active'
        }).limit(5).select('title endDate assignedTo createdAt').lean();

        overdue.forEach(t => {
          const daysOverdue = Math.ceil((Date.now() - new Date(t.endDate).getTime()) / 86400000);
          const baseType = daysOverdue > 2 ? 'overdue_task_gt2' : 'overdue_task_1';
          items.push({
            id: t._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, t.createdAt),
            title: `Overdue: ${t.title}`,
            subtitle: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late`,
            actions: ['view', 'reassign'],
            sourceModel: 'tasks',
            sourceId: t._id,
            createdAt: t.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // Executive: Critical tickets (unassigned), overdue tasks (>2 days, all)
  if (secCtx.canRead('tickets') && secCtx.hasFullRead('tickets')) {
    if (secCtx.canRead('tickets')) {
      try {
        const critical = await models.tickets.find({
          priority: 'Critical',
          status: { $nin: ['Resolved', 'Closed'] },
          metaStatus: 'active'
        }).limit(5)
          .select('ticketId title assignedTo clientId startDate createdAt')
          .populate('clientId', 'name')
          .lean();

        critical.forEach(t => {
          const isUnassigned = !t.assignedTo || t.assignedTo.length === 0;
          const baseType = isUnassigned ? 'critical_ticket_unassigned' : 'critical_ticket_assigned';
          const hoursOld = Math.round((Date.now() - new Date(t.startDate || t.createdAt).getTime()) / 3600000);
          items.push({
            id: t._id,
            type: baseType,
            urgencyScore: computeUrgencyScore(baseType, t.createdAt, 1, false, true),
            title: `${t.ticketId} — ${t.title}`,
            subtitle: `${t.clientId?.name || 'Unknown client'} · ${hoursOld}h old${isUnassigned ? ' · Unassigned' : ''}`,
            actions: isUnassigned ? ['assign'] : ['view', 'escalate'],
            sourceModel: 'tickets',
            sourceId: t._id,
            createdAt: t.createdAt
          });
        });
      } catch (e) { /* skip */ }
    }
  }

  // MD: Aggregated items, max 3
  if (secCtx.canRead('tickets')) {
    // Critical tickets aggregated
    if (secCtx.canRead('tickets')) {
      try {
        const critCount = await models.tickets.countDocuments({
          priority: 'Critical',
          status: { $nin: ['Resolved', 'Closed'] },
          $or: [{ assignedTo: { $size: 0 } }, { assignedTo: { $exists: false } }],
          metaStatus: 'active'
        });
        if (critCount > 0) {
          items.push({
            id: 'agg_critical_tickets',
            type: 'critical_ticket_unassigned',
            urgencyScore: 90,
            title: `${critCount} critical ticket${critCount > 1 ? 's' : ''} unassigned`,
            subtitle: 'Requires delegation',
            actions: ['delegate_cto'],
            sourceModel: 'tickets',
            sourceId: null,
            createdAt: new Date()
          });
        }
      } catch (e) { /* skip */ }
    }
  }

  // Sort by urgency score descending
  items.sort((a, b) => b.urgencyScore - a.urgencyScore);

  // MD gets max 3 items
  if (secCtx.canRead('tickets') && !secCtx.hasFullRead('tickets')) return items.slice(0, 3);

  return items;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function computeAlerts(stats, pulse, actionCenter) {
  const alerts = [];

  if (stats.overdueTasks?.value > 0) {
    alerts.push({
      type: 'overdue_task',
      severity: 'red',
      text: `${stats.overdueTasks.value} overdue task${stats.overdueTasks.value > 1 ? 's' : ''}`,
      count: stats.overdueTasks.value
    });
  }

  if (stats.criticalTickets?.unassigned > 0) {
    alerts.push({
      type: 'critical_ticket',
      severity: 'red',
      text: `${stats.criticalTickets.unassigned} critical ticket${stats.criticalTickets.unassigned > 1 ? 's' : ''} unassigned`,
      count: stats.criticalTickets.unassigned
    });
  }

  // Emergency leaves in action center
  const emergencyLeaves = actionCenter.filter(i => i.type === 'emergency_leave');
  if (emergencyLeaves.length > 0) {
    alerts.push({
      type: 'emergency_leave',
      severity: 'red',
      text: `${emergencyLeaves.length} emergency leave${emergencyLeaves.length > 1 ? 's' : ''} pending`,
      count: emergencyLeaves.length
    });
  }

  // Attendance rate alert (pulse)
  if (pulse && pulse.attendanceRate < 70) {
    alerts.push({
      type: 'low_attendance',
      severity: 'red',
      text: `Attendance at ${pulse.attendanceRate}% (below target)`,
      count: pulse.unchecked + pulse.absent
    });
  }

  // Payroll closing alert
  if (stats.payrollStatus) {
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    if (daysLeft <= 5 && stats.payrollStatus.value !== 'Approved' && stats.payrollStatus.value !== 'Paid') {
      alerts.push({
        type: 'payroll_closing',
        severity: 'orange',
        text: `Payroll closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        count: daysLeft
      });
    }
  }

  // Unchecked employees (Admin/HR)
  if (pulse && pulse.unchecked > 0) {
    alerts.push({
      type: 'unchecked_employees',
      severity: 'orange',
      text: `${pulse.unchecked} unchecked employee${pulse.unchecked > 1 ? 's' : ''}`,
      count: pulse.unchecked
    });
  }

  return alerts;
}

// ─── Team / Org Attendance Grid ───────────────────────────────────────────────
// Scope is decided by level:
//   level 4-6 (Manager): only direct reports (professionalInfo.reportingManager = userId)
//   level 7+  (Admin/Executive/MD): org-wide, sorted by urgency
// WHETHER this data is rendered is controlled entirely by the DashboardWidget config
// in the database (can('v2_team_attendance_grid') in the frontend). No level gate here.

async function computeTeamGrid(secCtx, userId, today, todayEnd) {
  if (!secCtx.canRead('attendances') || !secCtx.canRead('employees')) return null;

  try {
    const isAdminScope = secCtx.hasFullRead('attendances');

    const employeeQuery = isAdminScope
      ? { status: 'Active', isActive: true }
      : {
        'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
        status: 'Active',
        isActive: true
      };

    const members = await models.employees.find(employeeQuery)
      .select('basicInfo.firstName basicInfo.lastName basicInfo.profileImage')
      .lean();

    if (members.length === 0) return [];

    const attendance = await models.attendances.find({
      employee: { $in: members.map(m => m._id) },
      date: { $gte: today, $lte: todayEnd }
    }).select('employee status checkIn').lean();

    const attMap = {};
    attendance.forEach(a => { attMap[a.employee.toString()] = a; });

    return members.map(m => {
      const att = attMap[m._id.toString()];
      return {
        employeeId: m._id,
        name: `${m.basicInfo?.firstName || ''} ${m.basicInfo?.lastName || ''}`.trim(),
        profileImage: m.basicInfo?.profileImage || null,
        status: att?.status || 'Unchecked',
        checkIn: att?.checkIn || null
      };
    })
      // Sort: unchecked/late/absent first — highest urgency at top
      .sort((a, b) => {
        const priority = { Unchecked: 0, 'Late Entry': 1, LOP: 2, Absent: 3, Leave: 4, 'Work From Home': 5, Present: 6, 'Check-Out': 7 };
        return (priority[a.status] ?? 10) - (priority[b.status] ?? 10);
      })
      .slice(0, 10);
  } catch (e) {
    return null;
  }
}

// ─── Time-Series Trend Aggregations ──────────────────────────────────────────

/**
 * Compute daily ticket trends (created, in-progress, resolved, closed) over date range
 */
async function computeTicketTrends(secCtx, userId, rangeStart, rangeEnd) {
  if (!secCtx.canRead('tickets')) return [];

  try {
    const isFullScope = secCtx.hasFullRead('tickets');
    const filter = {
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      metaStatus: 'active'
    };

    if (!isFullScope) {
      const teamMembers = await models.employees.find({
        'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
        status: 'Active'
      }).select('_id').lean();
      filter.assignedTo = { $in: teamMembers.map(m => m._id) };
    }

    const tickets = await models.tickets.find(filter)
      .select('status createdAt updatedAt')
      .lean();

    // Group by day
    const dayMap = new Map();
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const dateKey = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(dateKey, {
        date: dateKey,
        label,
        created: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        total: 0
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    tickets.forEach(t => {
      if (!t.createdAt) return;
      const key = new Date(t.createdAt).toISOString().split('T')[0];
      if (dayMap.has(key)) {
        const item = dayMap.get(key);
        item.created++;
        item.total++;
        if (t.status === 'In Progress') item.inProgress++;
        else if (t.status === 'Resolved' || t.status === 'Completed') item.resolved++;
        else if (t.status === 'Closed') item.closed++;
      }
    });

    return Array.from(dayMap.values());
  } catch (e) {
    return [];
  }
}

/**
 * Compute daily task velocity trends (created, completed, overdue, in-progress) over date range
 */
async function computeTaskTrends(secCtx, userId, rangeStart, rangeEnd) {
  if (!secCtx.canRead('tasks')) return [];

  try {
    const isFullScope = secCtx.hasFullRead('tasks');
    const filter = {
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      metaStatus: { $ne: 'deleted' }
    };

    if (!isFullScope) {
      const teamMembers = await models.employees.find({
        'professionalInfo.reportingManager': new mongoose.Types.ObjectId(userId),
        status: 'Active'
      }).select('_id').lean();
      filter.assignedTo = { $in: teamMembers.map(m => m._id) };
    }

    const tasks = await models.tasks.find(filter)
      .select('status endDate createdAt')
      .lean();

    const dayMap = new Map();
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const dateKey = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(dateKey, {
        date: dateKey,
        label,
        created: 0,
        completed: 0,
        overdue: 0,
        inProgress: 0,
        total: 0
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    tasks.forEach(t => {
      if (!t.createdAt) return;
      const key = new Date(t.createdAt).toISOString().split('T')[0];
      if (dayMap.has(key)) {
        const item = dayMap.get(key);
        item.created++;
        item.total++;
        if (t.status === 'Completed' || t.status === 'Done') item.completed++;
        else if (t.endDate && new Date(t.endDate) < new Date()) item.overdue++;
        else if (t.status === 'In Progress' || t.status === 'Active') item.inProgress++;
      }
    });

    return Array.from(dayMap.values());
  } catch (e) {
    return [];
  }
}

/**
 * Compute daily attendance rate trends over date range
 */
async function computeAttendanceTrends(secCtx, userId, rangeStart, rangeEnd) {
  if (!secCtx.canRead('attendances') || !secCtx.canRead('employees')) return [];

  try {
    let employeeFilter = { status: 'Active' };
    if (!secCtx.hasFullRead('attendances')) {
      employeeFilter['professionalInfo.reportingManager'] = new mongoose.Types.ObjectId(userId);
    }

    const activeEmployees = await models.employees.find(employeeFilter).select('_id').lean();
    const totalEmployees = activeEmployees.length;
    if (totalEmployees === 0) return [];

    const employeeIds = activeEmployees.map(e => e._id);
    const attendances = await models.attendances.find({
      employee: { $in: employeeIds },
      date: { $gte: rangeStart, $lte: rangeEnd }
    }).select('employee status date').lean();

    const dayMap = new Map();
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const dateKey = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(dateKey, {
        date: dateKey,
        label,
        present: 0,
        wfh: 0,
        late: 0,
        leave: 0,
        attendanceRate: 0,
        total: totalEmployees
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    attendances.forEach(att => {
      if (!att.date) return;
      const key = new Date(att.date).toISOString().split('T')[0];
      if (dayMap.has(key)) {
        const item = dayMap.get(key);
        if (att.status === 'Present' || att.status === 'Check-Out' || att.status === 'Early check-out') item.present++;
        else if (att.status === 'Work From Home') item.wfh++;
        else if (att.status === 'Late Entry') item.late++;
        else if (att.status === 'Leave' || att.status === 'LOP') item.leave++;
      }
    });

    // Compute daily rates
    dayMap.forEach(item => {
      const effective = item.present + item.wfh + item.late;
      item.attendanceRate = item.total > 0 ? Math.round((effective / item.total) * 100) : 0;
    });

    return Array.from(dayMap.values());
  } catch (e) {
    return [];
  }
}

// ─── Main Aggregation Function ────────────────────────────────────────────────

export async function getDashboardStats(userId, secCtx, options = {}) {
  const variant = await resolveLayoutVariant(secCtx, userId);

  // Resolve company timezone dynamically from General Settings
  let tz = 'Asia/Kolkata';
  try {
    const settings = await models.general_settings.findOne().lean();
    if (settings?.localization?.timezone) {
      tz = settings.localization.timezone;
    }
  } catch (e) { }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day').value, 10);

  const today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const todayEndVal = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  // Determine query range (custom or default 7-day window)
  let rangeStart = new Date(Date.UTC(year, month, day - 6, 0, 0, 0, 0)); // 7 days by default
  let rangeEnd = todayEndVal;

  if (options.startDate) {
    rangeStart = new Date(options.startDate);
  }
  if (options.endDate) {
    rangeEnd = new Date(options.endDate);
  } else if (options.range === '30d') {
    rangeStart = new Date(Date.UTC(year, month, day - 29, 0, 0, 0, 0));
  } else if (options.range === 'today') {
    rangeStart = today;
  }

  const result = {
    layoutVariant: variant,
    pulse: null,
    stats: {},
    alerts: [],
    actionCenter: [],
    celebrations: [],
    employee: null,
    teamGrid: null,
    trends: {
      tickets: [],
      tasks: [],
      attendance: []
    }
  };

  // Run computations in parallel
  const [
    empStats,
    pulseData,
    statCards,
    actionItems,
    teamGridData,
    celebrationsData,
    ticketTrendsData,
    taskTrendsData,
    attendanceTrendsData
  ] = await Promise.all([
    computeEmployeeStats(userId, secCtx, today, todayEndVal),
    computePulse(secCtx, userId, today, todayEndVal),
    computeStatCards(secCtx, userId, today, todayEndVal),
    computeActionCenter(secCtx, userId, today, todayEndVal),
    computeTeamGrid(secCtx, userId, today, todayEndVal),
    computeCelebrations(secCtx, today),
    computeTicketTrends(secCtx, userId, rangeStart, rangeEnd),
    computeTaskTrends(secCtx, userId, rangeStart, rangeEnd),
    computeAttendanceTrends(secCtx, userId, rangeStart, rangeEnd),
  ]);

  result.employee = empStats;
  result.pulse = pulseData;
  result.stats = statCards || {};
  result.actionCenter = actionItems || [];
  result.teamGrid = teamGridData || [];
  result.celebrations = celebrationsData || [];

  result.trends = {
    tickets: ticketTrendsData || [],
    tasks: taskTrendsData || [],
    attendance: attendanceTrendsData || []
  };

  // Embed trends into stats as well for uniform access
  result.stats.ticketTrends = ticketTrendsData || [];
  result.stats.taskTrends = taskTrendsData || [];
  result.stats.attendanceTrends = attendanceTrendsData || [];

  // Post-processing: fill workforce health from pulse
  if (secCtx.canRead('attendances') && result.pulse) {
    result.stats.workforceHealth = {
      value: result.pulse.attendanceRate,
      label: result.pulse.attendanceRate >= 85 ? 'Healthy' : result.pulse.attendanceRate >= 70 ? 'Caution' : 'Critical',
      color: result.pulse.attendanceRate >= 85 ? 'green' : result.pulse.attendanceRate >= 70 ? 'yellow' : 'red',
      late: result.pulse.late,
      lop: result.pulse.lop
    };
  }

  // Alerts (derived from stats + pulse + action center)
  result.alerts = computeAlerts(result.stats, result.pulse, result.actionCenter);

  return result;
}

export default { getDashboardStats, resolveLayoutVariant };

